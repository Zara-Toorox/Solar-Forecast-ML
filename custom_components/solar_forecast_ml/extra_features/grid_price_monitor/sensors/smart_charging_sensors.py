# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

from typing import Any, TYPE_CHECKING

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfEnergy

from ..const import (
    ICON_SOLAR_FORECAST,
    ICON_TARGET_SOC,
    SENSOR_SMART_CHARGING_TARGET_SOC,
    SENSOR_SOLAR_FORECAST_TODAY,
    SENSOR_SOLAR_FORECAST_TOMORROW,
)
from .base import GridPriceBaseSensor

if TYPE_CHECKING:
    from ..coordinator import GridPriceMonitorCoordinator


class SmartChargingTargetSoCSensor(GridPriceBaseSensor):
    """Sensor showing the calculated target SoC for smart charging @zara"""

    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(
        self, coordinator: "GridPriceMonitorCoordinator", entry: ConfigEntry
    ) -> None:
        """Initialize target SoC sensor @zara"""
        super().__init__(
            coordinator,
            entry,
            SENSOR_SMART_CHARGING_TARGET_SOC,
            "Smart Charging Target SoC",
            ICON_TARGET_SOC,
        )

    @property
    def native_value(self) -> float | None:
        """Return the calculated target SoC @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("smart_charging_target_soc")
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes @zara"""
        if not self.coordinator.data:
            return {}

        return {
            "current_soc": self.coordinator.data.get("smart_charging_current_soc"),
            "reason": self.coordinator.data.get("smart_charging_reason"),
            "solar_forecast_relevant_kwh": self.coordinator.data.get("solar_forecast_relevant"),
        }


class SolarForecastTodaySensor(GridPriceBaseSensor):
    """Sensor showing SFML solar forecast for today @zara"""

    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(
        self, coordinator: "GridPriceMonitorCoordinator", entry: ConfigEntry
    ) -> None:
        """Initialize solar forecast today sensor @zara"""
        super().__init__(
            coordinator,
            entry,
            SENSOR_SOLAR_FORECAST_TODAY,
            "Solar Forecast Today",
            ICON_SOLAR_FORECAST,
        )

    @property
    def native_value(self) -> float | None:
        """Return today's solar forecast @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("solar_forecast_today")
        return None


class SolarForecastTomorrowSensor(GridPriceBaseSensor):
    """Sensor showing SFML solar forecast for tomorrow @zara"""

    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(
        self, coordinator: "GridPriceMonitorCoordinator", entry: ConfigEntry
    ) -> None:
        """Initialize solar forecast tomorrow sensor @zara"""
        super().__init__(
            coordinator,
            entry,
            SENSOR_SOLAR_FORECAST_TOMORROW,
            "Solar Forecast Tomorrow",
            ICON_SOLAR_FORECAST,
        )

    @property
    def native_value(self) -> float | None:
        """Return tomorrow's solar forecast @zara"""
        if self.coordinator.data:
            return self.coordinator.data.get("solar_forecast_tomorrow")
        return None
