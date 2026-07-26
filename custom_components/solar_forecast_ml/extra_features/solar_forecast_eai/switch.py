"""Local policy switches for passive EAI signals."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity, SwitchEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .automation import (
    EAIRecommendationEngine,
    POLICY_DEFAULTS,
    device_info,
    wallbox_enabled,
)
from .const import CONF_HEAT_PUMP_ENABLED, DOMAIN

SWITCHES = tuple(
    SwitchEntityDescription(
        key=key, translation_key=key, entity_category=EntityCategory.CONFIG
    )
    for key in POLICY_DEFAULTS
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    config = {**entry.data, **entry.options}
    if not (config.get(CONF_HEAT_PUMP_ENABLED, True) or wallbox_enabled(entry)):
        return
    descriptions = tuple(
        description
        for description in SWITCHES
        if description.key != "wallbox_optimization" or wallbox_enabled(entry)
    )
    async_add_entities(
        EAIPolicySwitch(runtime.recommendation_engine, entry, description)
        for description in descriptions
    )


class EAIPolicySwitch(SwitchEntity, RestoreEntity):
    _attr_has_entity_name = True

    def __init__(
        self,
        engine: EAIRecommendationEngine,
        entry: ConfigEntry,
        description: SwitchEntityDescription,
    ) -> None:
        self.engine = engine
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_automation_{description.key}"
        self._attr_device_info = device_info(entry.entry_id)

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if (last_state := await self.async_get_last_state()) is not None:
            self.engine.set_policy(
                self.entity_description.key, last_state.state == "on"
            )
        self.async_on_remove(self.engine.add_listener(self.async_write_ha_state))

    @property
    def is_on(self) -> bool:
        return self.engine.policies[self.entity_description.key]

    async def async_turn_on(self, **kwargs) -> None:
        self.engine.set_policy(self.entity_description.key, True)

    async def async_turn_off(self, **kwargs) -> None:
        self.engine.set_policy(self.entity_description.key, False)
