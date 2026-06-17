# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""
Panel Group Sensor Reader for Solar Forecast ML V16.2.0.
Reads energy sensors for panel groups to enable per-group learning.
Uses database operations via panel_group_sensor_state table.

@zara
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from homeassistant.core import HomeAssistant

from .db_manager import DatabaseManager
from .data_io import DataManagerIO
from ..core.core_helpers import SafeDateTimeUtil

_LOGGER = logging.getLogger(__name__)

MAX_LIVE_SENSOR_DELTA_AGE = timedelta(minutes=90)


class PanelGroupSensorReader(DataManagerIO):
    """Reads energy sensors for panel groups to enable per-group learning. @zara

    V16.0.0: All state persistence via panel_group_sensor_state database table.
    Replaces JSON file operations with database queries.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        db_manager: DatabaseManager,
        panel_groups: List[Dict[str, Any]],
    ):
        """Initialize the panel group sensor reader. @zara

        Args:
            hass: Home Assistant instance
            db_manager: DatabaseManager instance for DB operations
            panel_groups: List of panel group configurations with optional energy_sensor
        """
        super().__init__(hass, db_manager)
        self.panel_groups = panel_groups
        self._last_values: Dict[str, float] = {}  # group_name -> last kWh value
        self._last_updated_by_group: Dict[str, datetime] = {}
        self._sensor_rejection_warnings: Set[str] = set()
        self._group_learning_disabled_reason: Optional[str] = None
        self._group_learning_disabled_streak: int = 0
        self._consistency_mismatch_streak: int = 0
        self._recorder_backfill_negative_delta_counts: Dict[str, int] = {}
        self._listener_removers: Dict[str, Any] = {}

        _LOGGER.debug(
            "PanelGroupSensorReader initialized with %d groups",
            len(panel_groups),
        )

    @staticmethod
    def _safe_float(value: Any, default: Optional[float] = None) -> Optional[float]:
        """Safely convert value to float with fallback. @zara"""
        try:
            return float(value) if value is not None else default
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _attr_value(value: Any) -> str:
        if value is None:
            return ""
        enum_value = getattr(value, "value", None)
        if enum_value is not None:
            value = enum_value
        return str(value).strip()

    @staticmethod
    def _parse_datetime(value: Any, reference: Optional[datetime] = None) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            parsed = value
        else:
            try:
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except (TypeError, ValueError):
                return None

        if reference is not None:
            if parsed.tzinfo is None and reference.tzinfo is not None:
                parsed = parsed.replace(tzinfo=reference.tzinfo)
            elif parsed.tzinfo is not None and reference.tzinfo is None:
                parsed = parsed.replace(tzinfo=None)
            elif parsed.tzinfo is not None and reference.tzinfo is not None:
                parsed = parsed.astimezone(reference.tzinfo)

        return parsed

    def _sensor_rejection_reason(self, state: Any) -> Optional[str]:
        attrs = getattr(state, "attributes", {}) or {}
        unit = self._attr_value(attrs.get("unit_of_measurement"))
        device_class = self._attr_value(attrs.get("device_class")).lower()
        state_class = self._attr_value(attrs.get("state_class")).lower()

        if unit.lower() != "kwh":
            return f"unit={unit or 'missing'}"
        if device_class != "energy":
            return f"device_class={device_class or 'missing'}"
        if state_class not in {"total", "total_increasing"}:
            return f"state_class={state_class or 'missing'}"
        return None

    def _warn_sensor_not_accepted(
        self,
        group_name: str,
        entity_id: str,
        state: Any,
        reason: str,
    ) -> None:
        warning_key = f"{group_name}:{entity_id}:{reason}"
        if warning_key in self._sensor_rejection_warnings:
            return

        attrs = getattr(state, "attributes", {}) or {}
        _LOGGER.warning(
            "Panel group sensor '%s' for group '%s' is not accepted for group learning: "
            "expected a cumulative DC energy sensor with unit kWh, device_class=energy "
            "and state_class=total or total_increasing (%s).",
            entity_id,
            group_name,
            reason,
        )
        _LOGGER.debug(
            "Rejected panel group sensor metadata: entity=%s, unit=%s, device_class=%s, state_class=%s",
            entity_id,
            self._attr_value(attrs.get("unit_of_measurement")) or "missing",
            self._attr_value(attrs.get("device_class")) or "missing",
            self._attr_value(attrs.get("state_class")) or "missing",
        )
        self._sensor_rejection_warnings.add(warning_key)

    def _warn_group_learning_disabled(self, reason: str) -> None:
        if self._group_learning_disabled_reason == reason:
            self._group_learning_disabled_streak += 1
        else:
            self._group_learning_disabled_reason = reason
            self._group_learning_disabled_streak = 1

        missing_sensor_config = "have a configured sensor" in reason
        warn = missing_sensor_config or self._group_learning_disabled_streak >= 3
        should_log = (
            self._group_learning_disabled_streak == 1
            or self._group_learning_disabled_streak == 3
            or (warn and self._group_learning_disabled_streak % 6 == 0)
        )
        if not should_log:
            return

        log = _LOGGER.warning if warn else _LOGGER.info
        suffix = (
            "Please verify that every panel group has a valid cumulative DC energy sensor in kWh."
            if missing_sensor_config or warn
            else "Learning will resume automatically after fresh same-hour baselines are available."
        )
        log(
            "Panel group learning skipped for this hour: %s (streak=%d). %s",
            reason,
            self._group_learning_disabled_streak,
            suffix,
        )

    def _reset_group_learning_disabled_status(self) -> None:
        self._group_learning_disabled_reason = None
        self._group_learning_disabled_streak = 0

    def _get_group_capacity_kwp(self, group_name: str) -> Optional[float]:
        """Get configured group capacity in kWp by name. @zara"""
        group = next(
            (g for g in self.panel_groups if g.get("name") == group_name),
            None,
        )
        if group is None:
            return None

        for key in ("capacity_kwp", "kwp", "power_kwp"):
            capacity = self._safe_float(group.get(key))
            if capacity and capacity > 0:
                return capacity

        for key in ("power_wp", "capacity_wp", "peak_power_wp"):
            capacity_wp = self._safe_float(group.get(key))
            if capacity_wp and capacity_wp > 0:
                return capacity_wp / 1000.0

        return None

    def _max_hourly_kwh(self, group_name: str) -> float:
        """Plausible max hourly production for a group in kWh. @zara"""
        capacity_kwp = self._get_group_capacity_kwp(group_name)
        if capacity_kwp is None:
            return 10.0

        return max(capacity_kwp * 1.3, 0.5)

    def _validate_hourly_delta(
        self,
        group_name: str,
        delta: Any,
        source: str,
    ) -> Optional[float]:
        """Validate one hourly group actual before it can enter persistence. @zara"""
        from ..core.core_hubble import Hubble
        from homeassistant.helpers.issue_registry import IssueSeverity as Severity

        value = self._safe_float(delta)
        if value is None or not math.isfinite(value):
            Hubble.warning(
                f"Ungültiger Messwert ({delta!r}) von Sensor '{group_name}' ({source}). "
                f"Ich ignoriere diese Stunde für das Training."
            )
            return None

        issue_id = f"sensor_spike_{group_name}"

        if value < -0.001:
            if source == "recorder backfill":
                self._recorder_backfill_negative_delta_counts[group_name] = (
                    self._recorder_backfill_negative_delta_counts.get(group_name, 0) + 1
                )
                return None

            Hubble.warning(
                f"Negativer Ertrags-Messwert ({value:.4f} kWh) bei Modulgruppe '{group_name}' ({source}). "
                f"Ich ignoriere diesen Wert zum Schutz der KI."
            )
            return None

        value = max(0.0, value)
        max_hourly = self._max_hourly_kwh(group_name)
        if value > max_hourly:
            error_msg = f"Der Messwert von {value:.4f} kWh überschreitet das physikalische Maximum von {max_hourly:.1f} kWh."
            Hubble.warning(
                f"Unerwarteter Ertragssprung bei Modulgruppe '{group_name}' ({source}): {error_msg} "
                f"Ich filtere diese Stunde aus den Trainingsdaten."
            )

            title = f"Unerwarteter Ertragssprung bei '{group_name}'"
            description = (
                f"Hallo! Hubble hier.\n\n"
                f"Der Sensor deiner Modulgruppe **{group_name}** hat einen unplausiblen Ertragssprung gemeldet:\n\n"
                f"**Gemessen:** {value:.4f} kWh\n"
                f"**Physikalisch maximal möglich:** {max_hourly:.1f} kWh\n\n"
                f"**Auswirkung:** Um deine KI-Prognose nicht zu vergiften, habe ich diesen Ausreißer aus den Trainingsdaten gefiltert.\n\n"
                f"**Mögliche Ursache:** Das passiert häufig bei einem plötzlichen Neustart der DTU/des Inverters oder bei einer Verbindungsunterbrechung des Smart Meters. Du musst nichts tun, ich überwache die Werte weiter."
            )
            self.hass.add_job(
                Hubble.async_create_issue,
                self.hass,
                issue_id,
                title,
                description,
                Severity.WARNING,
            )
            return None

        self.hass.add_job(Hubble.async_dismiss_issue, self.hass, issue_id)
        return round(value, 4)

    async def initialize(self) -> None:
        """Load last known sensor values from database. @zara"""
        try:
            await self.ensure_initialized()

            # Load from panel_group_sensor_state table
            rows = await self.fetch_all(
                "SELECT group_name, last_value, last_updated FROM panel_group_sensor_state"
            )

            self._last_values = {row[0]: row[1] for row in rows if row[1] is not None}
            now = SafeDateTimeUtil.now()
            self._last_updated_by_group = {
                row[0]: parsed
                for row in rows
                if row[1] is not None
                for parsed in [self._parse_datetime(row[2], now)]
                if parsed is not None
            }

            _LOGGER.debug(
                "Loaded panel group sensor state: %d groups (%d timestamps)",
                len(self._last_values),
                len(self._last_updated_by_group),
            )
        except Exception as e:
            _LOGGER.warning("Failed to load panel group sensor state: %s", e)
            self._last_values = {}
            self._last_updated_by_group = {}

    async def _save_state(self, group_name: str, value: float) -> None:
        """Save sensor value for a group to database. @zara

        Args:
            group_name: Name of the panel group
            value: Current kWh value
        """
        now = SafeDateTimeUtil.now()
        self._last_updated_by_group[group_name] = now
        try:
            await self.execute_query(
                """INSERT INTO panel_group_sensor_state (group_name, last_value, last_updated)
                   VALUES (?, ?, ?)
                   ON CONFLICT(group_name) DO UPDATE SET
                       last_value = excluded.last_value,
                       last_updated = excluded.last_updated""",
                (group_name, value, now),
            )
        except Exception as e:
            _LOGGER.warning("Failed to save panel group sensor state: %s", e)

    async def _store_baseline(self, group_name: str, value: float) -> None:
        self._last_values[group_name] = value
        await self._save_state(group_name, value)

    async def _save_all_states(self) -> None:
        """Save all current sensor values to database. @zara"""
        try:
            state_data = {
                "last_updated": SafeDateTimeUtil.now().isoformat(),
                "last_values": self._last_values,
            }
            await self.db.save_panel_group_sensor_state(state_data)
        except Exception as e:
            _LOGGER.warning("Failed to save panel group sensor states: %s", e)

    def get_groups_with_sensors(self) -> List[Dict[str, Any]]:
        """Get list of panel groups that have energy sensors configured. @zara

        Returns:
            List of panel group configurations with energy_sensor defined
        """
        return [
            g
            for g in self.panel_groups
            if g.get("energy_sensor") and len(g.get("energy_sensor", "")) > 0
        ]

    def has_any_sensor(self) -> bool:
        """Check if any panel group has an energy sensor configured. @zara

        Returns:
            True if at least one group has a sensor
        """
        return len(self.get_groups_with_sensors()) > 0

    async def read_current_energy(self, group_name: str) -> Optional[float]:
        """Read current kWh value for a specific group. @zara

        Args:
            group_name: Name of the panel group

        Returns:
            Current kWh value or None if not available
        """
        group = next(
            (g for g in self.panel_groups if g.get("name") == group_name),
            None,
        )

        if not group:
            _LOGGER.debug("Panel group '%s' not found", group_name)
            return None

        entity_id = group.get("energy_sensor")
        if not entity_id:
            return None

        try:
            state = self.hass.states.get(entity_id)

            if state is None:
                _LOGGER.warning(
                    "Energy sensor '%s' not found for group '%s'",
                    entity_id,
                    group_name,
                )
                return None

            if state.state in ["unavailable", "unknown", None]:
                _LOGGER.debug("Energy sensor '%s' is %s", entity_id, state.state)
                return None

            rejection_reason = self._sensor_rejection_reason(state)
            if rejection_reason:
                self._warn_sensor_not_accepted(
                    group_name,
                    entity_id,
                    state,
                    rejection_reason,
                )
                return None

            value = float(state.state)

            return round(value, 4)

        except (ValueError, TypeError) as e:
            _LOGGER.warning(
                "Failed to read energy sensor '%s' for group '%s': %s",
                entity_id,
                group_name,
                e,
            )
            return None

    async def get_hourly_production(self, group_name: str) -> Optional[float]:
        """Calculate production since last read (hourly delta). @zara

        This calculates the difference between current sensor value and
        the last stored value to get hourly production.

        Args:
            group_name: Name of the panel group

        Returns:
            Production in kWh since last read, or None if not available
        """
        current_value = await self.read_current_energy(group_name)

        if current_value is None:
            return None

        last_value = self._last_values.get(group_name)
        now = SafeDateTimeUtil.now()
        last_updated = self._last_updated_by_group.get(group_name)

        if last_value is None or last_updated is None:
            await self._store_baseline(group_name, current_value)
            _LOGGER.debug(
                "Baseline reading for group '%s': %.4f kWh (no delta yet)",
                group_name,
                current_value,
            )
            return None

        last_updated = self._parse_datetime(last_updated, now)
        if last_updated is None:
            await self._store_baseline(group_name, current_value)
            _LOGGER.info(
                "Panel group baseline timestamp missing for group '%s'; stored %.4f kWh as new baseline",
                group_name,
                current_value,
            )
            return None

        if last_updated.date() != now.date():
            await self._store_baseline(group_name, current_value)
            _LOGGER.info(
                "Panel group daily sensor baseline reset for group '%s': previous baseline "
                "from %s, current %.4f kWh stored as new baseline; no hourly delta learned",
                group_name,
                last_updated.date().isoformat(),
                current_value,
            )
            return None

        baseline_age = now - last_updated
        if baseline_age < timedelta(0) or baseline_age > MAX_LIVE_SENSOR_DELTA_AGE:
            await self._store_baseline(group_name, current_value)
            _LOGGER.info(
                "Skipping panel group training target '%s': baseline is %.1f minutes old; "
                "stored %.4f kWh as new baseline to avoid learning a multi-hour delta",
                group_name,
                baseline_age.total_seconds() / 60.0,
                current_value,
            )
            return None

        if current_value < last_value:
            _LOGGER.info(
                "Energy counter reset or discontinuity detected for group '%s': %.4f -> %.4f kWh; "
                "assumed reset to 0.0 and accumulated %.4f kWh",
                group_name,
                last_value,
                current_value,
                current_value,
            )
            delta = current_value
            await self._store_baseline(group_name, current_value)
        else:
            delta = current_value - last_value
            await self._store_baseline(group_name, current_value)

        validated_delta = self._validate_hourly_delta(
            group_name,
            delta,
            "live sensor",
        )
        if validated_delta is None:
            return None

        return validated_delta

    async def read_all_groups(self) -> Dict[str, float]:
        """Read current energy values for all groups with sensors. @zara

        Returns:
            Dict mapping group_name to current kWh value
        """
        results: Dict[str, float] = {}

        for group in self.get_groups_with_sensors():
            group_name = group.get("name", "Unknown")
            value = await self.read_current_energy(group_name)

            if value is not None:
                results[group_name] = value

        return results

    async def get_all_hourly_productions(self) -> Dict[str, float]:
        """Get hourly production for all groups with sensors. @zara

        Returns:
            Dict mapping group_name to hourly production in kWh
        """
        results: Dict[str, float] = {}
        expected_groups = [g for g in self.panel_groups if g.get("name")]
        groups_with_sensors = self.get_groups_with_sensors()

        if len(groups_with_sensors) != len(expected_groups):
            self._warn_group_learning_disabled(
                f"{len(groups_with_sensors)}/{len(expected_groups)} panel groups have a configured sensor"
            )
            return results

        for group in groups_with_sensors:
            group_name = group.get("name", "Unknown")
            production = await self.get_hourly_production(group_name)

            if production is not None:
                results[group_name] = production

        if len(results) != len(expected_groups):
            self._warn_group_learning_disabled(
                f"{len(results)}/{len(expected_groups)} panel groups produced a valid hourly kWh delta"
            )
            return {}

        self._reset_group_learning_disabled_status()
        return results

    async def backfill_missing_actuals_from_recorder(
        self,
        days: int = 30,
    ) -> int:
        """Backfill missing per-group actuals from HA Recorder history. @zara"""
        if not self.has_any_sensor():
            return 0

        try:
            from homeassistant.components.recorder import get_instance
            from homeassistant.components.recorder.history import (
                state_changes_during_period,
            )
        except ImportError:
            _LOGGER.debug("Recorder not available for backfill")
            return 0

        cutoff = (SafeDateTimeUtil.now() - timedelta(days=days)).date().isoformat()
        filled = 0
        self._recorder_backfill_negative_delta_counts = {}

        # 1. Fetch candidate hours where at least one group has missing actual_kwh or has_panel_group_actuals is False
        try:
            candidate_hours = await self.fetch_all(
                """SELECT DISTINCT hp.prediction_id, hp.target_date, hp.target_hour, hp.actual_kwh
                   FROM hourly_predictions hp
                   JOIN prediction_panel_groups ppg ON ppg.prediction_id = hp.prediction_id
                   WHERE hp.target_date >= ? AND hp.target_date < date('now')
                     AND (ppg.actual_kwh IS NULL OR hp.has_panel_group_actuals = 0)
                   ORDER BY hp.target_date ASC, hp.target_hour ASC""",
                (cutoff,),
            )
        except Exception as e:
            _LOGGER.warning("Failed to fetch candidate hours for backfill: %s", e)
            return 0

        if not candidate_hours:
            return 0

        # 2. Determine time window and fetch recorder data
        first_date = candidate_hours[0][1]
        start_time = SafeDateTimeUtil.ensure_local(datetime.fromisoformat(f"{first_date}T00:00:00"))
        end_time = SafeDateTimeUtil.now()

        expected_groups = self.get_groups_with_sensors()
        group_readings = {}
        instance = get_instance(self.hass)

        for group in expected_groups:
            group_name = group.get("name", "")
            entity_id = group.get("energy_sensor", "")
            if not entity_id:
                continue

            try:
                states = await instance.async_add_executor_job(
                    state_changes_during_period,
                    self.hass,
                    start_time,
                    end_time,
                    entity_id,
                    False,
                    True,
                    None,
                )
                entity_states = states.get(entity_id, [])
                if len(entity_states) < 2:
                    _LOGGER.debug(
                        "Backfill %s: insufficient recorder data (%d states)",
                        group_name, len(entity_states),
                    )
                    continue

                readings = []
                for s in entity_states:
                    if s.state in ("unavailable", "unknown", ""):
                        continue
                    try:
                        rejection_reason = self._sensor_rejection_reason(s)
                        if rejection_reason:
                            self._warn_sensor_not_accepted(
                                group_name,
                                entity_id,
                                s,
                                rejection_reason,
                            )
                            readings = []
                            break
                        val = float(s.state)
                        readings.append((s.last_changed, val))
                    except (ValueError, TypeError):
                        continue

                if len(readings) >= 2:
                    readings.sort(key=lambda x: x[0])
                    group_readings[group_name] = readings
            except Exception as e:
                _LOGGER.warning("Failed to fetch states for group %s: %s", group_name, e)

        # 3. Process hour-by-hour across all groups concurrently
        for prediction_id, target_date, target_hour, total_actual in candidate_hours:
            hour_start = datetime.fromisoformat(
                f"{target_date}T{target_hour:02d}:00:00"
            )
            hour_end = datetime.fromisoformat(
                f"{target_date}T{target_hour:02d}:59:59"
            )

            hour_actuals = {}
            incomplete = False

            try:
                db_rows = await self.fetch_all(
                    """SELECT group_name, actual_kwh, exclude_from_learning_group, exclusion_reason_group
                       FROM prediction_panel_groups
                       WHERE prediction_id = ?""",
                    (prediction_id,)
                )
                existing_db_data = {
                    r[0]: {
                        "actual_kwh": r[1],
                        "exclude": r[2],
                        "reason": r[3]
                    } for r in db_rows
                }
            except Exception as e:
                _LOGGER.warning("Failed to fetch existing panel groups for %s: %s", prediction_id, e)
                continue

            for group in expected_groups:
                g_name = group.get("name", "")
                if g_name not in existing_db_data:
                    incomplete = True
                    continue

                existing_actual = existing_db_data[g_name]["actual_kwh"]
                if existing_actual is not None:
                    hour_actuals[g_name] = existing_actual
                    continue

                readings = group_readings.get(g_name)
                if not readings:
                    incomplete = True
                    continue

                baseline_idx = -1
                for idx, (ts, val) in enumerate(readings):
                    ts_naive = ts.replace(tzinfo=None) if ts.tzinfo else ts
                    if ts_naive <= hour_start:
                        baseline_idx = idx

                if baseline_idx == -1:
                    incomplete = True
                    continue

                hour_readings = []
                for idx in range(baseline_idx + 1, len(readings)):
                    ts, val = readings[idx]
                    ts_naive = ts.replace(tzinfo=None) if ts.tzinfo else ts
                    if ts_naive <= hour_end:
                        hour_readings.append(val)
                    else:
                        break

                prev_val = readings[baseline_idx][1]
                accumulated_delta = 0.0

                for val in hour_readings:
                    if val >= prev_val:
                        accumulated_delta += (val - prev_val)
                    else:
                        accumulated_delta += val
                    prev_val = val

                delta = self._validate_hourly_delta(
                    g_name,
                    accumulated_delta,
                    "recorder backfill",
                )
                if delta is None:
                    incomplete = True
                    continue

                hour_actuals[g_name] = delta

            # Determine exclusion reasons
            exclusion_reason = None
            if total_actual is None:
                exclusion_reason = "missing_total_actual"
            elif incomplete or len(hour_actuals) != len(expected_groups):
                exclusion_reason = "incomplete_group_data"
            else:
                consistency = await self.check_consistency(
                    total_actual,
                    hour_actuals,
                    target_date=target_date,
                    target_hour=target_hour,
                )
                if not consistency.get("consistent"):
                    exclusion_reason = "consistency_mismatch"

            # Write values and update exclusion flags/reasons
            wrote_any = False
            for group in expected_groups:
                g_name = group.get("name", "")
                val = hour_actuals.get(g_name)

                if val is not None and existing_db_data.get(g_name, {}).get("actual_kwh") is None:
                    await self.execute_query(
                        """UPDATE prediction_panel_groups
                           SET actual_kwh = ?
                           WHERE prediction_id = ? AND group_name = ?
                             AND actual_kwh IS NULL""",
                        (round(val, 4), prediction_id, g_name),
                    )
                    wrote_any = True
                    filled += 1

                if exclusion_reason:
                    await self.db.update_prediction_panel_group_flags(
                        prediction_id,
                        g_name,
                        {
                            "exclude_from_learning_group": True,
                            "exclusion_reason_group": exclusion_reason,
                        }
                    )

            if wrote_any or any(value is not None for value in hour_actuals.values()):
                await self.execute_query(
                    """UPDATE hourly_predictions
                       SET has_panel_group_actuals = TRUE
                       WHERE prediction_id = ?""",
                    (prediction_id,)
                )

        if filled > 0:
            _LOGGER.info("Backfill: %d per-group actuals recovered from recorder", filled)

        if self._recorder_backfill_negative_delta_counts:
            details = ", ".join(
                f"{group_name}={count}"
                for group_name, count in sorted(self._recorder_backfill_negative_delta_counts.items())
            )
            _LOGGER.info(
                "Backfill ignored recorder samples with negative deltas (%s); this is expected around daily-reset sensors or counter discontinuities",
                details,
            )

        return filled

    async def validate_sensors(self) -> Dict[str, Dict[str, Any]]:
        """Validate all configured energy sensors. @zara

        Returns:
            Dict with validation results per group
        """
        results: Dict[str, Dict[str, Any]] = {}

        for group in self.get_groups_with_sensors():
            group_name = group.get("name", "Unknown")
            entity_id = group.get("energy_sensor", "")

            validation = await self._validate_energy_sensor(entity_id)
            validation["entity_id"] = entity_id
            results[group_name] = validation

        return results

    async def _validate_energy_sensor(self, entity_id: str) -> Dict[str, Any]:
        """Validate a single energy sensor. @zara

        Checks:
        1. Entity exists
        2. Entity is numeric
        3. Entity is a cumulative DC energy sensor in kWh
        """
        if not entity_id:
            return {"valid": False, "error": "No entity_id configured"}

        state = self.hass.states.get(entity_id)

        if state is None:
            # Try to find similar entities
            suggestions = self._find_similar_entities(entity_id)
            error_msg = f"Entity {entity_id} not found"
            if suggestions:
                error_msg += f". Did you mean: {', '.join(suggestions[:3])}"
            return {"valid": False, "error": error_msg}

        if state.state in ["unavailable", "unknown"]:
            return {"valid": False, "error": f"Entity {entity_id} is {state.state}"}

        try:
            float(state.state)
        except (ValueError, TypeError):
            return {
                "valid": False,
                "error": f"Entity {entity_id} is not numeric: {state.state}",
            }

        rejection_reason = self._sensor_rejection_reason(state)
        if rejection_reason:
            return {
                "valid": False,
                "error": (
                    f"Entity {entity_id} is not accepted for group learning: expected "
                    f"a cumulative DC energy sensor with unit kWh, device_class=energy "
                    f"and state_class=total or total_increasing ({rejection_reason})"
                ),
            }

        return {
            "valid": True,
            "unit": self._attr_value(state.attributes.get("unit_of_measurement")),
            "current_value": float(state.state),
            "state_class": state.attributes.get("state_class", "unknown"),
        }

    def _find_similar_entities(self, entity_id: str) -> List[str]:
        """Find similar entity IDs to help with debugging. @zara

        Args:
            entity_id: The entity ID that was not found

        Returns:
            List of similar entity IDs
        """
        try:
            # Extract the sensor name without domain
            if "." in entity_id:
                _, name_part = entity_id.split(".", 1)
            else:
                name_part = entity_id

            # Extract keywords from entity name
            keywords = [kw.lower() for kw in name_part.split("_") if len(kw) >= 2]

            # Get all sensor entities
            all_states = self.hass.states.async_all("sensor")

            candidates = []
            for state in all_states:
                eid = state.entity_id.lower()
                # Check if any keyword matches
                matches = sum(1 for kw in keywords if kw in eid)
                if matches >= 2:  # At least 2 keywords match
                    # Prefer energy sensors
                    unit = state.attributes.get("unit_of_measurement", "")
                    if unit and unit.lower() in ["kwh", "wh"]:
                        candidates.append((state.entity_id, matches + 1))
                    else:
                        candidates.append((state.entity_id, matches))

            # Sort by match count (descending)
            candidates.sort(key=lambda x: x[1], reverse=True)
            return [c[0] for c in candidates[:5]]

        except Exception:
            return []

    async def check_consistency(
        self,
        total_actual: Optional[float],
        group_actuals: Dict[str, float],
        tolerance_percent: float = 15.0,
        target_date: Optional[str] = None,
        target_hour: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Check if sum of group actuals matches total actual. @zara

        Warns if the deviation exceeds the tolerance threshold.

        Args:
            total_actual: Total actual production (kWh)
            group_actuals: Dict of group_name -> actual_kwh
            tolerance_percent: Acceptable deviation percentage

        Returns:
            Dict with consistency check results
        """
        if not group_actuals:
            return {
                "consistent": True,
                "reason": "No data to compare",
            }

        if total_actual is None:
            return {
                "consistent": False,
                "reason": "missing_total_actual",
                "group_sum": round(sum(group_actuals.values()), 4),
                "total_actual": None,
                "deviation_percent": None,
                "tolerance_percent": tolerance_percent,
                "allowed_diff_kwh": None,
                "phase_shift_resolved": False,
            }

        group_sum = sum(group_actuals.values())
        tolerance_floor = 0.10 if total_actual < 1.0 else 0.05
        allowed_diff = max(tolerance_floor, total_actual * tolerance_percent / 100.0)
        absolute_diff = abs(group_sum - total_actual)
        deviation = (
            absolute_diff / total_actual * 100
            if total_actual > 0
            else None
        )

        consistent = absolute_diff <= allowed_diff

        phase_shift_resolved = False
        two_hour_allowed_diff = None
        two_hour_absolute_diff = None
        if (
            not consistent
            and target_date is not None
            and target_hour is not None
        ):
            phase_shift = await self._check_two_hour_consistency(
                target_date,
                target_hour,
                total_actual,
                group_actuals,
                tolerance_percent,
            )
            if phase_shift and phase_shift.get("consistent"):
                consistent = True
                phase_shift_resolved = True
                two_hour_allowed_diff = phase_shift.get("allowed_diff_kwh")
                two_hour_absolute_diff = phase_shift.get("absolute_diff_kwh")
                _LOGGER.info(
                    "Panel group consistency accepted via 2-hour phase window for %s hour %02d: group_sum_2h=%.3f kWh, total_2h=%.3f kWh",
                    target_date,
                    target_hour,
                    phase_shift.get("group_sum", 0.0),
                    phase_shift.get("total_actual", 0.0),
                )

        if not consistent:
            self._consistency_mismatch_streak += 1
            warn = self._consistency_mismatch_streak >= 3
            should_log = (
                self._consistency_mismatch_streak == 1
                or self._consistency_mismatch_streak == 3
                or (warn and self._consistency_mismatch_streak % 6 == 0)
            )
            if should_log:
                log = _LOGGER.warning if warn else _LOGGER.info
                suffix = (
                    "Please verify that all panel group sensors and the yield sensor measure the same DC energy basis in kWh, use the same time window, and do not overlap."
                    if warn
                    else "Training uses safe fallback targets for this hour."
                )
                log(
                    "Panel group learning skipped for this hour: group sum %.3f kWh does not match DC yield %.3f kWh (streak=%d). %s",
                    group_sum,
                    total_actual,
                    self._consistency_mismatch_streak,
                    suffix,
                )
        else:
            self._consistency_mismatch_streak = 0

        return {
            "consistent": consistent,
            "reason": None if consistent else "consistency_mismatch",
            "group_sum": round(group_sum, 4),
            "total_actual": round(total_actual, 4),
            "deviation_percent": round(deviation, 1) if deviation is not None else None,
            "tolerance_percent": tolerance_percent,
            "allowed_diff_kwh": round(allowed_diff, 4),
            "phase_shift_resolved": phase_shift_resolved,
            "two_hour_allowed_diff_kwh": two_hour_allowed_diff,
            "two_hour_absolute_diff_kwh": two_hour_absolute_diff,
        }

    async def _check_two_hour_consistency(
        self,
        target_date: str,
        target_hour: int,
        total_actual: float,
        group_actuals: Dict[str, float],
        tolerance_percent: float,
    ) -> Optional[Dict[str, Any]]:
        expected_group_names = {
            group.get("name")
            for group in self.get_groups_with_sensors()
            if group.get("name")
        }
        if not expected_group_names or set(group_actuals) != expected_group_names:
            return None

        try:
            current_date = datetime.fromisoformat(target_date).date()
        except ValueError:
            return None

        if target_hour <= 0:
            previous_date = (current_date - timedelta(days=1)).isoformat()
            previous_hour = 23
        else:
            previous_date = target_date
            previous_hour = target_hour - 1

        previous_prediction_id = f"{previous_date}_{previous_hour:02d}"
        rows = await self.fetch_all(
            """SELECT ppg.group_name,
                      ppg.actual_kwh,
                      ppg.exclusion_reason_group,
                      hp.actual_kwh
               FROM prediction_panel_groups ppg
               JOIN hourly_predictions hp
                 ON hp.prediction_id = ppg.prediction_id
               WHERE ppg.prediction_id = ?""",
            (previous_prediction_id,),
        )
        if len(rows) < len(expected_group_names):
            return None

        previous_total = None
        previous_group_actuals: Dict[str, float] = {}
        blocking_reasons = {"missing_total_actual", "incomplete_group_data"}

        for group_name, actual_kwh, exclusion_reason, previous_hour_total in rows:
            if group_name not in expected_group_names:
                continue
            if actual_kwh is None or exclusion_reason in blocking_reasons:
                return None
            if previous_hour_total is None:
                return None
            previous_total = float(previous_hour_total)
            previous_group_actuals[group_name] = float(actual_kwh)

        if previous_total is None or set(previous_group_actuals) != expected_group_names:
            return None

        two_hour_group_sum = sum(previous_group_actuals.values()) + sum(group_actuals.values())
        two_hour_total = previous_total + total_actual
        tolerance_floor = 0.10 if two_hour_total < 1.0 else 0.05
        allowed_diff = max(tolerance_floor, two_hour_total * tolerance_percent / 100.0)
        absolute_diff = abs(two_hour_group_sum - two_hour_total)

        return {
            "consistent": absolute_diff <= allowed_diff,
            "group_sum": round(two_hour_group_sum, 4),
            "total_actual": round(two_hour_total, 4),
            "absolute_diff_kwh": round(absolute_diff, 4),
            "allowed_diff_kwh": round(allowed_diff, 4),
        }

    async def reset_last_values(self) -> None:
        """Reset all stored last values (e.g., at midnight). @zara"""
        self._last_values = {}
        self._last_updated_by_group = {}

        # Clear database entries
        try:
            await self.execute_query(
                "UPDATE panel_group_sensor_state SET last_value = NULL, last_updated = NULL"
            )
            _LOGGER.info("Panel group sensor last values reset")
        except Exception as e:
            _LOGGER.warning("Failed to reset panel group sensor values: %s", e)

    async def get_group_state_from_db(
        self, group_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get panel group sensor state from database. @zara

        Args:
            group_name: Name of the panel group

        Returns:
            Dict with state data or None
        """
        try:
            row = await self.fetch_one(
                """SELECT group_name, last_value, last_updated
                   FROM panel_group_sensor_state
                   WHERE group_name = ?""",
                (group_name,),
            )

            if not row:
                return None

            return {
                "group_name": row[0],
                "last_value": row[1],
                "last_updated": row[2],
            }

        except Exception as e:
            _LOGGER.error("Failed to get group state from DB: %s", e)
            return None

    async def get_all_states_from_db(self) -> Dict[str, Dict[str, Any]]:
        """Get all panel group sensor states from database. @zara

        Returns:
            Dict mapping group_name to state data
        """
        try:
            rows = await self.fetch_all(
                "SELECT group_name, last_value, last_updated FROM panel_group_sensor_state"
            )

            return {
                row[0]: {
                    "group_name": row[0],
                    "last_value": row[1],
                    "last_updated": row[2],
                }
                for row in rows
            }

        except Exception as e:
            _LOGGER.error("Failed to get all states from DB: %s", e)
            return {}

    async def get_sensor_summary(self) -> Dict[str, Any]:
        """Get summary of panel group sensor configuration and status. @zara

        Returns:
            Dict with sensor summary information
        """
        groups_with_sensors = self.get_groups_with_sensors()
        validation_results = await self.validate_sensors()

        valid_sensors = sum(
            1 for v in validation_results.values() if v.get("valid", False)
        )

        return {
            "total_groups": len(self.panel_groups),
            "groups_with_sensors": len(groups_with_sensors),
            "valid_sensors": valid_sensors,
            "invalid_sensors": len(groups_with_sensors) - valid_sensors,
            "groups": [
                {
                    "name": g.get("name", "Unknown"),
                    "has_sensor": bool(g.get("energy_sensor")),
                    "entity_id": g.get("energy_sensor"),
                    "validation": validation_results.get(g.get("name", "Unknown"), {}),
                }
                for g in self.panel_groups
            ],
        }

    async def async_perform_sensor_audit(self) -> None:
        """Perform a complete audit of configured sensors and report issues via Hubble. @zara"""
        from ..core.core_hubble import Hubble
        from homeassistant.helpers.issue_registry import IssueSeverity as Severity

        groups_with_sensors = self.get_groups_with_sensors()
        if not groups_with_sensors:
            Hubble.info("Keine Modulgruppen-Energiesensoren konfiguriert. Ich überspringe das Sensor-Audit.")
            return

        validation_results = await self.validate_sensors()

        for group_name, validation in validation_results.items():
            entity_id = validation.get("entity_id")
            issue_id = f"sensor_config_{group_name}_{entity_id}"

            if not validation.get("valid", False):
                error_msg = validation.get("error", "Unbekannter Konfigurationsfehler.")

                # Hubble meldet den Fehler verständlich im Log
                Hubble.error(
                    f"Sensor-Problem bei Modulgruppe '{group_name}' (Sensor: {entity_id}): {error_msg} "
                    f"Ich deaktiviere das Lernen für diese Modulgruppe zum Schutz deiner Datenbank."
                )

                # Repairs Issue anlegen
                title = f"PV-Sensorfehler bei Gruppe '{group_name}'"
                description = (
                    f"Hallo! Hubble hier.\n\n"
                    f"Ich habe ein Problem mit dem Sensor **{entity_id}** der Modulgruppe **{group_name}** festgestellt:\n\n"
                    f"**Fehler:** {error_msg}\n\n"
                    f"**Auswirkung:** Um deine Datenbank vor fehlerhaften Trainingsdaten zu schützen, habe ich das "
                    f"Lernen für diese Gruppe vorübergehend deaktiviert.\n\n"
                    f"**Lösung:** Bitte überprüfe in den Einstellungen der Integration oder in deinen Home Assistant "
                    f"Entitäten, ob der Sensor existiert und kumulierte kWh-Werte liefert."
                )
                await Hubble.async_create_issue(
                    self.hass,
                    issue_id=issue_id,
                    title=title,
                    description=description,
                    severity=Severity.ERROR,
                )
                self._setup_sensor_recovery_listener(group_name, entity_id)
            else:
                # Sensor ist gültig: eventuell altes Problem löschen
                await Hubble.async_dismiss_issue(self.hass, issue_id)
                self._remove_sensor_recovery_listener(entity_id)

    def _setup_sensor_recovery_listener(self, group_name: str, entity_id: str) -> None:
        """Register a state change listener to automatically recover when sensor is back online."""
        if entity_id in self._listener_removers:
            return

        from homeassistant.helpers.event import async_track_state_change_event

        async def async_state_changed_listener(event: Any) -> None:
            new_state = event.data.get("new_state")
            if new_state is None or new_state.state in (None, "unavailable", "unknown"):
                return

            try:
                float(new_state.state)
            except (ValueError, TypeError):
                return

            _LOGGER.info(
                "Sensor '%s' for panel group '%s' came online. Re-running sensor audit...",
                entity_id,
                group_name,
            )
            self.hass.add_job(self.async_perform_sensor_audit)

        _LOGGER.debug("Registering recovery listener for sensor '%s'", entity_id)
        remove_listener = async_track_state_change_event(
            self.hass, [entity_id], async_state_changed_listener
        )
        self._listener_removers[entity_id] = remove_listener

    def _remove_sensor_recovery_listener(self, entity_id: str) -> None:
        """Remove recovery listener for a sensor if active."""
        remove_listener = self._listener_removers.pop(entity_id, None)
        if remove_listener:
            _LOGGER.debug("Removing recovery listener for sensor '%s'", entity_id)
            remove_listener()

    def cleanup(self) -> None:
        """Cleanup all active event listeners to prevent memory leaks."""
        for entity_id in list(self._listener_removers.keys()):
            self._remove_sensor_recovery_listener(entity_id)
