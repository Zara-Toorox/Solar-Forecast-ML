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

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from ..const import DOMAIN, NAME, VERSION


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
