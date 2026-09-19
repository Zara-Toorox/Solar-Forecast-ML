# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

from typing import Any

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo, EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, NAME, THRESHOLD_MODES, VERSION
from .sensors.base import attach_demo_flag


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    from .coordinator import GridPriceMonitorCoordinator

    coordinator: GridPriceMonitorCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([GridPriceThresholdModeSelect(coordinator, entry)])


class GridPriceThresholdModeSelect(
    CoordinatorEntity["GridPriceMonitorCoordinator"], SelectEntity
):
    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_translation_key = "threshold_mode"
    _attr_options = list(THRESHOLD_MODES)

    def __init__(self, coordinator: Any, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_threshold_mode"

    @property
    def available(self) -> bool:
        if getattr(self.coordinator, "is_demo", False):
            return False
        return self.coordinator.last_update_success and self.coordinator.data is not None

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast GPM",
            sw_version=VERSION,
        )

    @property
    def current_option(self) -> str | None:
        data = self.coordinator.data or {}
        thresholds = data.get("thresholds") or {}
        mode = thresholds.get("mode")
        return str(mode) if mode is not None else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return attach_demo_flag(self.coordinator, None)

    async def async_select_option(self, option: str) -> None:
        result = await self.coordinator.async_update_thresholds(threshold_mode=option)
        errors = result.get("errors") if isinstance(result, dict) else None
        if errors:
            code = next(iter(errors.values()))
            raise HomeAssistantError(str(code))
