# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for a Solplanet Ai-Dongle over its local HTTP API. @zara

Requests run one after another with a short gap; the dongle drops parallel
requests. Only GET requests are sent. HTTPS on port 443 uses the dongle's
self-signed certificate, so it is not verified (local network only).
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
import json
import time
from typing import Any

from aiohttp import ClientError, ClientSession, ClientTimeout
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_CONNECTION, LOGGER
from .vendors import solplanet_dongle as dongle

REQUEST_TIMEOUT = ClientTimeout(total=15)
CYCLE_TIMEOUT_SECONDS = 60
# the inverter list changes rarely; it is read again after this time
INFO_REFRESH_SECONDS = 3600
# a dongle without a meter is asked again after this time
METER_RETRY_SECONDS = 3600
READ_ERRORS = (ClientError, TimeoutError, OSError, ValueError, TypeError)


async def fetch_json(session: ClientSession, url: str) -> dict[str, Any]:
    """GET one dongle resource and decode its JSON object. @zara"""
    kwargs: dict[str, Any] = {"timeout": REQUEST_TIMEOUT}
    if url.startswith("https://"):
        kwargs["ssl"] = False
    async with session.get(url, **kwargs) as response:
        response.raise_for_status()
        raw = bytearray()
        async for chunk in response.content.iter_chunked(64 * 1024):
            raw.extend(chunk)
            if len(raw) > dongle.MAX_RESPONSE_BYTES:
                raise ValueError(f"response from {url} is too large")
    data = json.loads(bytes(raw).decode("utf-8", "replace").strip(), strict=False)
    if not isinstance(data, dict):
        raise TypeError(f"unexpected response from {url}")
    return data


async def async_probe(session: ClientSession, host: str, port: int) -> dict[str, Any]:
    """Read the inverter list; port 8484 falls back to HTTPS on 443. @zara"""
    ports = [port]
    if port == dongle.DEFAULT_PORT:
        ports.append(dongle.HTTPS_PORT)
    last: Exception | None = None
    for candidate in ports:
        url = f"{dongle.base_url(host, candidate)}/{dongle.INVERTER_LIST_PATH}"
        try:
            async with asyncio.timeout(CYCLE_TIMEOUT_SECONDS):
                info = await fetch_json(session, url)
        except READ_ERRORS as err:
            last = err
            continue
        ident = dongle.identity(info)
        if ident is None:
            raise ValueError(dongle.reject_reason(info) or "no Solplanet serial number")
        return {
            **ident,
            "data": {CONF_PORT: candidate, CONF_CONNECTION: dongle.CONNECTION_DONGLE},
        }
    # ValueError/TypeError (no JSON object) and network errors keep their type
    raise last or OSError("no Solplanet dongle answer")


class SolplanetDongleCoordinator(
    DataUpdateCoordinator[dict[str, dongle.SolplanetDevice]]
):
    """Read inverter, meter and battery data of one Ai-Dongle per cycle. @zara"""

    vendor = dongle

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, dongle.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Solplanet dongle {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, dongle.DEFAULT_PORT))
        self._session = async_get_clientsession(hass)
        self._info: dict[str, Any] | None = None
        self._info_at = 0.0
        self._meter_retry_at = 0.0

    def _url(self, path: str) -> str:
        return f"{dongle.base_url(self.host, self.port)}/{path}"

    async def _get(self, path: str) -> dict[str, Any]:
        data = await fetch_json(self._session, self._url(path))
        await asyncio.sleep(dongle.REQUEST_GAP_SECONDS)
        return data

    async def _optional(self, path: str) -> dict[str, Any] | None:
        """Run a request whose failure leaves only its own values out. @zara"""
        try:
            return await self._get(path)
        except READ_ERRORS as err:
            LOGGER.debug("Solplanet dongle %s %s: %s", self.host, path, err)
            return None

    async def _async_update_data(self) -> dict[str, dongle.SolplanetDevice]:
        now = time.monotonic()
        try:
            async with asyncio.timeout(CYCLE_TIMEOUT_SECONDS):
                if self._info is None or now - self._info_at >= INFO_REFRESH_SECONDS:
                    self._info = await self._get(dongle.INVERTER_LIST_PATH)
                    self._info_at = now
                items = dongle.inverters(self._info)
                live: dict[str, Any] = {}
                batteries: dict[str, Any] = {}
                for item in items:
                    serial = item["isn"]
                    live[serial] = await self._get(
                        dongle.data_path(dongle.DEVICE_INVERTER, serial)
                    )
                    if dongle.is_storage(item):
                        batteries[serial] = await self._optional(
                            dongle.data_path(dongle.DEVICE_BATTERY, serial)
                        )
                meter = None
                if now >= self._meter_retry_at:
                    meter = await self._optional(dongle.METER_DATA_PATH)
                    if meter is not None and not dongle.meter_present(meter):
                        # zero stub: no meter on this dongle, ask again later
                        meter = None
                        self._meter_retry_at = now + METER_RETRY_SECONDS
        except READ_ERRORS as err:
            self._info = None
            if isinstance(err, TimeoutError):
                raise UpdateFailed(
                    f"Solplanet dongle at {self.host}:{self.port} timed out"
                ) from err
            raise UpdateFailed(
                f"Solplanet dongle at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = dongle.build_devices(
            {
                "info": self._info,
                "inverters": live,
                "meter": meter,
                "batteries": batteries,
            }
        )
        if not devices:
            reason = dongle.reject_reason(self._info)
            self._info = None
            raise UpdateFailed(
                reason or f"Solplanet dongle at {self.host} reported no inverter data"
            )
        return devices
