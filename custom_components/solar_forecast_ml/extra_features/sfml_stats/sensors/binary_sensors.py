# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Binary sensors for SFML Stats. @zara"""
from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)
from homeassistant.util import dt as dt_util

from ..const import (
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_SMARTMETER_EXPORT,
    CONF_SENSOR_BATTERY_POWER,
    CONF_SENSOR_SOLAR_TO_BATTERY,
    DOMAIN,
    NAME,
    VERSION,
)
from ..sfml_data_reader import SFMLDataReader

_LOGGER = logging.getLogger(__name__)

SURPLUS_EXPORT_HOLD_SECONDS = 300
SURPLUS_UPDATE_SECONDS = 15
SURPLUS_EXPORT_MIN_W = 50.0
SURPLUS_DEMAND_MARGIN_W = 150.0
SURPLUS_IMPORT_OFF_W = 50.0
SURPLUS_IMPORT_GRACE_SECONDS = 60
SURPLUS_MAX_UPDATE_FAILURES = 3


def _numeric_state(hass: HomeAssistant, entity_id: str | None) -> float | None:
    if not entity_id:
        return None
    state = hass.states.get(entity_id)
    if state is None or state.state in ("unknown", "unavailable", None):
        return None
    try:
        value = float(state.state)
    except (TypeError, ValueError):
        return None
    unit = str(state.attributes.get("unit_of_measurement", "")).strip().lower()
    if unit == "kw":
        value *= 1000.0
    return value


def _positive_power(value: float | None) -> float | None:
    if value is None:
        return None
    return max(0.0, value)


def _import_power(value: float | None) -> float | None:
    if value is None:
        return None
    return value if value > 0 else 0.0


def _export_power(value: float | None) -> float | None:
    if value is None:
        return None
    return abs(value) if value < 0 else value


