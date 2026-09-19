# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo, EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CONF_SMART_CHARGING_ENABLED, DOMAIN, NAME, VERSION
from . import async_update_smart_charging_settings


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    async_add_entities([SmartChargingEnabledSwitch(hass, entry)])


class SmartChargingEnabledSwitch(SwitchEntity):
    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_translation_key = "smart_charging_enabled"

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_smart_charging_enabled"
        self._attr_name = "Smart Charging"

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
    def is_on(self) -> bool:
        merged = {**self._entry.data, **self._entry.options}
        return bool(merged.get(CONF_SMART_CHARGING_ENABLED, False))

    async def async_turn_on(self, **kwargs: Any) -> None:
        result = await async_update_smart_charging_settings(
            self.hass, **{CONF_SMART_CHARGING_ENABLED: True}
        )
        errors = result.get("errors") if isinstance(result, dict) else None
        if errors:
            raise HomeAssistantError(str(next(iter(errors.values()))))

    async def async_turn_off(self, **kwargs: Any) -> None:
        result = await async_update_smart_charging_settings(
            self.hass, **{CONF_SMART_CHARGING_ENABLED: False}
        )
        errors = result.get("errors") if isinstance(result, dict) else None
        if errors:
            raise HomeAssistantError(str(next(iter(errors.values()))))
