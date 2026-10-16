# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Fronius inverters on the local Solar API v1. @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
import struct
import time
from typing import Any
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientSession, ClientTimeout
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .const import LOGGER
from .modbus_tcp import READ_HOLDING_REGISTERS, ModbusError, ModbusTcpClient
from .vendors import fronius, sunspec

REQUEST_TIMEOUT = ClientTimeout(total=10)
CONF_MODBUS = "modbus"
MODBUS_DEFAULT = True
MODBUS_PORT = 502
MODBUS_UNIT_ID = 1
MODBUS_TIMEOUT_SECONDS = 10
# a closed port or a device without model 160 is asked again only after this
MODBUS_RETRY_SECONDS = 3600
MODBUS_ERRORS = (OSError, TimeoutError, EOFError, ModbusError, struct.error)


def base_url(host: str) -> str:
    """Return the http base URL for a host or URL the user entered. @zara"""
    host = host.strip().rstrip("/")
    if not host.startswith(("http://", "https://")):
        host = f"http://{host}"
    return host


async def fetch_json(session: ClientSession, url: str) -> dict[str, Any]:
    """GET one Solar API resource and decode its JSON body. @zara"""
    async with session.get(url, timeout=REQUEST_TIMEOUT) as response:
        response.raise_for_status()
        data = await response.json(content_type=None)
    if not isinstance(data, dict):
        raise TypeError(f"unexpected response from {url}")
    return data


async def async_probe(session: ClientSession, host: str) -> dict[str, str]:
    """Check that host speaks Solar API v1 and return the inverter identity. @zara"""
    root = base_url(host)
    version = await fetch_json(session, f"{root}{fronius.API_VERSION_PATH}")
    if version.get("APIVersion") != 1:
        raise ValueError("not a Fronius Solar API v1 device")
    api = f"{root}{version.get('BaseURL') or '/solar_api/v1/'}"
    identity = fronius.inverter_identity(
        await fetch_json(session, f"{api}{fronius.REQUESTS['inverter_info']}")
    )
    if identity is None:
        raise ValueError("no inverter reported")
    return identity


