# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

# *****************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# Refactored: JSON replaced with DatabaseManager @zara
# *****************************************************************************

"""
Subspace sensor array base classes for Warp Core Simulation.
All sensors use TelemetryManager for warp field state persistence.
Cochrane field readings cached in coordinator for real-time bridge display.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfEnergy
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..const import (
    DOMAIN,
    INTEGRATION_MODEL,
    AI_VERSION,
    SOFTWARE_VERSION,
    # Configuration Keys
    CONF_SOLAR_YIELD_TODAY,
    CONF_TOTAL_CONSUMPTION_TODAY,
    # Coordinator Data Keys
    DATA_KEY_FORECAST_TODAY,
    DATA_KEY_FORECAST_DAY_AFTER,
    DATA_KEY_PRODUCTION_TIME,
    DATA_KEY_PEAK_TODAY,
    DATA_KEY_EXPECTED_DAILY_PRODUCTION,
    DATA_KEY_STATISTICS,
    # Sub-Keys
    PROD_TIME_DURATION_SECONDS,
    PEAK_TODAY_POWER_W,
    STATS_ALL_TIME_PEAK,
    STATS_CURRENT_MONTH,
    STATS_CURRENT_WEEK,
    STATS_LAST_7_DAYS,
    STATS_LAST_30_DAYS,
    STATS_AVG_ACCURACY,
    STATS_YIELD_KWH,
    STATS_AVG_YIELD_KWH,
    STATS_CONSUMPTION_KWH,
    # Cache Keys
    CACHE_HOURLY_PREDICTIONS,
    CACHE_PREDICTIONS,
    CACHE_PREDICTIONS_TOMORROW,
    CACHE_PREDICTIONS_DAY_AFTER,
    CACHE_BEST_HOUR_TODAY,
    # Prediction Keys
    PRED_TARGET_DATE,
    PRED_TARGET_HOUR,
    PRED_PREDICTION_KWH,
    PRED_PREDICTED_KWH,
)
from ..coordinator import SolarForecastMLCoordinator
from ..data.db_manager import DatabaseManager
from ..forecast.forecast_tfs_client import TFSClient

_LOGGER = logging.getLogger(__name__)


def _build_hourly_attributes(predictions: list) -> dict:
    """Build hourly forecast attributes from predictions list. @zara"""
    if not predictions:
        return {}

    sorted_preds = sorted(predictions, key=lambda p: p.get("target_hour", 0))
    hours = {}
    for pred in sorted_preds:
        hour = pred.get("target_hour")
        kwh = pred.get("prediction_kwh", 0.0)
        if hour is not None and isinstance(kwh, (int, float)):
            hours[f"{hour:02d}:00"] = round(kwh, 3)

    return {"hours": hours}


class BaseSolarSensor(CoordinatorEntity, SensorEntity):
    """Base class for core sensors updated by the coordinator. @zara"""

    _attr_has_entity_name = True

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the base sensor. @zara"""
        super().__init__(coordinator)
        self.entry = entry
        self._db: Optional[DatabaseManager] = None
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name="Solar Forecast ML",
            manufacturer="Zara-Toorox",
            model=INTEGRATION_MODEL,
            sw_version=f"SW {SOFTWARE_VERSION} | AI {AI_VERSION}",
            configuration_url="https://github.com/Zara-Toorox/ha-solar-forecast-ml",
        )

    @property
    def db_manager(self) -> Optional[DatabaseManager]:
        """Get database manager from coordinator. @zara"""
        if hasattr(self.coordinator, "data_manager") and self.coordinator.data_manager:
            return self.coordinator.data_manager._db_manager
        return None

    @property
    def available(self) -> bool:
        """Return if entity is available based on coordinator. @zara"""
        return self.coordinator.last_update_success and self.coordinator.data is not None


