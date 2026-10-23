# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Read Bosch/Buderus heat pumps from a local EMS-ESP gateway. @zara

GET only, on the Home Assistant aiohttp session. No access token, no request
body, no redirect. The scheme is always http. The host is a hostname or an
IP address, with an optional port, and nothing else.

EMS-ESP 3.8.6 answered HTTP 429 on the thermostat 0.21 s after the previous
GET (tester 2026-10-23). Requests in one probe or poll therefore wait 1 s
apart, which stays above that gap. Two gaps plus three reads fit in the 15 s
minimum scan. A 429 waits for Retry-After, capped at 10 s, or 2 s when the
header is missing, and is tried at most twice more. The poll stops at 12 s
instead of hanging. A throttled boiler fails the cycle. A throttled
thermostat or heatpump is left out of that cycle. Nothing is stored as 0.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from datetime import timedelta
from ipaddress import ip_address
from typing import Any, NoReturn
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientSession, ClientTimeout
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_VENDOR, LOGGER
from .contract import hp_entry_serial
from .vendors import emsesp

REQUEST_TIMEOUT = ClientTimeout(total=10)
MAX_BYTES = 256 * 1024
ACCEPT = {"Accept": "application/json"}
# Tester 2026-10-23: 429 after 0.21 s. One second between GETs stays clear of it.
PAUSE_SECONDS = 1.0
RETRY_AFTER_CAP = 10.0
RETRY_FALLBACK = 2.0
MAX_RETRIES = 2
# Under the 15 s minimum scan, so a throttled poll cannot overlap the next one.
POLL_BUDGET_SECONDS = 12.0
# EMS-ESP never drops a detected device at runtime, so HTTP 400/404 ("unknown device")
# means "not detected since the gateway booted". Re-check it later instead of every poll.
ABSENT_RECHECK_SECONDS = 1800.0
BOILER_VALUES = "/api/boiler/values"
THERMOSTAT_VALUES = "/api/thermostat/values"
HEATPUMP_VALUES = "/api/heatpump/values"
HPPOWER_DETAIL = "/api/boiler/hppower"
_VALUE_PATHS = (BOILER_VALUES, THERMOSTAT_VALUES, HEATPUMP_VALUES)
_LABEL = re.compile(r"[A-Za-z0-9-]{1,63}")
_SETUP_CODES = frozenset(
    {
        "emsesp_unreachable",
        "emsesp_forbidden",
        "emsesp_busy",
        "emsesp_no_heat_pump",
        "emsesp_bad_response",
    }
)


class EmsespError(Exception):
    """The gateway did not return a usable read. ``code`` selects the text. @zara"""

    def __init__(
        self,
        message: str,
        *,
        code: str = "emsesp_bad_response",
        retry_after: float | None = None,
    ) -> None:
        """Store the config-flow code and an optional retry delay. @zara"""
        self.code = code
        self.retry_after = retry_after
        super().__init__(message)


def normalize_host(raw: str) -> str:
    """Return a canonical host, or raise ValueError. @zara

    Accept a hostname, an IPv4 address or an IPv6 address, and an optional
    port. Reject a scheme, userinfo, path, query or fragment. Port 80 is
    omitted because every request uses http.
    """
    if not isinstance(raw, str):
        raise TypeError("invalid host")
    text = raw.strip()
    if not text or any(char in text for char in " \t\r\n\\/?#@"):
        raise ValueError("invalid host")
    if "://" in text or text.startswith("//"):
        raise ValueError("invalid host")
    parts = urlsplit(f"//{text}")
    if (
        parts.username
        or parts.password
        or parts.query
        or parts.fragment
        or parts.path not in ("", "/")
    ):
        raise ValueError("invalid host")
    try:
        port = parts.port
    except ValueError as err:
        raise ValueError("invalid host") from err
    hostname = parts.hostname
    if hostname is None or not _is_host(hostname):
        raise ValueError("invalid host")
    if ":" in hostname:
        host = f"[{hostname}]"
    else:
        host = hostname
    if port is None or port == 80:
        return host
    return f"{host}:{port}"


def bind_hp_identity(hass, entry) -> str:
    """Point the config-entry unique_id at the entry-id serial. @zara"""
    serial = hp_entry_serial(entry.entry_id)
    if getattr(entry, "unique_id", None) != serial:
        hass.config_entries.async_update_entry(entry, unique_id=serial)
    return serial


