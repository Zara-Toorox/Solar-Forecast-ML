# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Price sensors for SFML Stats (ported from GPM). @zara"""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from ..const import DOMAIN, NAME, VERSION

_LOGGER = logging.getLogger(__name__)


class SFMLStatsBaseSensor(CoordinatorEntity, SensorEntity):
    """Base class for all SFML Stats sensors. @zara"""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        entry: ConfigEntry,
        sensor_type: str,
        name: str,
        icon: str,
    ) -> None:
        """Initialize the base sensor. @zara"""
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{sensor_type}"
        self._attr_name = name
        self._attr_icon = icon

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


class SpotPriceSensor(SFMLStatsBaseSensor):
    """Current spot price sensor. @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize spot price sensor. @zara"""
        super().__init__(coordinator, entry, "spot_price", "Spot Price", "mdi:currency-eur")
        self._attr_native_unit_of_measurement = "ct/kWh"
        self._attr_device_class = SensorDeviceClass.MONETARY

    @property
    def native_value(self) -> float | None:
        """Return current spot price. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("spot_price")
        return None


class TotalPriceSensor(SFMLStatsBaseSensor):
    """Total price sensor (spot + taxes + fees). @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize total price sensor. @zara"""
        super().__init__(coordinator, entry, "total_price", "Total Price", "mdi:cash-multiple")
        self._attr_native_unit_of_measurement = "ct/kWh"
        self._attr_device_class = SensorDeviceClass.MONETARY

    @property
    def native_value(self) -> float | None:
        """Return current total price. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("total_price")
        return None


class SpotPriceNextHourSensor(SFMLStatsBaseSensor):
    """Spot price for the next hour sensor. @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize spot price next hour sensor. @zara"""
        super().__init__(
            coordinator, entry, "spot_price_next_hour", "Spot Price Next Hour", "mdi:currency-eur"
        )
        self._attr_native_unit_of_measurement = "ct/kWh"
        self._attr_device_class = SensorDeviceClass.MONETARY

    @property
    def native_value(self) -> float | None:
        """Return spot price for the next hour. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("spot_price_next_hour")
        return None


class TotalPriceNextHourSensor(SFMLStatsBaseSensor):
    """Total price for the next hour sensor. @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize total price next hour sensor. @zara"""
        super().__init__(
            coordinator, entry, "total_price_next_hour", "Total Price Next Hour", "mdi:cash-multiple"
        )
        self._attr_native_unit_of_measurement = "ct/kWh"
        self._attr_device_class = SensorDeviceClass.MONETARY

    @property
    def native_value(self) -> float | None:
        """Return total price for the next hour. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("total_price_next_hour")
        return None


class CheapestHourSensor(SFMLStatsBaseSensor):
    """Cheapest hour of today sensor. @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize cheapest hour sensor. @zara"""
        super().__init__(
            coordinator, entry, "cheapest_hour_today", "Cheapest Hour Today", "mdi:clock-arrow-down"
        )
        self._attr_native_unit_of_measurement = "h"

    @property
    def native_value(self) -> int | None:
        """Return the cheapest hour of today as integer (0-23). @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("cheapest_hour_today")
        return None


class MostExpensiveHourSensor(SFMLStatsBaseSensor):
    """Most expensive hour of today sensor. @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize most expensive hour sensor. @zara"""
        super().__init__(
            coordinator, entry, "most_expensive_hour_today", "Most Expensive Hour Today", "mdi:clock-arrow-up"
        )
        self._attr_native_unit_of_measurement = "h"

    @property
    def native_value(self) -> int | None:
        """Return the most expensive hour of today as integer (0-23). @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("most_expensive_hour_today")
        return None


class AveragePriceTodaySensor(SFMLStatsBaseSensor):
    """Average price of today sensor. @zara"""

    def __init__(self, coordinator: DataUpdateCoordinator, entry: ConfigEntry) -> None:
        """Initialize average price today sensor. @zara"""
        super().__init__(
            coordinator, entry, "average_price_today", "Average Price Today", "mdi:chart-line-variant"
        )
        self._attr_native_unit_of_measurement = "ct/kWh"
        self._attr_device_class = SensorDeviceClass.MONETARY

    @property
    def native_value(self) -> float | None:
        """Return the average price of today. @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("average_price_today")
        return None