class SolarForecastSensor(SensorEntity):
    """Sensor for today's or tomorrow's solar forecast using DB. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry, key: str):
        """Initialize the forecast sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._key = key
        self._cached_tomorrow_value: float = 0.0
        self._production_time_entity_id: Optional[str] = None

        self._key_mapping = {
            "remaining": {"data_key": "prediction_kwh", "translation_key": "today_forecast"},
            "tomorrow": {"data_key": "forecast_tomorrow", "translation_key": "tomorrow_forecast"},
        }

        if key not in self._key_mapping:
            raise ValueError(f"Invalid sensor key: {key}. Must be 'remaining' or 'tomorrow'")

        config = self._key_mapping[key]
        self._data_key = config["data_key"]

        self._attr_unique_id = f"{entry.entry_id}_ml_forecast_{key}"
        self._attr_translation_key = config["translation_key"]
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:solar-power"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def db_manager(self) -> Optional[DatabaseManager]:
        """Get database manager from coordinator. @zara"""
        if hasattr(self._coordinator, "data_manager") and self._coordinator.data_manager:
            return self._coordinator.data_manager._db_manager
        return None

    @property
    def available(self) -> bool:
        """Return if entity is available. @zara"""
        return True

    async def _load_tomorrow_from_db(self) -> None:
        """Load tomorrow forecast directly from daily_forecasts DB table. @zara"""
        try:
            db = self._coordinator.data_manager._db_manager
            if not db:
                return
            from homeassistant.util import dt as dt_util
            tomorrow_str = (dt_util.now() + timedelta(days=1)).date().isoformat()
            row = await db.fetchone(
                """SELECT prediction_kwh FROM daily_forecasts
                   WHERE forecast_type = 'tomorrow' AND forecast_date = ?""",
                (tomorrow_str,)
            )
            if row and row[0] is not None:
                self._cached_tomorrow_value = round(float(row[0]), 2)
            elif self._coordinator.data:
                self._cached_tomorrow_value = self._coordinator.data.get(self._data_key) or 0.0
        except Exception as e:
            _LOGGER.warning("Failed to load tomorrow forecast from DB: %s", e)
            if self._coordinator.data:
                self._cached_tomorrow_value = self._coordinator.data.get(self._data_key) or 0.0

    @property
    def native_value(self) -> float:
        """Return the forecast value from DB. @zara"""
        if self._key == "tomorrow":
            return self._cached_tomorrow_value

        if not self.hass:
            return 0.0

        production_time_sensor = self.hass.states.get(self._production_time_entity_id) if self._production_time_entity_id else None
        if production_time_sensor and production_time_sensor.state == "00:00:00":
            return 0.0

        try:
            from homeassistant.util import dt as dt_util

            hourly_data = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
            if not hourly_data or not isinstance(hourly_data, dict):
                return 0.0

            predictions = hourly_data.get(CACHE_PREDICTIONS, [])
            if not predictions:
                return 0.0

            now = dt_util.now()
            current_hour = now.hour
            today_str = now.strftime("%Y-%m-%d")

            remaining_kwh = 0.0
            for pred in predictions:
                if (
                    pred.get(PRED_TARGET_DATE) == today_str
                    and pred.get(PRED_TARGET_HOUR, -1) >= current_hour
                ):
                    kwh = pred.get(PRED_PREDICTION_KWH) or pred.get(PRED_PREDICTED_KWH, 0.0)
                    remaining_kwh += kwh if kwh is not None else 0.0

            return round(remaining_kwh, 2)

        except Exception as e:
            _LOGGER.warning(f"Failed to calculate remaining from hourly predictions: {e}")
            return 0.0

    @property
    def extra_state_attributes(self) -> dict:
        """Return hourly forecast breakdown. @zara"""
        cache = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
        if not cache:
            return {}
        if self._key == "tomorrow":
            return _build_hourly_attributes(cache.get(CACHE_PREDICTIONS_TOMORROW, []))
        return _build_hourly_attributes(cache.get(CACHE_PREDICTIONS, []))

    async def async_added_to_hass(self) -> None:
        """Run when entity about to be added to hass. @zara"""
        await super().async_added_to_hass()

        if self._key == "tomorrow":
            await self._load_tomorrow_from_db()

        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))

        if self._key == "remaining":
            from homeassistant.helpers import entity_registry as er
            ent_reg = er.async_get(self.hass)
            self._production_time_entity_id = ent_reg.async_get_entity_id(
                "sensor", DOMAIN, f"{self.entry.entry_id}_ml_production_time"
            ) or f"sensor.{DOMAIN}_production_time"
            self.async_on_remove(
                async_track_state_change_event(
                    self.hass, self._production_time_entity_id, self._handle_production_time_change
                )
            )

        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        if self._key == "tomorrow":
            self.hass.async_create_task(self._reload_tomorrow_and_update())
        else:
            self.async_write_ha_state()

    async def _reload_tomorrow_and_update(self) -> None:
        """Reload tomorrow value from DB and update state. @zara"""
        await self._load_tomorrow_from_db()
        self.async_write_ha_state()

    @callback
    def _handle_production_time_change(self, event) -> None:
        """Handle production time sensor changes. @zara"""
        self.async_write_ha_state()