def host_in_use(entries, host: str, *, skip_entry_id: str | None = None) -> bool:
    """Return True when another EMS-ESP entry already uses this host. @zara"""
    target = normalize_host(host)
    for entry in entries:
        if getattr(entry, "entry_id", None) == skip_entry_id:
            continue
        data = getattr(entry, "data", None) or {}
        if data.get(CONF_VENDOR) != emsesp.VENDOR:
            continue
        try:
            other = normalize_host(str(data.get(CONF_HOST, "")))
        except (TypeError, ValueError):
            continue
        if other == target:
            return True
    return False


def base_url(host: str) -> str:
    """Return the http URL of a validated host. @zara"""
    return "http://" + normalize_host(host)


def decode_object(raw: bytes) -> dict[str, Any]:
    """Parse a JSON object. Anything else is an empty object. @zara"""
    parsed = _parse_object(raw)
    if parsed is None:
        return {}
    return parsed


def _now() -> float:
    """Return monotonic seconds. Tests replace this. @zara"""
    return time.monotonic()


async def _pause(seconds: float) -> None:
    """Wait between requests or retries. Tests replace this. @zara"""
    await asyncio.sleep(seconds)


def _parse_object(raw: bytes) -> dict[str, Any] | None:
    """Return a JSON object, or None when the body is not one. @zara"""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, RecursionError, ValueError, UnicodeError):
        return None
    if isinstance(data, dict):
        return data
    return None


def _retry_delay(response: Any) -> float:
    """Read Retry-After as seconds and cap it. Anything else waits 2 s. @zara"""
    headers = getattr(response, "headers", None)
    raw = headers.get("Retry-After") if headers is not None else None
    try:
        seconds = float(raw)
    except (TypeError, ValueError):
        return RETRY_FALLBACK
    if seconds <= 0:
        return RETRY_FALLBACK
    return min(seconds, RETRY_AFTER_CAP)


def _fail(host: str, message: str, code: str) -> NoReturn:
    """Log the cause once and raise. The body is not logged. @zara"""
    LOGGER.warning("EMS-ESP %s at %s", code, host)
    raise EmsespError(message, code=code)


def setup_code(err: Exception) -> str:
    """Map a probe failure onto one config-flow error code. @zara"""
    code = getattr(err, "code", None)
    if isinstance(err, EmsespError) and code in _SETUP_CODES:
        return code
    if isinstance(err, (TimeoutError, ClientError, TypeError, ValueError)):
        return "emsesp_unreachable"
    return "emsesp_bad_response"


def _budget_left(started: float, delay: float) -> bool:
    return _now() + delay - started <= POLL_BUDGET_SECONDS


async def _gap(started: float, host: str) -> None:
    """Pause before the next GET, or stop when the poll budget is spent. @zara"""
    if not _budget_left(started, PAUSE_SECONDS):
        _fail(host, "http 429", "emsesp_busy")
    await _pause(PAUSE_SECONDS)


async def _get_once(
    session: ClientSession, url: str, host: str
) -> dict[str, Any] | None:
    """GET one JSON object. None means HTTP 400 or 404. @zara"""
    async with session.get(
        url,
        allow_redirects=False,
        timeout=REQUEST_TIMEOUT,
        headers=ACCEPT,
    ) as response:
        status = response.status
        if 300 <= status < 400:
            _fail(host, "redirect", "emsesp_bad_response")
        if status in (400, 404):
            return None
        if status == 429:
            raise EmsespError(
                "http 429",
                code="emsesp_busy",
                retry_after=_retry_delay(response),
            )
        if status in (401, 403):
            _fail(host, f"http {status}", "emsesp_forbidden")
        if status != 200:
            _fail(host, f"http {status}", "emsesp_bad_response")
        body = bytearray()
        async for chunk in response.content.iter_chunked(8192):
            if len(body) + len(chunk) > MAX_BYTES:
                _fail(host, "response too large", "emsesp_bad_response")
            body.extend(chunk)
    parsed = _parse_object(bytes(body))
    if parsed is None:
        _fail(host, "not json", "emsesp_bad_response")
    return parsed


async def _get_retry(
    session: ClientSession, url: str, host: str, started: float
) -> dict[str, Any] | None:
    """GET one path. HTTP 429 is retried twice, then reported. @zara"""
    for attempt in range(MAX_RETRIES + 1):
        if _now() - started > POLL_BUDGET_SECONDS:
            break
        try:
            return await _get_once(session, url, host)
        except EmsespError as err:
            if err.code != "emsesp_busy":
                raise
            delay = RETRY_FALLBACK if err.retry_after is None else err.retry_after
            if attempt >= MAX_RETRIES or not _budget_left(started, delay):
                break
            await _pause(delay)
    _fail(host, "http 429", "emsesp_busy")


