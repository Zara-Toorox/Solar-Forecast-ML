# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Controlled live database repair operations for Solar Forecast ML."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from homeassistant.core import HomeAssistant, ServiceCall

from ..core.core_helpers import SafeDateTimeUtil as dt_util

_LOGGER = logging.getLogger(__name__)

OPERATION_DAILY_CUMULATIVE_ACTUAL = "daily_cumulative_actual"
DEFAULT_DISTRIBUTION = "forecast_shape"
DEFAULT_GROUP_DISTRIBUTION = "historical_clean_share"
DEFAULT_LEARNING_POLICY = "exclude"


@dataclass
class RepairHour:
    """Single hourly repair candidate."""

    prediction_id: str
    hour: int
    prediction_kwh: float
    repaired_kwh: float
    cumulative_kwh: float


class RepairToolService:
    """Developer-only repair tool for controlled SFML database writes."""

    def __init__(self, hass: HomeAssistant, coordinator: "SolarForecastMLCoordinator") -> None:
        """Initialize the repair tool."""
        self.hass = hass
        self.coordinator = coordinator

    @property
    def db_manager(self):
        """Return the active database manager."""
        data_manager = getattr(self.coordinator, "data_manager", None)
        if not data_manager:
            return None
        return getattr(data_manager, "_db_manager", None)

    async def handle_repair_tool(self, call: ServiceCall) -> None:
        """Handle the generic repair_tool Home Assistant service."""
        operation = call.data.get("operation")
        if operation != OPERATION_DAILY_CUMULATIVE_ACTUAL:
            _LOGGER.error("SFML repair_tool: unsupported operation=%s", operation)
            return

        try:
            result = await self._repair_daily_cumulative_actual(call.data)
            self._log_result(result)
        except Exception as err:
            _LOGGER.error("SFML repair_tool failed: %s", err, exc_info=True)

    async def _repair_daily_cumulative_actual(self, data: dict[str, Any]) -> dict[str, Any]:
        """Repair completed hourly actuals from a manufacturer cumulative day value."""
        db = self.db_manager
        if db is None:
            raise RuntimeError("database manager unavailable")

        dry_run = bool(data.get("dry_run", True))
        acknowledged = bool(data.get("acknowledge_live_db_risk", False))
        if not dry_run and not acknowledged:
            raise ValueError(
                "acknowledge_live_db_risk must be true when dry_run is false"
            )

        target_date = self._parse_date(data.get("date"))
        cumulative_kwh = self._parse_positive_float(data.get("cumulative_kwh"), "cumulative_kwh")
        measured_at = self._parse_measured_at(data.get("measured_at"))
        distribution = data.get("distribution", DEFAULT_DISTRIBUTION)
        group_distribution = data.get("group_distribution", DEFAULT_GROUP_DISTRIBUTION)
        learning_policy = data.get("learning_policy", DEFAULT_LEARNING_POLICY)
        start_hour = self._parse_optional_hour(data.get("start_hour"), default=0)
        end_hour = self._parse_optional_hour(
            data.get("end_hour"),
            default=self._last_completed_hour(measured_at, target_date),
        )

        if distribution != DEFAULT_DISTRIBUTION:
            raise ValueError("only distribution='forecast_shape' is supported")
        if group_distribution != DEFAULT_GROUP_DISTRIBUTION:
            raise ValueError("only group_distribution='historical_clean_share' is supported")
        if learning_policy != DEFAULT_LEARNING_POLICY:
            raise ValueError("only learning_policy='exclude' is supported")
        if end_hour < start_hour:
            raise ValueError("end_hour must be greater than or equal to start_hour")

        rows = await db.fetchall(
            """SELECT prediction_id, target_hour, prediction_kwh, actual_kwh,
                      manual_override, has_sensor_data, sensor_data_complete
               FROM hourly_predictions
               WHERE target_date = ?
                 AND target_hour BETWEEN ? AND ?
               ORDER BY target_hour""",
            (target_date, start_hour, end_hour),
        )
        if not rows:
            raise ValueError(f"no hourly predictions found for {target_date} {start_hour}..{end_hour}")

        existing_total = await self._existing_total(target_date, end_hour)
        repair_delta = round(cumulative_kwh - existing_total, 6)
        if repair_delta <= 0.0005:
            return {
                "operation": OPERATION_DAILY_CUMULATIVE_ACTUAL,
                "dry_run": dry_run,
                "target_date": target_date,
                "cumulative_kwh": cumulative_kwh,
                "existing_total_kwh": existing_total,
                "repair_delta_kwh": repair_delta,
                "repaired_hours": [],
                "message": "nothing to repair",
            }

        candidates = self._select_candidate_rows(rows)
        if not candidates:
            raise ValueError(
                "no eligible repair hours found; use start_hour/end_hour to narrow the intended repair window"
            )

        repair_hours = self._allocate_hourly_delta(candidates, repair_delta)
        group_allocations = await self._allocate_groups(target_date, repair_hours)
        cumulative_by_hour = await self._calculate_cumulative_by_hour(
            target_date,
            end_hour,
            {hour.hour: hour.repaired_kwh for hour in repair_hours},
        )
        for hour in repair_hours:
            hour.cumulative_kwh = cumulative_by_hour[hour.hour]

        result = {
            "operation": OPERATION_DAILY_CUMULATIVE_ACTUAL,
            "dry_run": dry_run,
            "target_date": target_date,
            "measured_at": measured_at.isoformat(),
            "cumulative_kwh": cumulative_kwh,
            "existing_total_kwh": existing_total,
            "repair_delta_kwh": repair_delta,
            "start_hour": start_hour,
            "end_hour": end_hour,
            "distribution": distribution,
            "group_distribution": group_distribution,
            "learning_policy": learning_policy,
            "live_cache_updated": False,
            "repaired_hours": [
                {
                    "prediction_id": hour.prediction_id,
                    "hour": hour.hour,
                    "actual_kwh": hour.repaired_kwh,
                    "cumulative_kwh": hour.cumulative_kwh,
                    "groups": group_allocations.get(hour.prediction_id, {}),
                }
                for hour in repair_hours
            ],
        }

        if dry_run:
            return result

        await self._apply_daily_cumulative_repair(
            measured_at=measured_at,
            repair_hours=repair_hours,
            group_allocations=group_allocations,
            audit_payload=result,
        )
        result["written"] = True
        return result

    def _parse_date(self, value: Any) -> str:
        if not value:
            return dt_util.now().date().isoformat()
        parsed = datetime.fromisoformat(str(value))
        return parsed.date().isoformat()

    def _parse_measured_at(self, value: Any) -> datetime:
        if not value:
            return dt_util.now()
        parsed = datetime.fromisoformat(str(value))
        if parsed.tzinfo is None:
            return dt_util.ensure_local(parsed)
        return parsed

    def _parse_positive_float(self, value: Any, field_name: str) -> float:
        try:
            parsed = float(value)
        except (TypeError, ValueError) as err:
            raise ValueError(f"{field_name} must be a positive number") from err
        if parsed <= 0:
            raise ValueError(f"{field_name} must be greater than zero")
        return round(parsed, 6)

    def _parse_optional_hour(self, value: Any, default: int) -> int:
        if value is None:
            return default
        hour = int(value)
        if hour < 0 or hour > 23:
            raise ValueError("hour must be between 0 and 23")
        return hour

    def _last_completed_hour(self, measured_at: datetime, target_date: str) -> int:
        if measured_at.date().isoformat() != target_date:
            return 23
        return max(0, measured_at.hour - 1)

    async def _existing_total(self, target_date: str, end_hour: int) -> float:
        row = await self.db_manager.fetchone(
            """SELECT COALESCE(SUM(actual_kwh), 0.0)
               FROM hourly_predictions
               WHERE target_date = ?
                 AND target_hour <= ?
                 AND actual_kwh IS NOT NULL""",
            (target_date, end_hour),
        )
        return round(float(row[0] or 0.0), 6)

    def _select_candidate_rows(self, rows: list[Any]) -> list[Any]:
        candidates = []
        for row in rows:
            actual_kwh = row["actual_kwh"]
            prediction_kwh = float(row["prediction_kwh"] or 0.0)
            manual_override = bool(row["manual_override"])
            has_sensor_data = bool(row["has_sensor_data"])
            sensor_data_complete = bool(row["sensor_data_complete"])

            missing_actual = actual_kwh is None and prediction_kwh > 0.01
            outage_zero = (
                not manual_override
                and not has_sensor_data
                and not sensor_data_complete
                and float(actual_kwh or 0.0) == 0.0
                and prediction_kwh > 0.01
            )
            if missing_actual or outage_zero:
                candidates.append(row)
        return candidates

    def _allocate_hourly_delta(self, rows: list[Any], repair_delta: float) -> list[RepairHour]:
        weights = [max(float(row["prediction_kwh"] or 0.0), 0.0) for row in rows]
        weight_sum = sum(weights)
        if weight_sum <= 0:
            weights = [1.0 for _ in rows]
            weight_sum = float(len(rows))

        repairs = []
        remaining = round(repair_delta, 4)
        for index, row in enumerate(rows):
            if index == len(rows) - 1:
                repaired_kwh = max(0.0, remaining)
            else:
                repaired_kwh = round(repair_delta * (weights[index] / weight_sum), 4)
                remaining = round(remaining - repaired_kwh, 4)
            repairs.append(
                RepairHour(
                    prediction_id=row["prediction_id"],
                    hour=int(row["target_hour"]),
                    prediction_kwh=float(row["prediction_kwh"] or 0.0),
                    repaired_kwh=repaired_kwh,
                    cumulative_kwh=0.0,
                )
            )
        return repairs

    async def _allocate_groups(
        self,
        target_date: str,
        repair_hours: list[RepairHour],
    ) -> dict[str, dict[str, float]]:
        if not repair_hours:
            return {}

        group_weights = await self._historical_group_weights(target_date)
        allocations = {}
        for hour in repair_hours:
            rows = await self.db_manager.fetchall(
                """SELECT group_name, prediction_kwh
                   FROM prediction_panel_groups
                   WHERE prediction_id = ?
                   ORDER BY group_name""",
                (hour.prediction_id,),
            )
            if not rows:
                allocations[hour.prediction_id] = {}
                continue

            weights = {
                row["group_name"]: group_weights.get(
                    row["group_name"],
                    max(float(row["prediction_kwh"] or 0.0), 0.0),
                )
                for row in rows
            }
            weight_sum = sum(weights.values())
            if weight_sum <= 0:
                weights = {row["group_name"]: 1.0 for row in rows}
                weight_sum = float(len(rows))

            remaining = round(hour.repaired_kwh, 4)
            hour_alloc = {}
            names = list(weights.keys())
            for index, name in enumerate(names):
                if index == len(names) - 1:
                    value = max(0.0, remaining)
                else:
                    value = round(hour.repaired_kwh * (weights[name] / weight_sum), 4)
                    remaining = round(remaining - value, 4)
                hour_alloc[name] = value
            allocations[hour.prediction_id] = hour_alloc

        return allocations

    async def _historical_group_weights(self, target_date: str) -> dict[str, float]:
        rows = await self.db_manager.fetchall(
            """SELECT ppg.group_name, SUM(ppg.actual_kwh) AS actual_sum
               FROM prediction_panel_groups ppg
               JOIN hourly_predictions hp ON hp.prediction_id = ppg.prediction_id
               WHERE hp.target_date < ?
                 AND hp.target_date >= date(?, '-14 days')
                 AND hp.actual_kwh IS NOT NULL
                 AND COALESCE(hp.exclude_from_learning, 0) = 0
                 AND ppg.actual_kwh IS NOT NULL
                 AND COALESCE(ppg.exclude_from_learning_group, 0) = 0
               GROUP BY ppg.group_name""",
            (target_date, target_date),
        )
        weights = {
            row["group_name"]: max(float(row["actual_sum"] or 0.0), 0.0)
            for row in rows
        }
        return {name: value for name, value in weights.items() if value > 0}

    async def _calculate_cumulative_by_hour(
        self,
        target_date: str,
        end_hour: int,
        repairs_by_hour: dict[int, float],
    ) -> dict[int, float]:
        rows = await self.db_manager.fetchall(
            """SELECT target_hour, actual_kwh
               FROM hourly_predictions
               WHERE target_date = ?
                 AND target_hour <= ?
               ORDER BY target_hour""",
            (target_date, end_hour),
        )
        cumulative = 0.0
        cumulative_by_hour = {}
        for row in rows:
            hour = int(row["target_hour"])
            value = repairs_by_hour.get(hour)
            if value is None:
                value = float(row["actual_kwh"] or 0.0)
            cumulative = round(cumulative + value, 4)
            if hour in repairs_by_hour:
                cumulative_by_hour[hour] = cumulative
        return cumulative_by_hour

    async def _apply_daily_cumulative_repair(
        self,
        measured_at: datetime,
        repair_hours: list[RepairHour],
        group_allocations: dict[str, dict[str, float]],
        audit_payload: dict[str, Any],
    ) -> None:
        db = self.db_manager
        await self._ensure_audit_table()
        async with db.transaction():
            for hour in repair_hours:
                await db.execute(
                    """UPDATE hourly_predictions
                       SET actual_kwh = ?,
                           actual_measured_at = ?,
                           manual_override = 1,
                           exclude_from_learning = 1,
                           exclude_from_clean_evaluation = 1,
                           has_sensor_data = 1,
                           sensor_data_complete = 0,
                           has_panel_group_actuals = ?,
                           error_kwh = ROUND(? - prediction_kwh, 4),
                           error_percent = CASE
                               WHEN prediction_kwh > 0
                               THEN ROUND(((? - prediction_kwh) / prediction_kwh) * 100.0, 2)
                               ELSE NULL
                           END,
                           accuracy_percent = CASE
                               WHEN prediction_kwh > 0
                               THEN MAX(0.0, ROUND(100.0 - ABS(((? - prediction_kwh) / prediction_kwh) * 100.0), 2))
                               ELSE NULL
                           END
                       WHERE prediction_id = ?""",
                    (
                        hour.repaired_kwh,
                        measured_at.isoformat(),
                        1 if group_allocations.get(hour.prediction_id) else 0,
                        hour.repaired_kwh,
                        hour.repaired_kwh,
                        hour.repaired_kwh,
                        hour.prediction_id,
                    ),
                    auto_commit=False,
                )
                for group_name, actual_kwh in group_allocations.get(hour.prediction_id, {}).items():
                    await db.execute(
                        """UPDATE prediction_panel_groups
                           SET actual_kwh = ?,
                               exclude_from_learning_group = 1,
                               exclusion_reason_group = 'manual_actual_repair'
                           WHERE prediction_id = ?
                             AND group_name = ?""",
                        (actual_kwh, hour.prediction_id, group_name),
                        auto_commit=False,
                    )
                await db.execute(
                    """INSERT OR IGNORE INTO prediction_sensor_actual
                       (prediction_id, current_yield_kwh)
                       VALUES (?, ?)""",
                    (hour.prediction_id, hour.cumulative_kwh),
                    auto_commit=False,
                )
                await db.execute(
                    """UPDATE prediction_sensor_actual
                       SET current_yield_kwh = ?
                       WHERE prediction_id = ?""",
                    (hour.cumulative_kwh, hour.prediction_id),
                    auto_commit=False,
                )

            await db.execute(
                """INSERT INTO repair_tool_audit
                   (created_at, operation, dry_run, payload_json)
                   VALUES (?, ?, 0, ?)""",
                (
                    dt_util.now().isoformat(),
                    audit_payload["operation"],
                    json.dumps(audit_payload, sort_keys=True),
                ),
                auto_commit=False,
            )

        if hasattr(self.coordinator, "_refresh_hourly_predictions_cache"):
            await self.coordinator._refresh_hourly_predictions_cache()
            self.coordinator.async_update_listeners()

    async def _ensure_audit_table(self) -> None:
        await self.db_manager.execute(
            """CREATE TABLE IF NOT EXISTS repair_tool_audit (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   created_at TIMESTAMP NOT NULL,
                   operation TEXT NOT NULL,
                   dry_run BOOLEAN NOT NULL DEFAULT TRUE,
                   payload_json TEXT NOT NULL
               )"""
        )

    def _log_result(self, result: dict[str, Any]) -> None:
        repaired_hours = result.get("repaired_hours", [])
        prefix = "DRY RUN" if result.get("dry_run") else "WRITTEN"
        _LOGGER.warning(
            "SFML repair_tool %s operation=%s date=%s cumulative=%.4f "
            "delta=%.4f hours=%s live_cache_updated=%s",
            prefix,
            result.get("operation"),
            result.get("target_date"),
            float(result.get("cumulative_kwh", 0.0)),
            float(result.get("repair_delta_kwh", 0.0)),
            [hour.get("hour") for hour in repaired_hours],
            result.get("live_cache_updated", False),
        )
        _LOGGER.info("SFML repair_tool result: %s", json.dumps(result, sort_keys=True))