class NextHourSensor(SensorEntity):
    """Sensor for the next hour's solar forecast from DB. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the next hour sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None
        self._upcoming_hours: list = []

        self._attr_unique_id = f"{entry.entry_id}_ml_next_hour_forecast"
        self._attr_translation_key = "next_hour_forecast"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:clock-fast"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available with fallback value. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return next hour forecast or 0.0 if no data. @zara"""
        return self._cached_value if self._cached_value is not None else 0.0

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes showing all upcoming hours for the day. @zara"""
        if not self._upcoming_hours:
            return {}

        attributes = {}
        for i, hour_data in enumerate(self._upcoming_hours, start=1):
            attributes[f"hour_{i}"] = hour_data.get("kwh", 0.0)
            attributes[f"hour_{i}_time"] = hour_data.get("time", "")

        total_upcoming = sum(h.get("kwh", 0.0) for h in self._upcoming_hours)
        attributes["total_upcoming"] = round(total_upcoming, 2)
        attributes["hours_count"] = len(self._upcoming_hours)
        attributes["hours_list"] = self._upcoming_hours

        return attributes

    async def _load_from_db(self) -> None:
        """Load next hour forecast from coordinator cache. @zara"""
        try:
            from homeassistant.util import dt as dt_util

            hourly_data = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
            if not hourly_data or not isinstance(hourly_data, dict):
                self._cached_value = None
                self._upcoming_hours = []
                return

            predictions = hourly_data.get(CACHE_PREDICTIONS, [])
            if not predictions:
                self._cached_value = None
                self._upcoming_hours = []
                return

            now_local = dt_util.now()
            today = now_local.date().isoformat()
            current_hour = now_local.hour

            upcoming_predictions = [
                pred
                for pred in predictions
                if pred.get(PRED_TARGET_DATE) == today and pred.get(PRED_TARGET_HOUR, -1) > current_hour
            ]

            upcoming_predictions.sort(key=lambda p: p.get(PRED_TARGET_HOUR, 0))

            self._upcoming_hours = [
                {
                    "time": f"{pred.get(PRED_TARGET_HOUR, 0):02d}:00",
                    "kwh": pred.get(PRED_PREDICTION_KWH, 0.0),
                }
                for pred in upcoming_predictions
            ]

            if upcoming_predictions:
                self._cached_value = upcoming_predictions[0].get(PRED_PREDICTION_KWH, 0.0)
            else:
                self._cached_value = 0.0

        except Exception as e:
            _LOGGER.warning(f"Failed to load NextHourSensor: {e}")
            self._cached_value = None
            self._upcoming_hours = []

    async def async_added_to_hass(self) -> None:
        """Setup sensor with DB loading. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class PeakProductionHourSensor(SensorEntity):
    """Sensor showing best production hour. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the peak hour sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[str] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_peak_production_hour"
        self._attr_translation_key = "peak_production_hour"
        self._attr_icon = "mdi:solar-power-variant-outline"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available with fallback. @zara"""
        return True

    @property
    def native_value(self) -> str:
        """Return peak hour or '--:--' if no data. @zara"""
        return self._cached_value if self._cached_value is not None else "--:--"

    async def _load_from_db(self) -> None:
        """Load best hour from coordinator cache. @zara"""
        try:
            hourly_data = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
            if not hourly_data:
                self._cached_value = None
                return

            best_hour_data = hourly_data.get(CACHE_BEST_HOUR_TODAY, {})
            if best_hour_data:
                hour = best_hour_data.get("hour")
                if hour is not None:
                    self._cached_value = f"{hour:02d}:00"
                    return

            self._cached_value = None

        except Exception as e:
            _LOGGER.warning(f"Failed to load PeakProductionHourSensor: {e}")
            self._cached_value = None

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class AverageYieldSensor(BaseSolarSensor):
    """Sensor for the calculated average monthly yield. @zara"""

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the average yield sensor. @zara"""
        super().__init__(coordinator, entry)
        self._attr_unique_id = f"{entry.entry_id}_ml_average_yield"
        self._attr_translation_key = "average_yield"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:chart-line"

    @property
    def native_value(self) -> Optional[float]:
        """Return the average monthly yield. @zara"""
        value = getattr(self.coordinator, "avg_month_yield", None)
        return value if value is not None and value > 0 else None


class ExpectedDailyProductionSensor(SensorEntity):
    """Sensor for expected daily production morning snapshot using DB. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the expected daily production sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_expected_daily_production"
        self._attr_translation_key = "expected_daily_production"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:solar-power-variant"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        """Return cached value. @zara"""
        return self._cached_value

    @property
    def extra_state_attributes(self) -> dict:
        """Return hourly forecast breakdown for today. @zara"""
        cache = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
        if not cache:
            return {}
        return _build_hourly_attributes(cache.get(CACHE_PREDICTIONS, []))

    async def _load_from_db(self) -> None:
        """Load expected daily production from DB via coordinator. @zara"""
        try:
            db = getattr(self._coordinator, "db_manager", None)
            if db:
                state = await db.get_coordinator_state()
                if state:
                    self._cached_value = state.get(DATA_KEY_EXPECTED_DAILY_PRODUCTION)
                    return

            # Fallback to coordinator data
            if self._coordinator.data:
                self._cached_value = self._coordinator.data.get(DATA_KEY_EXPECTED_DAILY_PRODUCTION)
        except Exception as e:
            _LOGGER.warning(f"Failed to load ExpectedDailyProductionSensor: {e}")
            self._cached_value = None

    async def async_added_to_hass(self) -> None:
        """Setup sensor with DB loading. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class ConservativePlanningForecastSensor(SensorEntity):
    """Read-only conservative planning sensor blending SFML with TFS P10. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _sfml_weight = 0.65
    _tfs_weight = 0.35

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the conservative planning forecast sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None
        self._hourly_values: Dict[str, float] = {}
        self._hourly_group_values: Dict[str, Dict[str, float]] = {}
        self._group_totals: Dict[str, float] = {}
        self._tfs_available = False
        self._tfs_client: Optional[TFSClient] = None
        self._forecast_locked = False
        self._forecast_lock_source: Optional[str] = None
        self._forecast_locked_at: Optional[str] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_conservative_planning_forecast"
        self._attr_translation_key = "conservative_planning_forecast"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:shield-sun"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        """Return cached value. @zara"""
        return self._cached_value

    @property
    def extra_state_attributes(self) -> dict:
        """Return hourly and per-group conservative planning values. @zara"""
        if self._cached_value is None:
            return {
                "blend_mode": "sfml_p50_tfs_p10_weighted",
                "blend_ratio": {"sfml": self._sfml_weight, "tfs_p10": self._tfs_weight},
                "tfs_available": self._tfs_available,
                "forecast_locked": self._forecast_locked,
                "forecast_lock_source": self._forecast_lock_source,
                "forecast_locked_at": self._forecast_locked_at,
                "hourly_forecast": {},
                "hourly_panel_groups": {},
                "panel_group_totals": {},
            }

        return {
            "blend_mode": "sfml_p50_tfs_p10_weighted",
            "blend_ratio": {"sfml": self._sfml_weight, "tfs_p10": self._tfs_weight},
            "tfs_available": self._tfs_available,
            "forecast_locked": self._forecast_locked,
            "forecast_lock_source": self._forecast_lock_source,
            "forecast_locked_at": self._forecast_locked_at,
            "hourly_forecast": self._hourly_values,
            "hourly_panel_groups": self._hourly_group_values,
            "panel_group_totals": self._group_totals,
            "hours": self._hourly_values,
        }

    def _parse_tfs_hourly_p10(self, response: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Parse TFS response into hour -> p10/group-p10 mapping. @zara"""
        result: Dict[str, Dict[str, Any]] = {}
        for hour_data in response.get("hours", []):
            hour_key = hour_data.get("hour", "")
            if not hour_key:
                continue

            entry: Dict[str, Any] = {"p10": float(hour_data.get("p10", 0.0) or 0.0)}
            groups = hour_data.get("groups")
            if groups:
                entry["groups"] = [
                    {"name": group.get("name", ""), "p10": float(group.get("p10", 0.0) or 0.0)}
                    for group in groups
                ]
            result[hour_key] = entry

        return result

    async def _load_sfml_hourly_panel_groups(self, today_str: str) -> list[Dict[str, Any]]:
        """Load today's SFML hourly predictions with panel groups directly from DB. @zara"""
        try:
            db = getattr(getattr(self._coordinator, "data_manager", None), "_db_manager", None)
            if db is None:
                return []

            rows = await db.fetchall(
                """SELECT hp.target_hour, ppg.group_name, ppg.prediction_kwh
                   FROM hourly_predictions hp
                   JOIN prediction_panel_groups ppg ON ppg.prediction_id = hp.prediction_id
                   WHERE hp.target_date = ?
                   ORDER BY hp.target_hour, ppg.group_name""",
                (today_str,),
            )
            if not rows:
                return []

            by_hour: Dict[int, Dict[str, Any]] = {}
            for row in rows:
                hour = int(row[0])
                group_name = str(row[1])
                prediction_kwh = float(row[2] or 0.0)

                if hour not in by_hour:
                    by_hour[hour] = {
                        PRED_TARGET_DATE: today_str,
                        PRED_TARGET_HOUR: hour,
                        "panel_group_predictions": {},
                    }

                by_hour[hour]["panel_group_predictions"][group_name] = prediction_kwh

            return [by_hour[hour] for hour in sorted(by_hour)]
        except Exception as e:
            _LOGGER.warning(
                "ConservativePlanningForecastSensor: failed to load SFML hourly panel groups: %s",
                e,
            )
            return []

    async def _load_today_forecast_lock_state(self, today_str: str) -> bool:
        """Load lock state from today's official SFML forecast row. @zara"""
        self._forecast_locked = False
        self._forecast_lock_source = None
        self._forecast_locked_at = None

        try:
            db = getattr(getattr(self._coordinator, "data_manager", None), "_db_manager", None)
            if db is None:
                return False

            row = await db.fetchone(
                """SELECT locked, source, locked_at
                   FROM daily_forecasts
                   WHERE forecast_type = 'today' AND forecast_date = ?
                   LIMIT 1""",
                (today_str,),
            )
            if not row:
                return False

            self._forecast_locked = bool(row[0])
            self._forecast_lock_source = str(row[1]) if row[1] is not None else None
            self._forecast_locked_at = str(row[2]) if row[2] is not None else None
            return self._forecast_locked
        except Exception as e:
            _LOGGER.warning(
                "ConservativePlanningForecastSensor: failed to load forecast lock state: %s",
                e,
            )
            return False

    @staticmethod
    def _map_tfs_groups(
        tfs_group_list: list[Dict[str, Any]],
        sfml_group_predictions: Dict[str, float],
    ) -> Dict[str, float]:
        """Map TFS group values onto SFML group names. @zara"""
        sfml_group_names = list(sfml_group_predictions.keys())
        tfs_by_name = {
            str(group.get("name", "")): float(group.get("p10", 0.0) or 0.0)
            for group in tfs_group_list
        }

        result: Dict[str, float] = {}
        for index, group_name in enumerate(sfml_group_names):
            if group_name in tfs_by_name:
                result[group_name] = tfs_by_name[group_name]
            elif index < len(tfs_group_list):
                result[group_name] = float(tfs_group_list[index].get("p10", 0.0) or 0.0)

        return result

    async def _ensure_tracking_columns(self) -> bool:
        """Ensure conservative planning columns exist on tracking table. @zara"""
        try:
            db = getattr(getattr(self._coordinator, "data_manager", None), "_db_manager", None)
            if db is None:
                return False

            row = await db.fetchone(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_forecast_tracking'"
            )
            if not row:
                return False

            columns = await db.fetchall("PRAGMA table_info(daily_forecast_tracking)")
            column_names = {column[1] for column in columns}

            if "conservative_planning_forecast_kwh" not in column_names:
                await db.execute(
                    "ALTER TABLE daily_forecast_tracking ADD COLUMN conservative_planning_forecast_kwh REAL"
                )
            if "conservative_planning_forecast_updated_at" not in column_names:
                await db.execute(
                    "ALTER TABLE daily_forecast_tracking ADD COLUMN conservative_planning_forecast_updated_at TIMESTAMP"
                )
            if "conservative_planning_forecast_hours_json" not in column_names:
                await db.execute(
                    "ALTER TABLE daily_forecast_tracking ADD COLUMN conservative_planning_forecast_hours_json TEXT"
                )
            if "conservative_planning_forecast_panel_groups_json" not in column_names:
                await db.execute(
                    "ALTER TABLE daily_forecast_tracking ADD COLUMN conservative_planning_forecast_panel_groups_json TEXT"
                )
            if "conservative_planning_forecast_group_totals_json" not in column_names:
                await db.execute(
                    "ALTER TABLE daily_forecast_tracking ADD COLUMN conservative_planning_forecast_group_totals_json TEXT"
                )

            return True
        except Exception as e:
            _LOGGER.warning("Failed to ensure conservative planning tracking columns: %s", e)
            return False

    async def _load_persisted_value(self, today_str: str) -> Optional[float]:
        """Load persisted conservative planning value for today. @zara"""
        try:
            db = getattr(getattr(self._coordinator, "data_manager", None), "_db_manager", None)
            if db is None:
                return None

            if not await self._ensure_tracking_columns():
                return None

            row = await db.fetchone(
                """SELECT conservative_planning_forecast_kwh,
                          conservative_planning_forecast_hours_json,
                          conservative_planning_forecast_panel_groups_json,
                          conservative_planning_forecast_group_totals_json
                   FROM daily_forecast_tracking
                   WHERE id = 1 AND date = ?""",
                (today_str,),
            )
            if row and row[0] is not None:
                self._hourly_values = json.loads(row[1]) if row[1] else {}
                self._hourly_group_values = json.loads(row[2]) if row[2] else {}
                self._group_totals = json.loads(row[3]) if row[3] else {}
                self._tfs_available = bool(self._hourly_values)
                return round(float(row[0]), 2)
            return None
        except Exception as e:
            _LOGGER.warning("Failed to load persisted conservative planning value: %s", e)
            return None

    async def _persist_final_value(self, today_str: str, value: float) -> None:
        """Persist final conservative value plus planning attributes. @zara"""
        try:
            from homeassistant.util import dt as dt_util

            db = getattr(getattr(self._coordinator, "data_manager", None), "_db_manager", None)
            if db is None:
                return

            if not await self._ensure_tracking_columns():
                return

            timestamp = dt_util.now().isoformat()
            await db.execute(
                """INSERT INTO daily_forecast_tracking
                   (id, date, conservative_planning_forecast_kwh,
                    conservative_planning_forecast_updated_at,
                    conservative_planning_forecast_hours_json,
                    conservative_planning_forecast_panel_groups_json,
                    conservative_planning_forecast_group_totals_json,
                    last_updated)
                   VALUES (1, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                       date = excluded.date,
                       conservative_planning_forecast_kwh = excluded.conservative_planning_forecast_kwh,
                       conservative_planning_forecast_updated_at = excluded.conservative_planning_forecast_updated_at,
                       conservative_planning_forecast_hours_json = excluded.conservative_planning_forecast_hours_json,
                       conservative_planning_forecast_panel_groups_json = excluded.conservative_planning_forecast_panel_groups_json,
                       conservative_planning_forecast_group_totals_json = excluded.conservative_planning_forecast_group_totals_json,
                       last_updated = excluded.last_updated""",
                (
                    today_str,
                    round(value, 2),
                    timestamp,
                    json.dumps(self._hourly_values),
                    json.dumps(self._hourly_group_values),
                    json.dumps(self._group_totals),
                    timestamp,
                ),
            )
        except Exception as e:
            _LOGGER.warning("Failed to persist conservative planning value: %s", e)

    async def _fetch_tfs_quantiles(self) -> Optional[Dict[str, Any]]:
        """Fetch TFS quantiles directly from the dedicated endpoint. @zara"""
        try:
            if self.hass is None:
                return None

            base_url = getattr(self._tfs_client, "_base_url", "http://127.0.0.1:8780")
            session = async_get_clientsession(self.hass)
            async with session.get(
                f"{base_url}/api/forecast/quantiles",
                timeout=30,
            ) as resp:
                if resp.status != 200:
                    _LOGGER.warning(
                        "ConservativePlanningForecastSensor: TFS quantiles returned HTTP %s",
                        resp.status,
                    )
                    return None
                return await resp.json()
        except Exception as e:
            _LOGGER.warning(
                "ConservativePlanningForecastSensor: failed to fetch TFS quantiles: %s",
                e,
            )
            return None

    async def _load_from_sources(self) -> None:
        """Load and blend conservative planning values from SFML cache and TFS. @zara"""
        self._cached_value = None
        self._hourly_values = {}
        self._hourly_group_values = {}
        self._group_totals = {}
        self._tfs_available = False
        self._forecast_locked = False
        self._forecast_lock_source = None
        self._forecast_locked_at = None

        try:
            from homeassistant.util import dt as dt_util

            today_str = dt_util.now().date().isoformat()
            is_locked = await self._load_today_forecast_lock_state(today_str)
            persisted_value = await self._load_persisted_value(today_str)

            if is_locked and persisted_value is not None:
                self._cached_value = persisted_value
                return

            if not is_locked:
                self._cached_value = persisted_value
                return

            predictions = await self._load_sfml_hourly_panel_groups(today_str)
            if not predictions:
                self._cached_value = persisted_value
                return

            if self._tfs_client is None:
                self._tfs_client = TFSClient(self.hass)

            tfs_response = await self._fetch_tfs_quantiles()
            if not tfs_response:
                self._cached_value = persisted_value
                return

            tfs_hourly = self._parse_tfs_hourly_p10(tfs_response)
            if not tfs_hourly:
                self._cached_value = persisted_value
                return

            if not any(
                (hour_data.get("p10") or 0.0) > 0
                or any((group.get("p10") or 0.0) > 0 for group in hour_data.get("groups", []))
                for hour_data in tfs_hourly.values()
            ):
                _LOGGER.warning(
                    "ConservativePlanningForecastSensor: TFS response contains no p10 values for forecast_type=sfml"
                )
                self._cached_value = persisted_value
                return

            hourly_totals: Dict[str, float] = {}
            hourly_group_values: Dict[str, Dict[str, float]] = {}
            group_totals: Dict[str, float] = {}

            for prediction in predictions:
                if prediction.get(PRED_TARGET_DATE) != today_str:
                    continue

                hour = prediction.get(PRED_TARGET_HOUR)
                group_predictions = prediction.get("panel_group_predictions") or {}
                if hour is None or not group_predictions:
                    continue

                hour_key = f"{today_str}T{int(hour):02d}:00:00"
                tfs_hour_data = tfs_hourly.get(hour_key)
                tfs_group_list = tfs_hour_data.get("groups") if tfs_hour_data else None
                if not tfs_group_list:
                    continue

                sfml_groups = {
                    str(group_name): float(group_kwh or 0.0)
                    for group_name, group_kwh in group_predictions.items()
                }
                tfs_groups = self._map_tfs_groups(tfs_group_list, sfml_groups)
                if not tfs_groups:
                    continue

                blended_groups: Dict[str, float] = {}
                for group_name, sfml_value in sfml_groups.items():
                    if group_name not in tfs_groups:
                        continue

                    blended_value = round(
                        (sfml_value * self._sfml_weight)
                        + (tfs_groups[group_name] * self._tfs_weight),
                        4,
                    )
                    blended_groups[group_name] = blended_value
                    group_totals[group_name] = round(
                        group_totals.get(group_name, 0.0) + blended_value,
                        4,
                    )

                if not blended_groups:
                    continue

                hour_label = f"{int(hour):02d}:00"
                hourly_total = round(sum(blended_groups.values()), 4)
                hourly_totals[hour_label] = hourly_total
                hourly_group_values[hour_label] = blended_groups

            if not hourly_totals:
                return

            self._tfs_available = True
            self._cached_value = round(sum(hourly_totals.values()), 2)
            self._hourly_values = {
                hour_label: round(value, 3)
                for hour_label, value in hourly_totals.items()
            }
            self._hourly_group_values = {
                hour_label: {
                    group_name: round(value, 4)
                    for group_name, value in group_values.items()
                }
                for hour_label, group_values in hourly_group_values.items()
            }
            self._group_totals = {
                group_name: round(value, 3)
                for group_name, value in group_totals.items()
            }
            await self._persist_final_value(today_str, self._cached_value)

        except Exception as e:
            _LOGGER.warning("Failed to load ConservativePlanningForecastSensor: %s", e)
            try:
                from homeassistant.util import dt as dt_util

                fallback_date = dt_util.now().date().isoformat()
                await self._load_today_forecast_lock_state(fallback_date)
                self._cached_value = await self._load_persisted_value(fallback_date)
            except Exception:
                self._cached_value = None
            self._hourly_values = {}
            self._hourly_group_values = {}
            self._group_totals = {}
            self._tfs_available = False

    async def async_added_to_hass(self) -> None:
        """Setup sensor with coordinator listener. @zara"""
        await super().async_added_to_hass()
        self._tfs_client = TFSClient(self.hass)
        await self._load_from_sources()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_sources()
        self.async_write_ha_state()


