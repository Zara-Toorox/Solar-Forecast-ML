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
        """Validate one hourly group actual before it can enter persistence."""
        value = self._safe_float(delta)
        if value is None or not math.isfinite(value):
            _LOGGER.warning(
                "Rejected %s production for group '%s': invalid value %r",
                source,
                group_name,
                delta,
            )
            return None

        if value < -0.001:
            if source == "recorder backfill":
                self._recorder_backfill_negative_delta_counts[group_name] = (
                    self._recorder_backfill_negative_delta_counts.get(group_name, 0) + 1
                )
                _LOGGER.debug(
                    "Ignored %s production for group '%s': negative delta %.4f kWh",
                    source,
                    group_name,
                    value,
                )
                return None
            _LOGGER.warning(
                "Rejected %s production for group '%s': negative delta %.4f kWh",
                source,
                group_name,
                value,
            )
            return None

        value = max(0.0, value)
        max_hourly = self._max_hourly_kwh(group_name)
        if value > max_hourly:
            _LOGGER.warning(
                "Rejected %s production for group '%s': %.4f kWh exceeds %.1f kWh",
                source,
                group_name,
                value,
                max_hourly,
            )
            return None

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
                "stored current value as new baseline, no hourly delta learned",
                group_name,
                last_value,
                current_value,
            )
            await self._store_baseline(group_name, current_value)
            return None

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

        from datetime import timedelta

        cutoff = (SafeDateTimeUtil.now() - timedelta(days=days)).date().isoformat()
        filled = 0
        self._recorder_backfill_negative_delta_counts = {}

        for group in self.get_groups_with_sensors():
            group_name = group.get("name", "")
            entity_id = group.get("energy_sensor", "")
            if not entity_id:
                continue

            try:
                missing = await self.fetch_all(
                    """SELECT hp.prediction_id, hp.target_date, hp.target_hour
                       FROM hourly_predictions hp
                       JOIN prediction_panel_groups ppg
                         ON ppg.prediction_id = hp.prediction_id
                       WHERE ppg.group_name = ?
                         AND ppg.actual_kwh IS NULL
                         AND hp.target_date >= ?
                         AND hp.target_date < date('now')
                       ORDER BY hp.target_date, hp.target_hour""",
                    (group_name, cutoff),
                )

                if not missing:
                    continue

                first_date = missing[0][1]
                start_time = SafeDateTimeUtil.ensure_local(datetime.fromisoformat(f"{first_date}T00:00:00"))
                end_time = SafeDateTimeUtil.now()

                instance = get_instance(self.hass)
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

                if len(readings) < 2:
                    continue

                readings.sort(key=lambda x: x[0])

                group_filled = 0
                for prediction_id, target_date, target_hour in missing:
                    hour_start = datetime.fromisoformat(
                        f"{target_date}T{target_hour:02d}:00:00"
                    )
                    hour_end = datetime.fromisoformat(
                        f"{target_date}T{target_hour:02d}:59:59"
                    )

                    val_before = None
                    val_at_end = None

                    for ts, val in readings:
                        ts_naive = ts.replace(tzinfo=None) if ts.tzinfo else ts
                        if ts_naive <= hour_start:
                            val_before = val
                        if ts_naive <= hour_end:
                            val_at_end = val

                    if val_before is None or val_at_end is None:
                        continue

                    delta = self._validate_hourly_delta(
                        group_name,
                        val_at_end - val_before,
                        "recorder backfill",
                    )
                    if delta is None:
                        continue

                    await self.execute_query(
                        """UPDATE prediction_panel_groups
                           SET actual_kwh = ?
                           WHERE prediction_id = ? AND group_name = ?
                             AND actual_kwh IS NULL""",
                        (round(delta, 4), prediction_id, group_name),
                    )
                    group_filled += 1

                if group_filled > 0:
                    _LOGGER.info(
                        "Backfill %s: %d hours recovered from recorder",
                        group_name, group_filled,
                    )
                    filled += group_filled

            except Exception as e:
                _LOGGER.warning("Backfill failed for group %s: %s", group_name, e)

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
        total_actual: float,
        group_actuals: Dict[str, float],
        tolerance_percent: float = 15.0,
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

        group_sum = sum(group_actuals.values())
        allowed_diff = max(0.05, total_actual * tolerance_percent / 100.0)
        absolute_diff = abs(group_sum - total_actual)
        deviation = (
            absolute_diff / total_actual * 100
            if total_actual > 0
            else None
        )

        consistent = absolute_diff <= allowed_diff

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
            "group_sum": round(group_sum, 4),
            "total_actual": round(total_actual, 4),
            "deviation_percent": round(deviation, 1) if deviation is not None else None,
            "tolerance_percent": tolerance_percent,
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
