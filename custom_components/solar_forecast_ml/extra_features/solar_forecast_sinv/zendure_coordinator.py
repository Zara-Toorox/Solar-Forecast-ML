# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Zendure devices on the local zenSDK HTTP API. @zara"""

from __future__ import annotations

from datetime import timedelta

from aiohttp import ClientError, ClientSession
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .fronius_coordinator import base_url, fetch_json
from .vendors import zendure


async def async_probe(session: ClientSession, host: str) -> dict[str, str]:
    """Check that host answers zenSDK and return the device identity. @zara"""
    report = await fetch_json(session, f"{base_url(host)}{zendure.REPORT_PATH}")
    ident = zendure.identity(report)
    if ident is None:
        raise ValueError("not a Zendure zenSDK device")
    return ident


class ZendureCoordinator(DataUpdateCoordinator[dict[str, zendure.ZendureDevice]]):
    """Fetch the property report of one Zendure device per cycle. @zara"""

    vendor = zendure

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, zendure.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Zendure {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self._session = async_get_clientsession(hass)

    async def _async_update_data(self) -> dict[str, zendure.ZendureDevice]:
        try:
            report = await fetch_json(
                self._session, f"{base_url(self.host)}{zendure.REPORT_PATH}"
            )
        except (ClientError, TimeoutError, ValueError, TypeError) as err:
            raise UpdateFailed(f"Zendure at {self.host} not reachable: {err}") from err
        devices = zendure.build_devices(report)
        if not devices:
            raise UpdateFailed(f"Zendure at {self.host} returned no device report")
        return devices