class FroniusCoordinator(DataUpdateCoordinator[dict[str, fronius.FroniusDevice]]):
    """Fetch power flow, inverter, meter and storage data in one cycle. @zara"""

    vendor = fronius

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, fronius.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Fronius {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self._session = async_get_clientsession(hass)
        self._api: str | None = None
        self._modbus = bool(entry.options.get(CONF_MODBUS, MODBUS_DEFAULT))
        # (wire address, length) of model 160 once found
        self._mppt_model: tuple[int, int] | None = None
        self._modbus_retry_at = 0.0
        # Datamanager devices: last archive answer, when it was fetched, strings seen
        self._archive: Any = None
        self._archive_at = 0.0
        self._archive_channels: set[int] = set()

    async def _async_update_data(self) -> dict[str, fronius.FroniusDevice]:
        try:
            if self._api is None:
                root = base_url(self.host)
                version = await fetch_json(
                    self._session, f"{root}{fronius.API_VERSION_PATH}"
                )
                self._api = f"{root}{version.get('BaseURL') or '/solar_api/v1/'}"
            info = await fetch_json(
                self._session, f"{self._api}{fronius.REQUESTS['inverter_info']}"
            )
        except (ClientError, TimeoutError, ValueError, TypeError) as err:
            raise UpdateFailed(f"Fronius at {self.host} not reachable: {err}") from err
        identity = fronius.inverter_identity(info)
        if identity is None:
            raise UpdateFailed(f"Fronius at {self.host} reported no inverter")
        keys = ("powerflow", "inverter", "meter", "storage")
        results = await asyncio.gather(
            *(
                fetch_json(
                    self._session,
                    self._api
                    + fronius.REQUESTS[key].format(device_id=identity["device_id"]),
                )
                for key in keys
            ),
            return_exceptions=True,
        )
        responses: dict[str, Any] = {"inverter_info": info}
        for key, result in zip(keys, results, strict=True):
            if isinstance(result, Exception):
                LOGGER.debug("Fronius %s request failed: %s", key, result)
                continue
            responses[key] = result
        if "powerflow" not in responses and "inverter" not in responses:
            raise UpdateFailed(f"Fronius at {self.host} returned no realtime data")
        if fronius.needs_archive(fronius.inverter_common(responses.get("inverter"))):
            await self._async_add_archive_strings(responses, identity["device_id"])
        if self._modbus and time.monotonic() >= self._modbus_retry_at:
            modules = await self._async_read_mppt_model()
            if modules:
                responses["sunspec_mppt"] = modules
        return fronius.build_devices(responses)

    async def _async_add_archive_strings(
        self, responses: dict[str, Any], device_id: str
    ) -> None:
        """Add per-string values from the 5-minute archive of a Datamanager. @zara"""
        now = dt_util.now()
        if time.monotonic() - self._archive_at >= fronius.ARCHIVE_INTERVAL_SECONDS:
            self._archive_at = time.monotonic()
            url = self._api + fronius.REQUESTS["archive_strings"].format(
                day=now.strftime("%d.%m.%Y")
            )
            try:
                self._archive = await fetch_json(self._session, url)
            except (ClientError, TimeoutError, ValueError, TypeError) as err:
                LOGGER.debug("Fronius %s archive request failed: %s", self.host, err)
        seconds = now.hour * 3600 + now.minute * 60 + now.second
        strings = fronius.archive_strings(self._archive, device_id, seconds)
        self._archive_channels.update(strings)
        responses["dc_strings"] = strings
        responses["dc_string_channels"] = set(self._archive_channels)

    async def _async_read_mppt_model(self) -> list[sunspec.Module]:
        """Read SunSpec model 160 over Modbus TCP; never fails the cycle. @zara"""
        try:
            host = fronius_host(self.host)
            async with (
                asyncio.timeout(MODBUS_TIMEOUT_SECONDS),
                ModbusTcpClient(host, MODBUS_PORT, MODBUS_UNIT_ID, timeout=5) as client,
            ):
                if self._mppt_model is None:
                    self._mppt_model = await _find_model(client, sunspec.MPPT_MODEL)
                if self._mppt_model is None:
                    raise ModbusError("no SunSpec model 160")
                address, length = self._mppt_model
                block = await client.read(
                    address, min(length + 2, 125), READ_HOLDING_REGISTERS
                )
            modules = sunspec.parse_mppt(block)
        except (*MODBUS_ERRORS, ValueError, OverflowError) as err:
            LOGGER.debug("Fronius %s Modbus TCP not used: %s", self.host, err)
            self._mppt_model = None
            self._modbus_retry_at = time.monotonic() + MODBUS_RETRY_SECONDS
            return []
        if sunspec.pv_energy_kwh(modules) is None:
            # model 160 present but not filled (Datamanager): ask again much later
            self._modbus_retry_at = time.monotonic() + MODBUS_RETRY_SECONDS
            return []
        return modules


def fronius_host(host: str) -> str:
    """Host of the Solar API address for the Modbus connection. @zara

    Parsed like the HTTP request (user info, port and path dropped), so Modbus
    always goes to the same machine as the Solar API.
    """
    try:
        hostname = urlsplit(base_url(host)).hostname
    except ValueError:
        hostname = None
    if not hostname:
        raise ValueError("no host in the Fronius address")
    return hostname


async def _find_model(client: ModbusTcpClient, model_id: int) -> tuple[int, int] | None:
    """Walk the SunSpec model chain and return (address, length) of a model. @zara"""
    marker = await client.read(sunspec.SUNS_ADDRESS, 2, READ_HOLDING_REGISTERS)
    if not sunspec.is_sunspec(marker):
        return None
    address = sunspec.CHAIN_START
    for _ in range(sunspec.MAX_MODELS):
        current, length = await client.read(address, 2, READ_HOLDING_REGISTERS)
        if current == sunspec.CHAIN_END:
            return None
        if current == model_id:
            return address, length
        address += length + 2
    return None