class SurplusAvailableBinarySensor(BinarySensorEntity):
    """Binary sensor for sustained PV surplus availability. @zara"""

    _attr_has_entity_name = True
    _attr_icon = "mdi:transmission-tower-export"
    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize surplus availability binary sensor. @zara"""
        self.hass = hass
        self._entry = entry
        self._reader = SFMLDataReader(hass)
        self._attr_unique_id = f"{entry.entry_id}_surplus_available"
        self._attr_name = "PV Surplus Available"
        self._is_on = False
        self._export_started_at: datetime | None = None
        self._last_reason = "initializing"
        self._last_values: dict[str, Any] = {}
        self._consecutive_update_failures = 0
        self._import_started_at: datetime | None = None

    @property
    def is_on(self) -> bool:
        """Return true if export has been stable for the configured hold time. @zara"""
        return self._is_on

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return diagnostics for automations and troubleshooting. @zara"""
        export_started = self._export_started_at.isoformat() if self._export_started_at else None
        return {
            "export_power_w": self._last_values.get("export_power_w"),
            "surplus_power_w": self._last_values.get("surplus_power_w"),
            "solar_power_w": self._last_values.get("solar_power_w"),
            "home_consumption_w": self._last_values.get("home_consumption_w"),
            "grid_import_w": self._last_values.get("grid_import_w"),
            "export_duration_s": self._last_values.get("export_duration_s", 0),
            "required_duration_s": SURPLUS_EXPORT_HOLD_SECONDS,
            "export_threshold_w": SURPLUS_EXPORT_MIN_W,
            "demand_margin_w": SURPLUS_DEMAND_MARGIN_W,
            "import_off_threshold_w": SURPLUS_IMPORT_OFF_W,
            "import_grace_seconds": SURPLUS_IMPORT_GRACE_SECONDS,
            "update_failures": self._consecutive_update_failures,
            "adjusted_home_consumption_w": self._last_values.get("adjusted_home_consumption_w"),
            "battery_charge_w": self._last_values.get("battery_charge_w"),
            "import_duration_s": self._last_values.get("import_duration_s", 0),
            "export_started_at": export_started,
            "export_source": self._last_values.get("export_source"),
            "reason": self._last_reason,
        }

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info for grouping entities. @zara"""
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast Stats",
            sw_version=VERSION,
        )

    async def async_added_to_hass(self) -> None:
        """Start periodic refresh. @zara"""
        self.async_on_remove(
            async_track_time_interval(
                self.hass,
                self._handle_interval,
                timedelta(seconds=SURPLUS_UPDATE_SECONDS),
            )
        )
        await self._async_refresh()

    @callback
    def _handle_interval(self, now: datetime) -> None:
        self.hass.async_create_task(self._async_refresh(now))

    async def _async_refresh(self, now: datetime | None = None) -> None:
        now = now or dt_util.now()
        try:
            await self._evaluate(now)
            self._consecutive_update_failures = 0
        except Exception as err:
            self._consecutive_update_failures += 1
            _LOGGER.debug(
                "Failed to update PV surplus binary sensor (%s/%s): %s",
                self._consecutive_update_failures,
                SURPLUS_MAX_UPDATE_FAILURES,
                err,
            )
            if self._consecutive_update_failures >= SURPLUS_MAX_UPDATE_FAILURES:
                self._is_on = False
                self._export_started_at = None
                self._import_started_at = None
                self._last_reason = "update_failed"
            else:
                self._last_reason = "update_failed_retained"
        self.async_write_ha_state()

    async def _evaluate(self, now: datetime) -> None:
        config = {**self._entry.data, **self._entry.options}
        house_to_grid_sensor = config.get(CONF_SENSOR_HOUSE_TO_GRID)
        smartmeter_export_sensor = config.get(CONF_SENSOR_SMARTMETER_EXPORT)
        grid_to_house_sensor = config.get(CONF_SENSOR_GRID_TO_HOUSE)
        smartmeter_import_sensor = config.get(CONF_SENSOR_SMARTMETER_IMPORT)

        export_source = "house_to_grid"
        export_power = _export_power(_numeric_state(self.hass, house_to_grid_sensor))
        if export_power is None:
            export_source = "smartmeter_export"
            export_power = _export_power(_numeric_state(self.hass, smartmeter_export_sensor))

        grid_import = _import_power(_numeric_state(self.hass, grid_to_house_sensor))
        if grid_import is None:
            grid_import = _import_power(_numeric_state(self.hass, smartmeter_import_sensor))
        if (
            grid_import is None
            and house_to_grid_sensor
            and house_to_grid_sensor == smartmeter_import_sensor
        ):
            grid_import = _import_power(_numeric_state(self.hass, house_to_grid_sensor))
        if (
            grid_import is None
            and smartmeter_export_sensor
            and smartmeter_export_sensor == smartmeter_import_sensor
        ):
            grid_import = _import_power(_numeric_state(self.hass, smartmeter_export_sensor))

        solar_power = await self._reader.get_live_power()
        home_consumption = _positive_power(_numeric_state(self.hass, config.get(CONF_SENSOR_HOME_CONSUMPTION)))
        battery_power = _numeric_state(self.hass, config.get(CONF_SENSOR_BATTERY_POWER))
        solar_to_battery = _positive_power(_numeric_state(self.hass, config.get(CONF_SENSOR_SOLAR_TO_BATTERY)))
        grid_to_battery = _positive_power(_numeric_state(self.hass, config.get(CONF_SENSOR_GRID_TO_BATTERY)))
        battery_charge_power = 0.0
        if solar_to_battery is not None:
            battery_charge_power += solar_to_battery
        elif battery_power is not None and battery_power > 0:
            battery_charge_power += battery_power
        if grid_to_battery is not None:
            battery_charge_power = max(0.0, battery_charge_power - grid_to_battery)

        adjusted_home_consumption = home_consumption
        if adjusted_home_consumption is not None and battery_charge_power > 0:
            adjusted_home_consumption = max(0.0, adjusted_home_consumption - battery_charge_power)

        demand_exceeds_solar = (
            solar_power is not None
            and adjusted_home_consumption is not None
            and adjusted_home_consumption > solar_power + SURPLUS_DEMAND_MARGIN_W
        )

        solar_surplus = None
        if solar_power is not None and adjusted_home_consumption is not None:
            solar_surplus = max(0.0, solar_power - adjusted_home_consumption)

        if export_power is not None and solar_surplus is not None:
            surplus_power = min(export_power, solar_surplus)
        elif export_power is not None:
            surplus_power = export_power
        else:
            surplus_power = solar_surplus

        has_import = grid_import is not None and grid_import >= SURPLUS_IMPORT_OFF_W
        if has_import:
            if self._import_started_at is None:
                self._import_started_at = now
            import_duration = max(0, int((now - self._import_started_at).total_seconds()))
        else:
            self._import_started_at = None
            import_duration = 0

        has_persistent_import = has_import and import_duration >= SURPLUS_IMPORT_GRACE_SECONDS
        has_surplus = surplus_power is not None and surplus_power >= SURPLUS_EXPORT_MIN_W

        if has_persistent_import:
            self._is_on = False
            self._export_started_at = None
            self._last_reason = "grid_import_active"
        elif demand_exceeds_solar:
            self._is_on = False
            self._export_started_at = None
            self._last_reason = "home_demand_exceeds_solar"
        elif not has_surplus:
            self._is_on = False
            self._export_started_at = None
            self._last_reason = "no_export"
        else:
            if self._export_started_at is None:
                self._export_started_at = now
            duration = max(0, int((now - self._export_started_at).total_seconds()))
            self._is_on = duration >= SURPLUS_EXPORT_HOLD_SECONDS
            if has_import:
                self._last_reason = "transient_grid_import"
            else:
                self._last_reason = "stable_export" if self._is_on else "waiting_for_hold_time"

        duration = (
            max(0, int((now - self._export_started_at).total_seconds()))
            if self._export_started_at else 0
        )
        self._last_values = {
            "export_power_w": round(export_power, 1) if export_power is not None else None,
            "surplus_power_w": round(surplus_power, 1) if surplus_power is not None else None,
            "solar_power_w": round(solar_power, 1) if solar_power is not None else None,
            "home_consumption_w": round(home_consumption, 1) if home_consumption is not None else None,
            "adjusted_home_consumption_w": round(adjusted_home_consumption, 1) if adjusted_home_consumption is not None else None,
            "battery_charge_w": round(battery_charge_power, 1),
            "grid_import_w": round(grid_import, 1) if grid_import is not None else None,
            "import_duration_s": import_duration,
            "export_duration_s": duration,
            "export_source": export_source if export_power is not None else None,
        }


class CheapEnergyBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor indicating whether current energy price is cheap. @zara"""

    _attr_has_entity_name = True

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize cheap energy binary sensor. @zara"""
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_cheap_energy"
        self._attr_name = "Cheap Energy"
        self._attr_icon = "mdi:cash-check"

    @property
    def is_on(self) -> bool:
        """Return True if current energy price is considered cheap. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("is_cheap", False)
        return False

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info for grouping entities. @zara"""
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast Stats",
            sw_version=VERSION,
        )


class SmartChargingBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Binary sensor indicating whether smart charging is active. @zara"""

    _attr_has_entity_name = True

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize smart charging binary sensor. @zara"""
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_smart_charging"
        self._attr_name = "Smart Charging Active"
        self._attr_icon = "mdi:battery-charging"

    @property
    def is_on(self) -> bool:
        """Return True if smart charging is currently active. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("smart_charging_active", False)
        return False

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info for grouping entities. @zara"""
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast Stats",
            sw_version=VERSION,
        )
