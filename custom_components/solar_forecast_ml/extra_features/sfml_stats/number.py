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

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo, EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import async_update_smart_charging_settings
from .const import (
    CONF_MAX_SOC,
    CONF_MIN_SOC,
    DEFAULT_MAX_SOC,
    DEFAULT_MIN_SOC,
    DOMAIN,
    NAME,
    SMC_LIMITS,
    VERSION,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    async_add_entities(
        [
            SmartChargingTargetSocNumber(hass, entry),
            SmartChargingMinSocNumber(hass, entry),
            SmartChargingMaxSocNumber(hass, entry),
        ]
    )


class _SocNumber(NumberEntity):
    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_mode = NumberMode.SLIDER
    _attr_native_unit_of_measurement = "%"
    _field: str
    _default: float

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry
        limits = SMC_LIMITS[self._field if self._field != "target_soc" else "target_soc"]
        self._attr_native_min_value = limits["min"]
        self._attr_native_max_value = limits["max"]
        self._attr_native_step = limits["step"]

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._entry.entry_id)},
            name=NAME,
            manufacturer="Zara-Toorox",
            model="Solar Forecast Stats",
            sw_version=VERSION,
        )

    def _merged(self) -> dict[str, Any]:
        return {**self._entry.data, **self._entry.options}

    async def async_set_native_value(self, value: float) -> None:
        result = await async_update_smart_charging_settings(
            self.hass, **{self._field: value}
        )
        errors = result.get("errors") if isinstance(result, dict) else None
        if errors:
            raise HomeAssistantError(str(next(iter(errors.values()))))


class SmartChargingTargetSocNumber(_SocNumber):
    _field = "target_soc"
    _default = float(DEFAULT_MAX_SOC)

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(hass, entry)
        self._attr_unique_id = f"{entry.entry_id}_target_soc"
        self._attr_translation_key = "smart_charging_target_soc"
        self._attr_name = "Target SOC"

    @property
    def native_value(self) -> float | None:
        merged = self._merged()
        value = merged.get("target_soc", self._default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return self._default


class SmartChargingMinSocNumber(_SocNumber):
    _field = CONF_MIN_SOC
    _default = float(DEFAULT_MIN_SOC)

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(hass, entry)
        self._attr_unique_id = f"{entry.entry_id}_min_soc"
        self._attr_translation_key = "smart_charging_min_soc"
        self._attr_name = "Minimum SOC"

    @property
    def native_value(self) -> float | None:
        merged = self._merged()
        value = merged.get(CONF_MIN_SOC, self._default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return self._default


class SmartChargingMaxSocNumber(_SocNumber):
    _field = CONF_MAX_SOC
    _default = float(DEFAULT_MAX_SOC)

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        super().__init__(hass, entry)
        self._attr_unique_id = f"{entry.entry_id}_max_soc"
        self._attr_translation_key = "smart_charging_max_soc"
        self._attr_name = "Maximum SOC"

    @property
    def native_value(self) -> float | None:
        merged = self._merged()
        value = merged.get(CONF_MAX_SOC, self._default)
        try:
            return float(value)
        except (TypeError, ValueError):
            return self._default
