# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Coordinator for an APsystems EZ1 microinverter in Local Mode (read only). @zara

Every read uses HTTP GET against the fixed read allow list in
``vendors.apsystems.READ_ENDPOINTS``. Redirects are refused, the response body
is capped and both endpoints are checked for the configured device serial.
``getDeviceInfo`` is checked before every output poll so a battery-input
firmware (``_b``) locks ``ac_source = "non_solar"`` and retires any prior PV
contribution before new values are published.
"""

from __future__ import annotations

import asyncio
from collections.abc import Mapping
import contextlib
from datetime import timedelta
from ipaddress import ip_address
import json
import re
from typing import Any

from aiohttp import ClientError, ClientSession, ClientTimeout

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from . import site
from .const import (
    AC_SOURCE_NON_SOLAR,
    CONF_AC_SOURCE,
    CONF_AC_SOURCE_STORAGE,
    LOGGER,
    SIGNAL_SITE_CONFIG_UPDATED,
)
from .vendors import apsystems

REQUEST_TIMEOUT_SECONDS = 10
REQUEST_TIMEOUT = ClientTimeout(total=REQUEST_TIMEOUT_SECONDS)
CYCLE_TIMEOUT_SECONDS = 30
READ_ERRORS = (ClientError, OSError, ValueError, TypeError)
_LABEL = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)$")


def normalize_host(raw: Any) -> str:
    """Return a canonical host without port, or raise DeviceRejected. @zara

    An IPv4 address, an IPv6 address (with or without brackets) or a
    hostname. A scheme, port, userinfo, path, query or whitespace is refused.
    """
    text = raw.strip() if isinstance(raw, str) else ""
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]
    if not text or len(text) > 253 or any(c in text for c in " \t\r\n\\/?#@[]"):
        raise apsystems.DeviceRejected("apsystems_invalid_host", "invalid host")
    try:
        return str(ip_address(text))
    except ValueError:
        pass
    host = text.lower().rstrip(".")
    if ":" in host or not host or not all(_LABEL.match(p) for p in host.split(".")):
        raise apsystems.DeviceRejected("apsystems_invalid_host", "invalid host")
    return host


def endpoint_url(host: str, port: int, endpoint: str) -> str:
    """URL of one read endpoint; any other endpoint is refused. @zara"""
    if endpoint not in apsystems.READ_ENDPOINTS:
        raise ValueError(f"endpoint {endpoint!r} is not a read endpoint")
    if isinstance(port, bool) or not isinstance(port, int) or not 0 < port < 65536:
        raise ValueError(f"invalid port {port!r}")
    address = normalize_host(host)
    if ":" in address:
        address = f"[{address}]"
    return f"http://{address}:{port}/{endpoint}"


async def fetch(
    session: ClientSession, host: str, port: int, endpoint: str
) -> dict[str, Any]:
    """GET one read endpoint and decode its JSON object. @zara

    A redirect, any status other than 200, an oversized or non-JSON answer
    raises ValueError or TypeError; network errors keep their own type.
    """
    url = endpoint_url(host, port, endpoint)
    async with asyncio.timeout(REQUEST_TIMEOUT_SECONDS):
        async with session.get(
            url, timeout=REQUEST_TIMEOUT, allow_redirects=False
        ) as response:
            if response.status != 200:
                raise ValueError(f"{endpoint} answered HTTP {response.status}")
            length = response.content_length
            if length is not None and length > apsystems.MAX_RESPONSE_BYTES:
                raise ValueError(f"{endpoint} answer is too large")
            raw = bytearray()
            async for chunk in response.content.iter_chunked(4096):
                raw.extend(chunk)
                if len(raw) > apsystems.MAX_RESPONSE_BYTES:
                    raise ValueError(f"{endpoint} answer is too large")
    try:
        data = json.loads(bytes(raw).decode("utf-8"))
    except UnicodeDecodeError as err:
        raise ValueError(f"{endpoint} answer is not UTF-8") from err
    if not isinstance(data, dict):
        raise TypeError(f"{endpoint} answer is not a JSON object")
    return data


async def async_probe(session: ClientSession, host: str, port: int) -> dict[str, Any]:
    """Identify an EZ1 in Local Mode; raises DeviceRejected or a read error. @zara"""
    address = normalize_host(host)
    info = apsystems.device_info(
        await fetch(session, address, port, apsystems.DEVICE_INFO)
    )
    non_solar = bool(info.get("non_solar"))
    data: dict[str, Any] = {
        CONF_HOST: address,
        CONF_PORT: port,
        apsystems.CONF_DEVICE_SERIAL: info["serial"],
    }
    if non_solar:
        data[CONF_AC_SOURCE] = AC_SOURCE_NON_SOLAR
    return {
        "serial": info["serial"],
        "name": info["name"],
        "model": info["model"],
        "non_solar": non_solar,
        "data": data,
    }


class ApsystemsCoordinator(DataUpdateCoordinator[dict[str, apsystems.ApsystemsDevice]]):
    """Read identity and output data of one EZ1 per cycle. @zara"""

    vendor = apsystems

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, apsystems.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV APsystems {entry.data[CONF_HOST]}",
            update_interval=timedelta(
                seconds=max(int(seconds), apsystems.MIN_SCAN_SECONDS)
            ),
        )
        self._entry = entry
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, apsystems.DEFAULT_PORT))
        self.serial = apsystems.serial_of(
            entry.data.get(apsystems.CONF_DEVICE_SERIAL)
        ) or _serial_from_unique_id(entry.unique_id)
        self._session = async_get_clientsession(hass)
        self._info: dict[str, Any] | None = None
        self._last_total: float | None = None
        self._non_solar_marked = False

    def _entry_data(self) -> dict[str, Any]:
        entry = getattr(self, "config_entry", None) or getattr(self, "_entry", None)
        data = getattr(entry, "data", None)
        return dict(data) if isinstance(data, Mapping) else {}

    def _entry_is_non_solar(self) -> bool:
        return self._entry_data().get(CONF_AC_SOURCE) == AC_SOURCE_NON_SOLAR

    def config_unchanged(self, entry: ConfigEntry) -> bool:
        """Return True when only AC-source metadata changed and no reload is needed. @zara"""
        seconds = int(
            entry.options.get(CONF_SCAN_INTERVAL, apsystems.DEFAULT_SCAN_SECONDS)
        )
        expected = timedelta(seconds=max(seconds, apsystems.MIN_SCAN_SECONDS))
        serial = apsystems.serial_of(
            entry.data.get(apsystems.CONF_DEVICE_SERIAL)
        ) or _serial_from_unique_id(entry.unique_id)
        return (
            entry.data.get(CONF_HOST) == self.host
            and int(entry.data.get(CONF_PORT, apsystems.DEFAULT_PORT)) == self.port
            and serial == self.serial
            and expected == self.update_interval
        )

    def _persist_non_solar(self) -> None:
        entry = getattr(self, "config_entry", None) or getattr(self, "_entry", None)
        if entry is None:
            return
        updated = {**self._entry_data(), CONF_AC_SOURCE: AC_SOURCE_NON_SOLAR}
        config_entries = getattr(self.hass, "config_entries", None)
        updater = getattr(config_entries, "async_update_entry", None)
        if callable(updater):
            updater(entry, data=updated)
        else:
            entry.data = updated

    def _notify_site_config_updated(self) -> None:
        if getattr(self.hass, "data", None) is None:
            return
        with contextlib.suppress(AttributeError, TypeError):
            async_dispatcher_send(self.hass, SIGNAL_SITE_CONFIG_UPDATED)

    async def _lock_non_solar(self, serial: str) -> None:
        """Retire prior PV total and persist non_solar before publishing values. @zara"""
        entry = getattr(self, "config_entry", None) or getattr(self, "_entry", None)
        await site.async_retire_solar_source(self.hass, entry, serial)
        self._persist_non_solar()
        self._last_total = None
        self._notify_site_config_updated()

    async def _get(self, endpoint: str) -> dict[str, Any]:
        return await fetch(self._session, self.host, self.port, endpoint)

    async def _async_update_data(self) -> dict[str, apsystems.ApsystemsDevice]:
        if not self._non_solar_marked and self.serial and self._entry_is_non_solar():
            try:
                await site.async_mark_non_solar(self.hass, self.serial)
            except Exception as err:
                LOGGER.warning(
                    "Could not mark APsystems %s as non_solar: %s", self.serial, err
                )
            else:
                self._non_solar_marked = True
        try:
            async with asyncio.timeout(CYCLE_TIMEOUT_SECONDS):
                info = apsystems.device_info(await self._get(apsystems.DEVICE_INFO))
                if self.serial and info["serial"] != self.serial:
                    raise UpdateFailed(
                        f"APsystems at {self.host} is a different device"
                    )
                persisted_non_solar = self._entry_is_non_solar()
                non_solar = persisted_non_solar or bool(info.get("non_solar"))
                if non_solar and not persisted_non_solar:
                    await self._lock_non_solar(info["serial"])
                self._info = info
                output = await self._get(apsystems.OUTPUT_DATA)
        except TimeoutError as err:
            self._info = None
            raise UpdateFailed(f"APsystems at {self.host} timed out") from err
        except READ_ERRORS as err:
            self._info = None
            raise UpdateFailed(f"APsystems at {self.host} not readable: {err}") from err
        if apsystems.answer_serial(output) != info["serial"]:
            self._info = None
            raise UpdateFailed(f"APsystems at {self.host} answered for another device")
        device = apsystems.build_device(info, output, non_solar=non_solar)
        if device is None:
            raise UpdateFailed(f"APsystems at {self.host} reported no output data")
        self._last_total = apsystems.accept_total(device, self._last_total)
        return {device.serial: device}

    def diagnostics(self) -> dict[str, Any]:
        """Return the cached identity for diagnostics; the caller redacts the serial. @zara"""
        info = self._info or {}
        entry_data = self._entry_data()
        return {
            "deviceId": info.get("serial"),
            "model": info.get("model"),
            "firmware": info.get("firmware"),
            "ac_source": entry_data.get(CONF_AC_SOURCE),
            "ac_source_storage": entry_data.get(CONF_AC_SOURCE_STORAGE),
            "last_total": self._last_total,
        }


def _serial_from_unique_id(unique_id: str | None) -> str:
    prefix = f"{apsystems.VENDOR}_"
    if isinstance(unique_id, str) and unique_id.startswith(prefix):
        return apsystems.serial_of(unique_id[len(prefix) :])
    return ""
