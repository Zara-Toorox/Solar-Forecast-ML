# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo, EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import async_update_smart_charging_settings
from .const import (
    CONF_SMART_CHARGING_MODE,
    DEFAULT_SMART_CHARGING_MODE,
    DOMAIN,
    NAME,
    SMC_MODES,
    VERSION,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    async_add_entities([SmartChargingModeSelect(hass, entry)])


class SmartChargingModeSelect(SelectEntity):
    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_translation_key = "smart_charging_mode"
    _attr_options = list(SMC_MODES)

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_smart_charging_mode"
        self._attr_name = "Smart Charging Mode"

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast Stats",
            sw_version=VERSION,
        )

    @property
    def current_option(self) -> str | None:
        merged = {**self._entry.data, **self._entry.options}
        return str(merged.get(CONF_SMART_CHARGING_MODE, DEFAULT_SMART_CHARGING_MODE))

    async def async_select_option(self, option: str) -> None:
        result = await async_update_smart_charging_settings(
            self.hass, **{CONF_SMART_CHARGING_MODE: option}
        )
        errors = result.get("errors") if isinstance(result, dict) else None
        if errors:
            raise HomeAssistantError(str(next(iter(errors.values()))))
