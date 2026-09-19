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

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity import DeviceInfo, EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import (
    DOMAIN,
    NAME,
    THRESHOLD_LIMITS,
    UNIT_CT_KWH,
    VERSION,
)
from .sensors.base import attach_demo_flag


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    from .coordinator import GridPriceMonitorCoordinator

    coordinator: GridPriceMonitorCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            GridPriceThresholdNumber(coordinator, entry, "cheap_price", "max_price"),
            GridPriceThresholdNumber(
                coordinator, entry, "force_charge_price", "force_charge_price"
            ),
            GridPriceThresholdNumber(
                coordinator, entry, "below_average_pct", "below_average_pct"
            ),
            GridPriceThresholdNumber(
                coordinator, entry, "cheapest_hours", "cheapest_hours"
            ),
        ]
    )


class GridPriceThresholdNumber(
    CoordinatorEntity["GridPriceMonitorCoordinator"], NumberEntity
):
    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_mode = NumberMode.SLIDER

    def __init__(
        self,
        coordinator: Any,
        entry: ConfigEntry,
        translation_key: str,
        field: str,
    ) -> None:
        super().__init__(coordinator)
        limits = THRESHOLD_LIMITS[field]
        self._field = field
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_{translation_key}"
        self._attr_translation_key = translation_key
        self._attr_native_min_value = limits["min"]
        self._attr_native_max_value = limits["max"]
        self._attr_native_step = limits["step"]
        if field in ("max_price", "force_charge_price"):
            self._attr_native_unit_of_measurement = UNIT_CT_KWH
        elif field == "below_average_pct":
            self._attr_native_unit_of_measurement = "%"

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
    def native_value(self) -> float | None:
        data = self.coordinator.data or {}
        thresholds = data.get("thresholds") or {}
        value = thresholds.get(self._field)
        if value is None:
            return None
        return float(value)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return attach_demo_flag(self.coordinator, None)

    async def async_set_native_value(self, value: float) -> None:
        payload: float | int = int(value) if self._field == "cheapest_hours" else value
        result = await self.coordinator.async_update_thresholds(**{self._field: payload})
        errors = result.get("errors") if isinstance(result, dict) else None
        if errors:
            code = next(iter(errors.values()))
            raise HomeAssistantError(str(code))
