# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Warp Core Simulation - Containment Override Switch. Allows manual pause of antimatter calibration cycle. @starfleet-engineering"""

import logging
from datetime import datetime

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.restore_state import RestoreEntity

from .const import DOMAIN
from .services.service_usage_stats import (
    CONF_USAGE_STATS,
    async_report,
    enabled,
    get_store,
)

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> bool:
    """Set up Solar Forecast ML switches from config entry. @zara"""
    coordinator = hass.data[DOMAIN][entry.entry_id]

    async_add_entities(
        [PauseLearningSwitch(hass, coordinator, entry), UsageStatsSwitch(entry)],
        True,
    )
    return True


class PauseLearningSwitch(RestoreEntity, SwitchEntity):
    """Switch to pause forecast learning for the current day. @zara

    When ON: hourly records are marked exclude_from_learning = True.
    Weather tracking, DNI, snow/shadow detection continue normally.
    Auto-resets to OFF at midnight.
    """

    _attr_has_entity_name = True
    _attr_translation_key = "pause_learning"
    _attr_icon = "mdi:brain-freeze"

    def __init__(self, hass: HomeAssistant, coordinator, entry: ConfigEntry) -> None:
        """Initialize pause learning switch. @zara"""
        self.hass = hass
        self.coordinator = coordinator
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_pause_learning"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
        )
        self._is_on = False
        self._unsub_midnight_reset = None

    @property
    def is_on(self) -> bool:
        """Return true if learning is paused. @zara"""
        return self._is_on

    async def async_turn_on(self, **kwargs) -> None:
        """Pause learning for today. @zara"""
        self._is_on = True
        self.coordinator.learning_paused = True
        _LOGGER.info("Learning paused for today by user")
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs) -> None:
        """Resume learning. @zara"""
        self._is_on = False
        self.coordinator.learning_paused = False
        _LOGGER.info("Learning resumed by user")
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        """Restore state and schedule midnight auto-reset. @zara"""
        await super().async_added_to_hass()

        # Restore previous state (only if from today — stale state = OFF)
        last_state = await self.async_get_last_state()
        if last_state is not None and last_state.state == "on":
            last_changed = last_state.last_changed
            from .core.core_helpers import SafeDateTimeUtil as dt_util
            if last_changed and last_changed.date() == dt_util.now().date():
                self._is_on = True
                self.coordinator.learning_paused = True
                _LOGGER.info("Restored pause_learning state: ON (same day)")
            else:
                _LOGGER.info(
                    "Stale pause_learning state from %s — resetting to OFF",
                    last_changed.date() if last_changed else "unknown",
                )

        # Schedule midnight auto-reset
        @callback
        def _midnight_reset(now: datetime) -> None:
            """Reset pause learning at midnight. @zara"""
            if self._is_on:
                self._is_on = False
                self.coordinator.learning_paused = False
                self.async_write_ha_state()
                _LOGGER.info("Learning pause auto-reset at midnight")

        self._unsub_midnight_reset = async_track_time_change(
            self.hass, _midnight_reset, hour=0, minute=0, second=0
        )

    async def async_will_remove_from_hass(self) -> None:
        """Cleanup when entity is removed. @zara"""
        if self._unsub_midnight_reset:
            self._unsub_midnight_reset()
            self._unsub_midnight_reset = None
        self.coordinator.learning_paused = False


class UsageStatsSwitch(SwitchEntity):
    """Switch for the anonymous installation counter, on by default. @zara"""

    _attr_has_entity_name = True
    _attr_translation_key = "usage_stats"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_icon = "mdi:counter"
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry) -> None:
        """Bind to the config entry, whose options hold the choice. @zara"""
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_usage_stats"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)})

    @property
    def is_on(self) -> bool:
        """Return the user's choice. @zara"""
        return enabled(self._entry)

    async def async_turn_on(self, **kwargs) -> None:
        """Switch the counter on; today's report follows right away. @zara"""
        self._set(True)
        self.hass.async_create_task(
            async_report(self.hass, self._entry, get_store(self.hass))
        )

    async def async_turn_off(self, **kwargs) -> None:
        """Switch the counter off; nothing is sent any more. @zara"""
        self._set(False)

    def _set(self, value: bool) -> None:
        """Store the choice in the entry options. @zara"""
        self.hass.config_entries.async_update_entry(
            self._entry, options={**self._entry.options, CONF_USAGE_STATS: value}
        )
        self.async_write_ha_state()
