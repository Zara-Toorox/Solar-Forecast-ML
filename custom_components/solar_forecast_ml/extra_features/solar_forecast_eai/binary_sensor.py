"""Passive EAI automation condition sensors."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .automation import EAIRecommendationEngine, device_info, wallbox_enabled
from .const import DOMAIN

BINARY_SENSORS = tuple(
    BinarySensorEntityDescription(key=key, translation_key=key)
    for key in (
        "automation_ready",
        "pv_window_active",
        "dhw_recommended",
        "heating_recommended",
        "thermal_storage_recommended",
        "low_price_window_active",
        "operation_deferrable",
        "critical_data_issue",
    )
)
WALLBOX_BINARY_SENSORS = tuple(
    BinarySensorEntityDescription(key=key, translation_key=key)
    for key in (
        "wallbox_charging_window_active",
        "wallbox_pv_charging_recommended",
        "wallbox_low_price_charging_recommended",
        "wallbox_departure_risk",
    )
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    descriptions = BINARY_SENSORS + (
        WALLBOX_BINARY_SENSORS if wallbox_enabled(entry) else ()
    )
    async_add_entities(
        EAIBinarySensor(runtime.recommendation_engine, entry, description)
        for description in descriptions
    )


class EAIBinarySensor(BinarySensorEntity):
    _attr_has_entity_name = True

    def __init__(
        self,
        engine: EAIRecommendationEngine,
        entry: ConfigEntry,
        description: BinarySensorEntityDescription,
    ) -> None:
        self.engine = engine
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_automation_{description.key}"
        self._attr_device_info = device_info(entry.entry_id)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.engine.add_listener(self.async_write_ha_state))

    @property
    def is_on(self) -> bool:
        return bool(self.engine.snapshot().values[self.entity_description.key])

    @property
    def extra_state_attributes(self):
        return self.engine.snapshot().attributes[self.entity_description.key]
