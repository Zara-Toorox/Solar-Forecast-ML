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

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..const import DOMAIN, NAME, VERSION

if TYPE_CHECKING:
    from ..coordinator import GridPriceMonitorCoordinator


def attach_demo_flag(
    coordinator: "GridPriceMonitorCoordinator",
    attrs: dict[str, Any] | None,
) -> dict[str, Any]:
    """Attach demo and tariff attributes required on every GPM entity."""
    result: dict[str, Any] = {} if not attrs else dict(attrs)
    result["demo"] = bool(getattr(coordinator, "is_demo", False))
    data = getattr(coordinator, "data", None) or {}
    result["tariff_mode"] = data.get("tariff_mode") or getattr(coordinator, "tariff_mode", None)
    return result


class GridPriceBaseSensor(CoordinatorEntity["GridPriceMonitorCoordinator"], SensorEntity):
    """Base class for Solar Forecast GPM sensors @zara"""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: "GridPriceMonitorCoordinator",
        entry: ConfigEntry,
        sensor_type: str,
        name: str,
        icon: str,
    ) -> None:
        """Initialize the sensor @zara

        Args:
            coordinator: Data update coordinator
            entry: Config entry
            sensor_type: Type identifier for the sensor
            name: Display name
            icon: MDI icon name
        """
        super().__init__(coordinator)

        self._attr_unique_id = f"{entry.entry_id}_{sensor_type}"
        self._attr_name = name
        self._attr_icon = icon
        self._entry = entry

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        raw = cls.__dict__.get("extra_state_attributes")
        if not isinstance(raw, property) or raw.fget is None:
            return
        original = raw.fget

        def wrapped(self: GridPriceBaseSensor) -> dict[str, Any]:
            return attach_demo_flag(self.coordinator, original(self))

        cls.extra_state_attributes = property(wrapped)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return attach_demo_flag(self.coordinator, None)

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