async def async_probe(session: ClientSession, host: str) -> dict[str, Any]:
    """Read the gateway once and return host, unit and circuits. @zara"""
    host = normalize_host(host)
    started = _now()
    boiler, thermostat, heatpump = await _read_values(
        session, host, started, strict=True
    )
    await _gap(started, host)
    detail = await _get_retry(session, "http://" + host + HPPOWER_DETAIL, host, started)
    unit = emsesp.unit_from_detail(detail)
    if unit is None:
        unit = emsesp.default_hppower_unit(boiler, heatpump)
    return {
        "host": host,
        "unit": unit,
        "circuits": emsesp.heating_circuits(thermostat),
    }


async def async_read(
    session: ClientSession,
    entry: ConfigEntry,
    absent: dict[str, float] | None = None,
) -> emsesp.EmsespDevice:
    """Poll the three value paths and parse them. @zara"""
    host = normalize_host(str(entry.data[CONF_HOST]))
    boiler, thermostat, heatpump = await _read_values(
        session, host, _now(), strict=False, absent=absent
    )
    circuit = entry.options.get(
        emsesp.CONF_CIRCUIT, entry.data.get(emsesp.CONF_CIRCUIT)
    )
    return emsesp.build_device(
        boiler,
        thermostat,
        heatpump,
        serial=hp_entry_serial(entry.entry_id),
        hppower_unit=entry.data.get(emsesp.CONF_HPPOWER_UNIT),
        circuit=circuit or None,
    )


async def _read_values(
    session: ClientSession,
    host: str,
    started: float,
    *,
    strict: bool,
    absent: dict[str, float] | None = None,
):
    """Read boiler, thermostat and heatpump. @zara

    Setup (``strict``) reports a remaining 429. A poll keeps boiler values
    when only the thermostat or the heatpump is throttled. ``absent`` maps a
    path that answered 400/404 to its re-check time; until then it is skipped.
    """
    root = "http://" + host
    payloads: list[dict[str, Any] | None] = []
    fetched = False
    for index, path in enumerate(_VALUE_PATHS):
        if absent is not None and absent.get(path, 0.0) > _now():
            payloads.append(None)
            continue
        if fetched:
            try:
                await _gap(started, host)
            except EmsespError as err:
                if strict or err.code != "emsesp_busy":
                    raise
                payloads.extend([None] * (len(_VALUE_PATHS) - index))
                break
        fetched = True
        try:
            payload = await _get_retry(session, root + path, host, started)
        except EmsespError as err:
            if strict or index == 0 or err.code != "emsesp_busy":
                raise
            payloads.append(None)
            continue
        payloads.append(payload)
        if absent is None:
            continue
        if payload is None:
            if path not in absent:
                LOGGER.debug(
                    "EMS-ESP %s absent, re-check in %.0f s",
                    path,
                    ABSENT_RECHECK_SECONDS,
                )
            absent[path] = _now() + ABSENT_RECHECK_SECONDS
        else:
            absent.pop(path, None)
    boiler, thermostat, heatpump = payloads
    if _blank(boiler) and _blank(heatpump):
        if absent is not None:
            # Nothing usable is left: read every path again on the next poll.
            absent.clear()
        _fail(host, "no heat pump", "emsesp_no_heat_pump")
    return boiler or {}, thermostat or {}, heatpump or {}


def _blank(payload: dict[str, Any] | None) -> bool:
    return payload is None or payload == {}


def _is_host(hostname: str) -> bool:
    try:
        ip_address(hostname)
        return True
    except ValueError:
        pass
    if len(hostname) > 253:
        return False
    labels = hostname.split(".")
    return all(
        _LABEL.fullmatch(label)
        and not label.startswith("-")
        and not label.endswith("-")
        for label in labels
    )


class EmsespCoordinator(DataUpdateCoordinator[dict[str, emsesp.EmsespDevice]]):
    """Poll one EMS-ESP gateway. @zara"""

    vendor = emsesp

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Take the interval from the entry options. @zara"""
        bind_hp_identity(hass, entry)
        seconds = entry.options.get(CONF_SCAN_INTERVAL, emsesp.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name="S-INV EMS-ESP",
            update_interval=timedelta(seconds=seconds),
        )
        self._session = async_get_clientsession(hass)
        # In memory only: a reload or restart reads every path again.
        self._absent: dict[str, float] = {}

    async def _async_update_data(self) -> dict[str, emsesp.EmsespDevice]:
        try:
            device = await async_read(self._session, self.config_entry, self._absent)
        except (EmsespError, ClientError, TimeoutError) as err:
            if not isinstance(err, EmsespError):
                LOGGER.warning(
                    "EMS-ESP emsesp_unreachable at %s",
                    self.config_entry.data.get(CONF_HOST, ""),
                )
            raise UpdateFailed("EMS-ESP read failed") from err
        return {device.serial: device}