class ProductionTimeSensor(SensorEntity):
    """Sensor for production time today from DB. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the production time sensor. @zara"""
        self.entry = entry
        self._coordinator = coordinator
        self._cached_value: Optional[str] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_production_time"
        self._attr_translation_key = "production_time"
        self._attr_icon = "mdi:timer-outline"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[str]:
        """Return cached value. @zara"""
        return self._cached_value

    async def _load_from_db(self) -> None:
        """Load production time from coordinator data. @zara"""
        try:
            # Production time is calculated and cached by coordinator
            if self._coordinator.data:
                production_time = self._coordinator.data.get(DATA_KEY_PRODUCTION_TIME, {})
                duration_seconds = production_time.get(PROD_TIME_DURATION_SECONDS, 0)

                hours, remainder = divmod(duration_seconds, 3600)
                minutes, seconds = divmod(remainder, 60)
                self._cached_value = f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"
            else:
                self._cached_value = "00:00:00"
        except Exception as e:
            _LOGGER.warning(f"Failed to load ProductionTimeSensor: {e}")
            self._cached_value = None

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class MaxPeakTodaySensor(SensorEntity):
    """Sensor for today's maximum power peak. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the max peak today sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_max_peak_today"
        self._attr_translation_key = "max_peak_today"
        self._attr_native_unit_of_measurement = "W"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_device_class = SensorDeviceClass.POWER
        self._attr_icon = "mdi:lightning-bolt"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return max peak or 0 if no data. @zara"""
        return self._cached_value if self._cached_value is not None else 0.0

    async def _load_from_db(self) -> None:
        """Load max peak today from coordinator data. @zara"""
        try:
            if self._coordinator.data:
                peak_today = self._coordinator.data.get(DATA_KEY_PEAK_TODAY, {})
                self._cached_value = peak_today.get(PEAK_TODAY_POWER_W, 0.0)
            else:
                self._cached_value = 0.0
        except Exception as e:
            _LOGGER.warning(f"Failed to load MaxPeakTodaySensor: {e}")
            self._cached_value = 0.0

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class MaxPeakAllTimeSensor(SensorEntity):
    """Sensor for all-time maximum power peak. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the max peak all time sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None
        self._cached_date: Optional[str] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_max_peak_all_time"
        self._attr_translation_key = "max_peak_all_time"
        self._attr_native_unit_of_measurement = "W"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_device_class = SensorDeviceClass.POWER
        self._attr_icon = "mdi:lightning-bolt-circle"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return max peak all time or 0 if no data. @zara"""
        return self._cached_value if self._cached_value is not None else 0.0

    @property
    def extra_state_attributes(self) -> dict:
        """Return additional attributes. @zara"""
        if self._cached_date:
            return {"date": self._cached_date}
        return {}

    async def _load_from_db(self) -> None:
        """Load all-time peak from coordinator data. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                all_time_peak = statistics.get(STATS_ALL_TIME_PEAK, {})
                self._cached_value = all_time_peak.get(PEAK_TODAY_POWER_W, 0.0)
                self._cached_date = all_time_peak.get("date")
            else:
                self._cached_value = 0.0
        except Exception as e:
            _LOGGER.warning(f"Failed to load MaxPeakAllTimeSensor: {e}")
            self._cached_value = 0.0

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class ForecastDayAfterTomorrowSensor(SensorEntity):
    """Sensor for day after tomorrow's solar forecast. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the day after tomorrow sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_forecast_day_after_tomorrow"
        self._attr_translation_key = "forecast_day_after_tomorrow"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:calendar-arrow-right"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        """Return cached value. @zara"""
        return self._cached_value

    @property
    def extra_state_attributes(self) -> dict:
        """Return hourly forecast breakdown for day after tomorrow. @zara"""
        cache = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
        if not cache:
            return {}
        return _build_hourly_attributes(cache.get(CACHE_PREDICTIONS_DAY_AFTER, []))

    async def _load_from_db(self) -> None:
        """Load day after tomorrow forecast directly from daily_forecasts DB table. @zara"""
        try:
            db = self._coordinator.data_manager._db_manager
            if not db:
                return
            from homeassistant.util import dt as dt_util
            day_after_str = (dt_util.now() + timedelta(days=2)).date().isoformat()
            row = await db.fetchone(
                """SELECT prediction_kwh FROM daily_forecasts
                   WHERE forecast_type = 'day_after_tomorrow' AND forecast_date = ?""",
                (day_after_str,)
            )
            if row and row[0] is not None:
                self._cached_value = round(float(row[0]), 2)
            elif self._coordinator.data:
                day_after = self._coordinator.data.get(DATA_KEY_FORECAST_DAY_AFTER)
                if isinstance(day_after, (int, float)):
                    self._cached_value = float(day_after)
                elif isinstance(day_after, dict):
                    self._cached_value = day_after.get(PRED_PREDICTION_KWH)
        except Exception as e:
            _LOGGER.warning("Failed to load ForecastDayAfterTomorrowSensor from DB: %s", e)
            self._cached_value = None

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class MonthlyYieldSensor(SensorEntity):
    """Sensor for current month's total yield. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the monthly yield sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: float = 0.0

        self._attr_unique_id = f"{entry.entry_id}_ml_monthly_yield"
        self._attr_translation_key = "monthly_yield"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:calendar-month"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available, shows 0.0 if no data. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return value or 0.0 if None. @zara"""
        return self._cached_value

    async def _load_from_db(self) -> None:
        """Load monthly yield from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                current_month = statistics.get(STATS_CURRENT_MONTH, {})
                self._cached_value = current_month.get(STATS_YIELD_KWH, 0.0)
        except Exception as e:
            _LOGGER.warning(f"Failed to load MonthlyYieldSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class MonthlyConsumptionSensor(SensorEntity):
    """Sensor for current month's total consumption. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the monthly consumption sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: float = 0.0

        self._attr_unique_id = f"{entry.entry_id}_ml_monthly_consumption"
        self._attr_translation_key = "monthly_consumption"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:home-lightning-bolt"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available, shows 0.0 if no data. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return value or 0.0 if None. @zara"""
        return self._cached_value

    async def _load_from_db(self) -> None:
        """Load monthly consumption from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                current_month = statistics.get(STATS_CURRENT_MONTH, {})
                self._cached_value = current_month.get(STATS_CONSUMPTION_KWH, 0.0)
        except Exception as e:
            _LOGGER.warning(f"Failed to load MonthlyConsumptionSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class WeeklyYieldSensor(SensorEntity):
    """Sensor for current week's total yield. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the weekly yield sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: float = 0.0

        self._attr_unique_id = f"{entry.entry_id}_ml_weekly_yield"
        self._attr_translation_key = "weekly_yield"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:calendar-week"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available, shows 0.0 if no data. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return value or 0.0 if None. @zara"""
        return self._cached_value

    async def _load_from_db(self) -> None:
        """Load weekly yield from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                current_week = statistics.get(STATS_CURRENT_WEEK, {})
                self._cached_value = current_week.get(STATS_YIELD_KWH, 0.0)
        except Exception as e:
            _LOGGER.warning(f"Failed to load WeeklyYieldSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class WeeklyConsumptionSensor(SensorEntity):
    """Sensor for current week's total consumption. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the weekly consumption sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: float = 0.0

        self._attr_unique_id = f"{entry.entry_id}_ml_weekly_consumption"
        self._attr_translation_key = "weekly_consumption"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.TOTAL
        self._attr_device_class = SensorDeviceClass.ENERGY
        self._attr_icon = "mdi:home-lightning-bolt-outline"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Always available, shows 0.0 if no data. @zara"""
        return True

    @property
    def native_value(self) -> float:
        """Return value or 0.0 if None. @zara"""
        return self._cached_value

    async def _load_from_db(self) -> None:
        """Load weekly consumption from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                current_week = statistics.get(STATS_CURRENT_WEEK, {})
                self._cached_value = current_week.get(STATS_CONSUMPTION_KWH, 0.0)
        except Exception as e:
            _LOGGER.warning(f"Failed to load WeeklyConsumptionSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class AverageYield7DaysSensor(SensorEntity):
    """Sensor for average daily yield over last 7 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the average yield 7 days sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_avg_yield_7d"
        self._attr_translation_key = "avg_yield_7d"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:chart-line"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        """Return cached value. @zara"""
        return self._cached_value

    @property
    def extra_state_attributes(self) -> dict:
        """Return transparency metrics for the last 7-day window. @zara"""
        statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {}) if self._coordinator.data else {}
        last_7d = statistics.get(STATS_LAST_7_DAYS, {})
        return {
            "avg_accuracy_percent": last_7d.get(STATS_AVG_ACCURACY),
            "evaluation_coverage_percent": last_7d.get("avg_evaluation_coverage_percent"),
            "avg_excluded_mppt_hours": last_7d.get("avg_excluded_mppt_hours"),
            "total_yield_kwh": last_7d.get("total_yield_kwh"),
            "calculated_at": last_7d.get("calculated_at"),
        }

    async def _load_from_db(self) -> None:
        """Load average yield 7 days from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_7d = statistics.get(STATS_LAST_7_DAYS, {})
                self._cached_value = last_7d.get(STATS_AVG_YIELD_KWH)
        except Exception as e:
            _LOGGER.warning(f"Failed to load AverageYield7DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class AverageYield30DaysSensor(SensorEntity):
    """Sensor for average daily yield over last 30 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the average yield 30 days sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_avg_yield_30d"
        self._attr_translation_key = "avg_yield_30d"
        self._attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:chart-bar"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        """Return cached value. @zara"""
        return self._cached_value

    @property
    def extra_state_attributes(self) -> dict:
        """Return transparency metrics for the last 30-day window. @zara"""
        statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {}) if self._coordinator.data else {}
        last_30d = statistics.get(STATS_LAST_30_DAYS, {})
        return {
            "avg_accuracy_percent": last_30d.get(STATS_AVG_ACCURACY),
            "evaluation_coverage_percent": last_30d.get("avg_evaluation_coverage_percent"),
            "avg_excluded_mppt_hours": last_30d.get("avg_excluded_mppt_hours"),
            "total_yield_kwh": last_30d.get("total_yield_kwh"),
            "calculated_at": last_30d.get("calculated_at"),
        }

    async def _load_from_db(self) -> None:
        """Load average yield 30 days from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_30d = statistics.get(STATS_LAST_30_DAYS, {})
                self._cached_value = last_30d.get(STATS_AVG_YIELD_KWH)
        except Exception as e:
            _LOGGER.warning(f"Failed to load AverageYield30DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class AverageAccuracy30DaysSensor(SensorEntity):
    """Sensor for average accuracy over last 30 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the average accuracy 30 days sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_avg_accuracy_30d"
        self._attr_translation_key = "avg_accuracy_30d"
        self._attr_native_unit_of_measurement = PERCENTAGE
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:target"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        """Return cached value. @zara"""
        return self._cached_value

    @property
    def extra_state_attributes(self) -> dict:
        """Return clean-evaluation transparency for the 30-day accuracy window. @zara"""
        statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {}) if self._coordinator.data else {}
        last_30d = statistics.get(STATS_LAST_30_DAYS, {})
        last_7d = statistics.get(STATS_LAST_7_DAYS, {})
        return {
            "evaluation_coverage_percent_30d": last_30d.get("avg_evaluation_coverage_percent"),
            "avg_excluded_mppt_hours_30d": last_30d.get("avg_excluded_mppt_hours"),
            "avg_yield_kwh_30d": last_30d.get(STATS_AVG_YIELD_KWH),
            "evaluation_coverage_percent_7d": last_7d.get("avg_evaluation_coverage_percent"),
            "avg_excluded_mppt_hours_7d": last_7d.get("avg_excluded_mppt_hours"),
            "avg_yield_kwh_7d": last_7d.get(STATS_AVG_YIELD_KWH),
            "calculated_at": last_30d.get("calculated_at"),
        }

    async def _load_from_db(self) -> None:
        """Load average accuracy 30 days from coordinator. @zara"""
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_30d = statistics.get(STATS_LAST_30_DAYS, {})
                self._cached_value = last_30d.get(STATS_AVG_ACCURACY)
        except Exception as e:
            _LOGGER.warning(f"Failed to load AverageAccuracy30DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        """Reload value and update state. @zara"""
        await self._load_from_db()
        self.async_write_ha_state()


class EvaluationCoverage7DaysSensor(SensorEntity):
    """Sensor for average forecast evaluation coverage over last 7 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_evaluation_coverage_7d"
        self._attr_translation_key = "evaluation_coverage_7d"
        self._attr_native_unit_of_measurement = PERCENTAGE
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:chart-donut"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def available(self) -> bool:
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        return self._cached_value

    async def _load_from_db(self) -> None:
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_7d = statistics.get(STATS_LAST_7_DAYS, {})
                self._cached_value = last_7d.get("avg_evaluation_coverage_percent")
        except Exception as e:
            _LOGGER.warning(f"Failed to load EvaluationCoverage7DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        await self._load_from_db()
        self.async_write_ha_state()


class EvaluationCoverage30DaysSensor(SensorEntity):
    """Sensor for average forecast evaluation coverage over last 30 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_evaluation_coverage_30d"
        self._attr_translation_key = "evaluation_coverage_30d"
        self._attr_native_unit_of_measurement = PERCENTAGE
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:chart-arc"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def available(self) -> bool:
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        return self._cached_value

    async def _load_from_db(self) -> None:
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_30d = statistics.get(STATS_LAST_30_DAYS, {})
                self._cached_value = last_30d.get("avg_evaluation_coverage_percent")
        except Exception as e:
            _LOGGER.warning(f"Failed to load EvaluationCoverage30DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        await self._load_from_db()
        self.async_write_ha_state()


class ExcludedMpptHours7DaysSensor(SensorEntity):
    """Sensor for average excluded MPPT hours over last 7 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_excluded_mppt_hours_7d"
        self._attr_translation_key = "excluded_mppt_hours_7d"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:transmission-tower-off"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def available(self) -> bool:
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        return self._cached_value

    async def _load_from_db(self) -> None:
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_7d = statistics.get(STATS_LAST_7_DAYS, {})
                self._cached_value = last_7d.get("avg_excluded_mppt_hours")
        except Exception as e:
            _LOGGER.warning(f"Failed to load ExcludedMpptHours7DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        await self._load_from_db()
        self.async_write_ha_state()


class ExcludedMpptHours30DaysSensor(SensorEntity):
    """Sensor for average excluded MPPT hours over last 30 days. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        self._coordinator = coordinator
        self.entry = entry
        self._cached_value: Optional[float] = None

        self._attr_unique_id = f"{entry.entry_id}_ml_excluded_mppt_hours_30d"
        self._attr_translation_key = "excluded_mppt_hours_30d"
        self._attr_state_class = SensorStateClass.MEASUREMENT
        self._attr_icon = "mdi:transmission-tower-export"
        self._attr_suggested_display_precision = 2
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def available(self) -> bool:
        return self._cached_value is not None

    @property
    def native_value(self) -> Optional[float]:
        return self._cached_value

    async def _load_from_db(self) -> None:
        try:
            if self._coordinator.data:
                statistics = self._coordinator.data.get(DATA_KEY_STATISTICS, {})
                last_30d = statistics.get(STATS_LAST_30_DAYS, {})
                self._cached_value = last_30d.get("avg_excluded_mppt_hours")
        except Exception as e:
            _LOGGER.warning(f"Failed to load ExcludedMpptHours30DaysSensor: {e}")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        await self._load_from_db()
        self.async_on_remove(self._coordinator.async_add_listener(self._handle_coordinator_update))
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        self.hass.async_create_task(self._reload_and_update())

    async def _reload_and_update(self) -> None:
        await self._load_from_db()
        self.async_write_ha_state()


class EvccForecastSensor(SensorEntity):
    """Sensor providing solar forecast data in evcc-compatible JSON format. @zara

    Outputs hourly forecast data as a JSON array in extra_state_attributes['forecast']
    with the format evcc expects: [{"start": "...", "end": "...", "value": <watts>}, ...]
    """

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator: SolarForecastMLCoordinator, entry: ConfigEntry):
        """Initialize the evcc forecast sensor. @zara"""
        self._coordinator = coordinator
        self.entry = entry

        self._attr_unique_id = f"{entry.entry_id}_ml_evcc_forecast"
        self._attr_translation_key = "evcc_forecast"
        self._attr_icon = "mdi:ev-station"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )

    @property
    def available(self) -> bool:
        """Sensor availability. @zara"""
        return True

    @property
    def native_value(self) -> str:
        """Return number of forecast slots as state. @zara"""
        forecast = self._build_evcc_forecast()
        return f"{len(forecast)} slots"

    @property
    def extra_state_attributes(self) -> dict:
        """Return evcc-compatible forecast JSON array. @zara"""
        return {"forecast": self._build_evcc_forecast()}

    def _build_evcc_forecast(self) -> list:
        """Build forecast array in evcc format from SFML hourly predictions. @zara

        evcc expects: [{"start": "2026-03-07T10:00:00", "end": "2026-03-07T11:00:00", "value": 1250.5}, ...]
        value = average power in Watts for the time slot (kWh * 1000 for a 1-hour slot)
        """
        cache = getattr(self._coordinator, CACHE_HOURLY_PREDICTIONS, None)
        if not cache:
            return []

        result = []

        for pred in cache.get(CACHE_PREDICTIONS, []):
            entry = self._pred_to_evcc_entry(pred)
            if entry:
                result.append(entry)

        for pred in cache.get(CACHE_PREDICTIONS_TOMORROW, []):
            entry = self._pred_to_evcc_entry(pred)
            if entry:
                result.append(entry)

        for pred in cache.get(CACHE_PREDICTIONS_DAY_AFTER, []):
            entry = self._pred_to_evcc_entry(pred)
            if entry:
                result.append(entry)

        result.sort(key=lambda x: x["start"])
        return result

    @staticmethod
    def _pred_to_evcc_entry(pred: dict) -> Optional[dict]:
        """Convert a single SFML prediction to evcc format. @zara"""
        date_str = pred.get(PRED_TARGET_DATE)
        hour = pred.get(PRED_TARGET_HOUR)
        kwh = pred.get(PRED_PREDICTION_KWH) or pred.get(PRED_PREDICTED_KWH, 0.0)

        if date_str is None or hour is None or kwh is None:
            return None

        watts = round(float(kwh) * 1000, 1)
        start = f"{date_str}T{hour:02d}:00:00"
        end_hour = hour + 1
        if end_hour >= 24:
            return None
        end = f"{date_str}T{end_hour:02d}:00:00"

        return {"start": start, "end": end, "value": watts}

    async def async_added_to_hass(self) -> None:
        """Setup sensor. @zara"""
        await super().async_added_to_hass()
        self.async_on_remove(
            self._coordinator.async_add_listener(self._handle_coordinator_update)
        )
        self.async_write_ha_state()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Handle coordinator updates. @zara"""
        self.async_write_ha_state()
