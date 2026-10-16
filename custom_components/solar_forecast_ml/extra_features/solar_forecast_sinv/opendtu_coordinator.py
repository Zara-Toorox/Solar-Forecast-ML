# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Hoymiles inverters behind an OpenDTU. @zara"""

from __future__ import annotations

import asyncio
import re
from datetime import timedelta
from urllib.parse import quote

from aiohttp import ClientError, ClientSession
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .fronius_coordinator import base_url, fetch_json
from .vendors import opendtu

DETAIL_REQUESTS_PARALLEL = 3


def instance_id(host: str) -> str:
    """Stable id of an OpenDTU instance: its address without scheme. @zara"""
    address = re.sub(r"^https?://", "", host.strip().rstrip("/").lower())
    return re.sub(r"[^a-z0-9.:-]", "_", address)


async def async_probe(session: ClientSession, host: str) -> dict[str, str]:
    """Check that host is an OpenDTU and return its identity. @zara"""
    status = await fetch_json(session, f"{base_url(host)}{opendtu.STATUS_PATH}")
    if not opendtu.is_status(status):
        raise ValueError("not an OpenDTU")
    return {"serial": instance_id(host), "name": f"OpenDTU {host.strip()}"}


class OpenDtuCoordinator(DataUpdateCoordinator[dict[str, opendtu.HoymilesDevice]]):
    """Fetch the inverter list and every inverter's live data per cycle. @zara"""

    vendor = opendtu

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, opendtu.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV OpenDTU {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self._session = async_get_clientsession(hass)

    async def _async_update_data(self) -> dict[str, opendtu.HoymilesDevice]:
        root = f"{base_url(self.host)}{opendtu.STATUS_PATH}"
        try:
            status = await fetch_json(self._session, root)
        except (ClientError, TimeoutError, ValueError, TypeError) as err:
            raise UpdateFailed(f"OpenDTU at {self.host} not reachable: {err}") from err
        serials = opendtu.inverter_serials(status)
        if not opendtu.is_status(status):
            raise UpdateFailed(f"OpenDTU at {self.host} returned no live data")
        # the ESP32 of an OpenDTU handles only a few parallel requests
        limit = asyncio.Semaphore(DETAIL_REQUESTS_PARALLEL)

        async def detail(serial: str):
            async with limit:
                return await fetch_json(self._session, f"{root}?inv={quote(serial)}")

        details = await asyncio.gather(
            *(detail(serial) for serial in serials), return_exceptions=True
        )
        devices: dict[str, opendtu.HoymilesDevice] = {}
        for serial, detail in zip(serials, details, strict=True):
            if isinstance(detail, Exception):
                LOGGER.debug("OpenDTU inverter %s request failed: %s", serial, detail)
                continue
            device = opendtu.build_device(detail)
            if device is not None:
                devices[device.serial] = device
        return devices
