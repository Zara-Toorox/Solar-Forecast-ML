# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

import logging
from typing import Any, TYPE_CHECKING

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

if TYPE_CHECKING:
    from .coordinator import GridPriceMonitorCoordinator

from .const import (
    ATTR_CHEAP_HOURS_TODAY,
    ATTR_CHEAP_HOURS_TOMORROW,
    ATTR_FORECAST_TODAY,
    ATTR_FORECAST_TOMORROW,
    ATTR_LAST_UPDATE,
    ATTR_NEXT_CHEAP_HOUR,
    ATTR_PRICE_TREND,
    BINARY_SENSOR_CHEAP_ENERGY,
    BINARY_SENSOR_SMART_CHARGING,
    DOMAIN,
    ICON_CHEAP,
    ICON_SMART_CHARGING,
    NAME,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Solar Forecast GPM binary sensors @zara"""
    # Lazy import to avoid blocking the event loop during module import
    from .coordinator import GridPriceMonitorCoordinator

    coordinator: GridPriceMonitorCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = [GridPriceCheapEnergySensor(coordinator, entry)]

    # Add smart charging binary sensor if enabled
    if coordinator.has_smart_charging:
        entities.append(SmartChargingSensor(coordinator, entry))
        _LOGGER.debug("Smart charging binary sensor added")

    async_add_entities(entities)
    _LOGGER.debug("Added %d binary sensor(s) for Solar Forecast GPM", len(entities))


class GridPriceCheapEnergySensor(
    CoordinatorEntity["GridPriceMonitorCoordinator"], BinarySensorEntity
):
    """Binary sensor indicating if current energy price is cheap @zara"""

    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.POWER

    def __init__(
        self, coordinator: GridPriceMonitorCoordinator, entry: ConfigEntry
    ) -> None:
        """Initialize the binary sensor @zara"""
        super().__init__(coordinator)

        self._attr_unique_id = f"{entry.entry_id}_{BINARY_SENSOR_CHEAP_ENERGY}"
        self._attr_name = "Cheap Energy"
        self._attr_icon = ICON_CHEAP
        self._entry = entry

    @property
    def available(self) -> bool:
        """Return True if entity is available @zara

        Entity is available when coordinator has valid data.
        """
        return self.coordinator.last_update_success and self.coordinator.data is not None

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info @zara"""
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast GPM",
            sw_version=VERSION,
        )

    @property
    def is_on(self) -> bool | None:
        """Return true if energy is cheap @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("is_cheap", False)
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes @zara"""
        if not self.coordinator.data:
            return {}

        return {
            "current_total_price": self.coordinator.data.get("total_price"),
            "max_price_threshold": self.coordinator.data.get("max_price_threshold"),
            "spot_price": self.coordinator.data.get("spot_price"),
            "markup_total": self.coordinator.data.get("markup_total"),
            ATTR_NEXT_CHEAP_HOUR: self.coordinator.data.get("next_cheap_hour"),
            "next_cheap_timestamp": self.coordinator.data.get("next_cheap_timestamp"),
            ATTR_CHEAP_HOURS_TODAY: self.coordinator.data.get("cheap_hours_today", []),
            ATTR_CHEAP_HOURS_TOMORROW: self.coordinator.data.get("cheap_hours_tomorrow", []),
            ATTR_PRICE_TREND: self.coordinator.data.get("price_trend"),
            ATTR_FORECAST_TODAY: self.coordinator.data.get("forecast_today", []),
            ATTR_FORECAST_TOMORROW: self.coordinator.data.get("forecast_tomorrow", []),
            ATTR_LAST_UPDATE: self.coordinator.data.get("last_update"),
        }


class SmartChargingSensor(
    CoordinatorEntity["GridPriceMonitorCoordinator"], BinarySensorEntity
):
    """Binary sensor for smart charging - ON when grid charging is recommended @zara

    Combines electricity price with solar forecast and battery SoC.
    ON = price is cheap AND battery SoC is below calculated target.
    OFF = price too high OR battery has enough charge (leave room for solar).
    """

    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.BATTERY_CHARGING

    def __init__(
        self, coordinator: "GridPriceMonitorCoordinator", entry: ConfigEntry
    ) -> None:
        """Initialize the smart charging binary sensor @zara"""
        super().__init__(coordinator)

        self._attr_unique_id = f"{entry.entry_id}_{BINARY_SENSOR_SMART_CHARGING}"
        self._attr_name = "Smart Charging"
        self._attr_icon = ICON_SMART_CHARGING
        self._entry = entry

    @property
    def available(self) -> bool:
        """Return True if entity is available @zara"""
        return self.coordinator.last_update_success and self.coordinator.data is not None

    @property
    def device_info(self) -> DeviceInfo:
        """Return device info @zara"""
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast GPM",
            sw_version=VERSION,
        )

    @property
    def is_on(self) -> bool | None:
        """Return true if grid charging is recommended @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("smart_charging_active", False)
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes @zara"""
        if not self.coordinator.data:
            return {}

        return {
            "target_soc": self.coordinator.data.get("smart_charging_target_soc"),
            "current_soc": self.coordinator.data.get("smart_charging_current_soc"),
            "reason": self.coordinator.data.get("smart_charging_reason"),
            "solar_forecast_today_kwh": self.coordinator.data.get("solar_forecast_today"),
            "solar_forecast_tomorrow_kwh": self.coordinator.data.get("solar_forecast_tomorrow"),
            "solar_forecast_relevant_kwh": self.coordinator.data.get("solar_forecast_relevant"),
            "is_cheap": self.coordinator.data.get("is_cheap"),
            "current_total_price": self.coordinator.data.get("total_price"),
            ATTR_LAST_UPDATE: self.coordinator.data.get("last_update"),
        }
