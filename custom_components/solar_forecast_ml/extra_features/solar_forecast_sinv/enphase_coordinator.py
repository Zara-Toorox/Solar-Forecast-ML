# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Enphase IQ microinverters behind an IQ Gateway. @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
import re
import time
from typing import Any

from aiohttp import ClientError, ClientResponseError, ClientSession
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_ACCESS_TOKEN, CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .fronius_coordinator import REQUEST_TIMEOUT
from .vendors import enphase

CONF_GATEWAY_SERIAL = "gateway_serial"
FETCH_ERRORS = (ClientError, TimeoutError, ValueError, TypeError)
AUTH_STATUSES = (401, 403)
CYCLE_TIMEOUT_SECONDS = 45
MAX_TOKEN_LENGTH = 4096
_HOST = re.compile(
    r"^[A-Za-z0-9._-]+(:[0-9]{1,5})?$|^\[[0-9A-Fa-f:.]+\](:[0-9]{1,5})?$"
)


class EnphaseAuthError(Exception):
    """The IQ Gateway refused the access token. @zara"""


def gateway_url(host: str) -> str:
    """Return the HTTPS base URL of a gateway; the token never goes out over http. @zara"""
    address = re.sub(r"^https?://", "", str(host or "").strip(), flags=re.I).rstrip("/")
    if not _HOST.match(address):
        raise ValueError("invalid gateway address")
    return f"https://{address}"


def clean_token(token: Any) -> str:
    """Return the token without whitespace, or raise ValueError. @zara"""
    text = "".join(str(token or "").split())
    if not text or len(text) > MAX_TOKEN_LENGTH or not text.isascii():
        raise ValueError("invalid token")
    if not all(c.isalnum() or c in "-_.=+/" for c in text):
        raise ValueError("invalid token")
    return text


async def fetch(session: ClientSession, url: str, token: str) -> Any:
    """GET one gateway resource with the Bearer token and decode its JSON. @zara"""
    headers = {"Accept": "application/json", "Authorization": f"Bearer {token}"}
    # no redirects: the token must reach the gateway only
    async with session.get(
        url, headers=headers, timeout=REQUEST_TIMEOUT, allow_redirects=False
    ) as response:
        if response.status in AUTH_STATUSES:
            raise EnphaseAuthError(f"HTTP {response.status}")
        if response.status >= 300:
            raise ClientResponseError(
                response.request_info,
                response.history,
                status=response.status,
                message="unexpected status",
            )
        return await response.json(content_type=None)


async def async_probe(
    session: ClientSession, host: str, token: str, gateway_serial: str
) -> dict[str, Any]:
    """Check that host is an IQ Gateway that accepts the token. @zara"""
    serial = enphase.serial_of(gateway_serial)
    if not serial:
        raise ValueError("invalid gateway serial")
    root = gateway_url(host)
    token = clean_token(token)
    listing = await fetch(session, f"{root}{enphase.INVERTERS_PATH}", token)
    if not enphase.is_inverter_list(listing):
        raise ValueError("not an IQ Gateway")
    return {
        "serial": serial,
        "name": f"Enphase IQ Gateway {serial}",
        "data": {CONF_ACCESS_TOKEN: token, CONF_GATEWAY_SERIAL: serial},
    }


class EnphaseCoordinator(DataUpdateCoordinator[dict[str, enphase.EnphaseDevice]]):
    """Fetch microinverters and CT readings of one IQ Gateway per cycle. @zara"""

    vendor = enphase

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, enphase.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Enphase {entry.data[CONF_HOST]}",
            update_interval=timedelta(
                seconds=max(int(seconds), enphase.MIN_SCAN_SECONDS)
            ),
        )
        self.host: str = entry.data[CONF_HOST]
        self._token: str = entry.data[CONF_ACCESS_TOKEN]
        self._gateway_serial: str = entry.data[CONF_GATEWAY_SERIAL]
        # the gateway presents a self-signed certificate
        self._session = async_get_clientsession(hass, verify_ssl=False)

    async def _async_update_data(self) -> dict[str, enphase.EnphaseDevice]:
        try:
            async with asyncio.timeout(CYCLE_TIMEOUT_SECONDS):
                return await self._async_read_all()
        except EnphaseAuthError as err:
            raise ConfigEntryAuthFailed(
                f"IQ Gateway at {self.host} refused the access token"
            ) from err
        except TimeoutError as err:
            raise UpdateFailed(
                f"IQ Gateway at {self.host} answered too slowly"
            ) from err

    async def _async_read_all(self) -> dict[str, enphase.EnphaseDevice]:
        try:
            root = gateway_url(self.host)
            listing = await fetch(
                self._session, f"{root}{enphase.INVERTERS_PATH}", self._token
            )
        except FETCH_ERRORS as err:
            raise UpdateFailed(
                f"IQ Gateway at {self.host} not reachable: {err}"
            ) from err
        if not enphase.is_inverter_list(listing):
            raise UpdateFailed(f"IQ Gateway at {self.host} returned no inverter list")
        now = time.time()
        devices = enphase.build_inverters(listing, now)
        try:
            meters = await fetch(
                self._session, f"{root}{enphase.METERS_PATH}", self._token
            )
            readings = (
                await fetch(
                    self._session, f"{root}{enphase.READINGS_PATH}", self._token
                )
                if enphase.is_meter_list(meters) and meters
                else []
            )
        except FETCH_ERRORS as err:
            # a gateway without CTs may not offer the meter endpoints
            LOGGER.debug("IQ Gateway at %s has no meter data: %s", self.host, err)
            return devices
        gateway = enphase.build_gateway(self._gateway_serial, meters, readings, now)
        if gateway is not None:
            devices[gateway.serial] = gateway
        return devices
