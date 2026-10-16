# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Hoymiles inverters behind an AhoyDTU. @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta

from aiohttp import ClientError, ClientSession
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .fronius_coordinator import base_url, fetch_json
from .opendtu_coordinator import instance_id
from .vendors import ahoy

FETCH_ERRORS = (ClientError, TimeoutError, ValueError, TypeError)
# one cycle may never outlast this, however many inverters answer slowly
CYCLE_TIMEOUT_SECONDS = 60


async def async_probe(session: ClientSession, host: str) -> dict[str, str]:
    """Check that host is an AhoyDTU and return its identity. @zara"""
    listing = await fetch_json(session, f"{base_url(host)}{ahoy.LIST_PATH}")
    if not ahoy.is_list(listing):
        raise ValueError("not an AhoyDTU")
    return {"serial": instance_id(host), "name": f"AhoyDTU {host.strip()}"}


class AhoyCoordinator(DataUpdateCoordinator[dict[str, ahoy.HoymilesDevice]]):
    """Fetch the inverter list and every inverter's values per cycle. @zara"""

    vendor = ahoy

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, ahoy.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV AhoyDTU {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self._session = async_get_clientsession(hass)

    async def _async_update_data(self) -> dict[str, ahoy.HoymilesDevice]:
        try:
            async with asyncio.timeout(CYCLE_TIMEOUT_SECONDS):
                return await self._async_read_all()
        except TimeoutError as err:
            raise UpdateFailed(f"AhoyDTU at {self.host} answered too slowly") from err

    async def _async_read_all(self) -> dict[str, ahoy.HoymilesDevice]:
        root = base_url(self.host)
        try:
            listing = await fetch_json(self._session, f"{root}{ahoy.LIST_PATH}")
        except FETCH_ERRORS as err:
            raise UpdateFailed(f"AhoyDTU at {self.host} not reachable: {err}") from err
        if not ahoy.is_list(listing):
            raise UpdateFailed(f"AhoyDTU at {self.host} returned no inverter list")
        devices: dict[str, ahoy.HoymilesDevice] = {}
        # the ESP of an AhoyDTU handles one request at a time best
        for inverter_id in ahoy.inverter_ids(listing):
            url = f"{root}{ahoy.INVERTER_PATH.format(inverter_id)}"
            try:
                detail = await fetch_json(self._session, url)
            except FETCH_ERRORS as err:
                LOGGER.debug("AhoyDTU inverter %s request failed: %s", inverter_id, err)
                continue
            try:
                device = ahoy.build_device(detail)
            except (TypeError, ValueError) as err:
                # one malformed answer must not blank the other inverters
                LOGGER.debug(
                    "AhoyDTU inverter %s answer unusable: %s", inverter_id, err
                )
                continue
            if device is not None:
                devices[device.serial] = device
        return devices
