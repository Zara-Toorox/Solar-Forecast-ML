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
