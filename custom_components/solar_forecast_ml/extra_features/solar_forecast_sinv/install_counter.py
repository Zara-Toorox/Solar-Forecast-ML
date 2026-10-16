# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Anonymous install count of S-INV, switchable in the options of "S-INV Anlage". @zara

Once per UTC day the installation sends the integration name and its version to the
project website. No identifier, no configuration and no measured value leaves Home
Assistant; the website stores only a counter per day and version. The address is seen
in transit and kept as a keyed hash for rate limiting for at most two days.
"""

from __future__ import annotations

import logging
import random
from datetime import date, timedelta
from typing import Any

from aiohttp import ClientError, ClientTimeout
from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.loader import async_get_integration
from homeassistant.util import dt as dt_util

from .const import DOMAIN
from .site import site_device_info

_LOGGER = logging.getLogger(__name__)

COUNTER_URL = "https://www.solarforecastml.com/installs/ping.php"
CONF_INSTALL_COUNT = "install_count"
STORE_KEY = f"{DOMAIN}.install_counter"
CHECK_INTERVAL = timedelta(hours=6)
FIRST_CHECK_SECONDS = (5 * 60, 60 * 60)
REQUEST_TIMEOUT = ClientTimeout(total=10)


# on during the BETA phase; switch to False (opt-in) for the release
INSTALL_COUNT_DEFAULT = True


def enabled(entry: ConfigEntry) -> bool:
    """Return whether the count is on (BETA default) or switched off. @zara"""
    return bool(entry.options.get(CONF_INSTALL_COUNT, INSTALL_COUNT_DEFAULT))


def due(stored: dict[str, Any] | None, today: date) -> bool:
    """Return True when today's report has not been sent yet. @zara"""
    if not isinstance(stored, dict):
        return True
    return stored.get("last_sent") != today.isoformat()


def payload(version: str) -> dict[str, str]:
    """Build the complete report: integration name and version, nothing else. @zara"""
    return {"integration": DOMAIN, "version": version}


async def async_report(hass: HomeAssistant, entry: ConfigEntry, store: Store) -> bool:
    """Send today's report if due. Returns True when it was accepted. @zara"""
    if not enabled(entry):
        return False
    today = dt_util.utcnow().date()
    if not due(await store.async_load(), today):
        return False
    integration = await async_get_integration(hass, DOMAIN)
    try:
        async with async_get_clientsession(hass).post(
            COUNTER_URL,
            json=payload(str(integration.version)),
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": DOMAIN},
        ) as response:
            accepted = response.status in (200, 204)
    except (ClientError, TimeoutError) as err:
        _LOGGER.debug("Install count not sent: %s", err)
        return False
    if accepted:
        await store.async_save({"last_sent": today.isoformat()})
    return accepted


def _store(hass: HomeAssistant) -> Store:
    return Store(hass, 1, STORE_KEY)


def async_setup_install_counter(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Check every few hours, first after a random delay so restarts do not burst. @zara"""
    store = _store(hass)

    async def check(_now: Any = None) -> None:
        await async_report(hass, entry, store)

    entry.async_on_unload(async_track_time_interval(hass, check, CHECK_INTERVAL))
    entry.async_on_unload(
        async_call_later(hass, random.randint(*FIRST_CHECK_SECONDS), check)
    )


class InstallCountSwitch(SwitchEntity):
    """BETA-test switch of the installation: the anonymous install count, on during the BETA. @zara"""

    _attr_has_entity_name = True
    _attr_translation_key = "install_count"
    _attr_entity_category = EntityCategory.CONFIG
    _attr_icon = "mdi:flask-outline"
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry) -> None:
        """Bind to the installation entry, whose options hold the choice. @zara"""
        self._entry = entry
        self._attr_unique_id = "sinv_site_install_count"
        self._attr_device_info = site_device_info()
        self.entity_id = "switch.sinv_beta_test"

    @property
    def is_on(self) -> bool:
        """Return the user's choice. @zara"""
        return enabled(self._entry)

    async def async_added_to_hass(self) -> None:
        """Follow changes made in the options dialog. @zara"""

        @callback
        def changed(*_args: Any) -> None:
            self.async_write_ha_state()

        self.async_on_remove(self._entry.add_update_listener(_listener(changed)))

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Opt in; the first report follows right away. @zara"""
        self._set(True)
        self.hass.async_create_task(
            async_report(self.hass, self._entry, _store(self.hass))
        )

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Opt out; nothing is sent any more. @zara"""
        self._set(False)

    def _set(self, value: bool) -> None:
        self.hass.config_entries.async_update_entry(
            self._entry, options={**self._entry.options, CONF_INSTALL_COUNT: value}
        )
        self.async_write_ha_state()


def _listener(changed):
    """Wrap a state refresh as config entry update listener. @zara"""

    async def listener(_hass: HomeAssistant, _entry: ConfigEntry) -> None:
        changed()

    return listener
