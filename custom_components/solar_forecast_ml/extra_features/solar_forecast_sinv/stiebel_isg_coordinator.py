# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Read a Stiebel Eltron ISG over Modbus TCP. Input registers only. @zara

Port 502 and unit 1 are the ISG defaults. Three reads per cycle, with a short
gap. The device serial comes from the config entry id, not from the host.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_VENDOR, LOGGER
from .contract import hp_entry_serial
from .kostal_coordinator import CONF_UNIT_ID
from .modbus_tcp import READ_INPUT_REGISTERS, ModbusError, ModbusTcpClient
from .vendors import stiebel_isg

CYCLE_TIMEOUT_SECONDS = 20.0
READ_TIMEOUT_SECONDS = 5.0
# Modbus exception 1 = illegal function, 2 = illegal data address.
INACTIVE_CODES = (1, 2)
_TOTAL_ROLES = (
    "hp_energy_thermal_heating_total",
    "hp_energy_thermal_dhw_total",
    "hp_energy_electric_heating_total",
    "hp_energy_electric_dhw_total",
)


class StiebelError(Exception):
    """The ISG could not be read. ``code`` selects the setup text. @zara"""

    def __init__(self, code: str) -> None:
        """Store the config-flow code. @zara"""
        self.code = code
        super().__init__(code)


def normalize_host(raw: str) -> str:
    """Return a host name or address, or raise ValueError. @zara"""
    if not isinstance(raw, str):
        raise TypeError("invalid host")
    text = raw.strip()
    if not text or any(char in text for char in " \t\r\n\\/?#@"):
        raise ValueError("invalid host")
    if "://" in text or text.startswith("//"):
        raise ValueError("invalid host")
    return text


def bind_identity(hass: HomeAssistant, entry: ConfigEntry) -> str:
    """Point the config-entry unique_id at the entry-id serial. @zara"""
    serial = hp_entry_serial(entry.entry_id)
    if getattr(entry, "unique_id", None) != serial:
        hass.config_entries.async_update_entry(entry, unique_id=serial)
    return serial


def same_target(
    entries, host: str, port: int, unit_id: int, *, skip: str | None
) -> bool:
    """Return True when another ISG entry already uses this target. @zara"""
    wanted = normalize_host(host).casefold()
    for entry in entries:
        if getattr(entry, "entry_id", None) == skip:
            continue
        data = getattr(entry, "data", None) or {}
        if data.get(CONF_VENDOR) != stiebel_isg.VENDOR:
            continue
        try:
            other = normalize_host(str(data.get(CONF_HOST, ""))).casefold()
        except (TypeError, ValueError):
            continue
        if (
            other == wanted
            and int(data.get(CONF_PORT, 0)) == port
            and int(data.get(CONF_UNIT_ID, 0)) == unit_id
        ):
            return True
    return False


def setup_code(err: Exception) -> str:
    """Map a probe failure onto one config-flow error code. @zara"""
    if isinstance(err, StiebelError):
        return err.code
    if isinstance(err, ModbusError) and err.code in INACTIVE_CODES:
        return "stiebel_modbus_inactive"
    if isinstance(err, ModbusError):
        return "stiebel_modbus_error"
    return "stiebel_unreachable"


def _client(host: str, port: int, unit_id: int) -> ModbusTcpClient:
    return ModbusTcpClient(
        host,
        port,
        unit_id,
        timeout=READ_TIMEOUT_SECONDS,
        min_gap=stiebel_isg.REQUEST_GAP_SECONDS,
    )


async def _read_block(
    client: ModbusTcpClient, start: int, count: int
) -> dict[int, int]:
    """Read one input block at the table address minus one. @zara"""
    values = await client.read(
        start - stiebel_isg.WIRE_OFFSET, count, READ_INPUT_REGISTERS
    )
    return {start + offset: value for offset, value in enumerate(values)}


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read the outdoor register once. Raises when Modbus is not available. @zara"""
    host = normalize_host(host)
    try:
        async with (
            asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
            _client(host, port, unit_id) as client,
        ):
            await _read_block(client, *stiebel_isg.PROBE_BLOCK)
    except ModbusError as err:
        code = setup_code(err)
        LOGGER.warning("Stiebel ISG %s at %s", code, host)
        raise StiebelError(code) from err
    except (OSError, EOFError) as err:
        LOGGER.warning("Stiebel ISG stiebel_unreachable at %s", host)
        raise StiebelError("stiebel_unreachable") from err
    return {"host": host, "port": port, "unit_id": unit_id}


def _scan_seconds(entry: ConfigEntry) -> int:
    raw = entry.options.get(CONF_SCAN_INTERVAL, stiebel_isg.DEFAULT_SCAN_SECONDS)
    try:
        seconds = int(raw)
    except (TypeError, ValueError):
        return stiebel_isg.DEFAULT_SCAN_SECONDS
    if seconds < stiebel_isg.MIN_SCAN_SECONDS:
        return stiebel_isg.MIN_SCAN_SECONDS
    return min(seconds, 300)


class StiebelCoordinator(DataUpdateCoordinator[dict[str, stiebel_isg.StiebelDevice]]):
    """Poll one ISG. Totals that jump backwards are kept for the next cycle. @zara"""

    vendor = stiebel_isg

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Bind the stable serial and take the scan interval from the entry. @zara"""
        self._serial = bind_identity(hass, entry)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name="S-INV Stiebel ISG",
            update_interval=timedelta(seconds=_scan_seconds(entry)),
        )
        self._previous: dict[str, float] = {}

    async def _async_update_data(self) -> dict[str, stiebel_isg.StiebelDevice]:
        data = self.config_entry.data
        host = str(data[CONF_HOST])
        port = int(data.get(CONF_PORT, stiebel_isg.DEFAULT_PORT))
        unit_id = int(data.get(CONF_UNIT_ID, stiebel_isg.DEFAULT_UNIT_ID))
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(host, port, unit_id) as client,
            ):
                registers: dict[int, int] = {}
                for start, count in stiebel_isg.READ_BLOCKS:
                    registers.update(await _read_block(client, start, count))
        except (ModbusError, OSError, EOFError) as err:
            LOGGER.warning("Stiebel ISG %s at %s", setup_code(err), host)
            raise UpdateFailed("Stiebel ISG read failed") from err
        device = stiebel_isg.build_device(
            registers, serial=self._serial, previous=self._previous
        )
        for role in _TOTAL_ROLES:
            if role in device.roles:
                self._previous[role] = float(device.roles[role])
        return {device.serial: device}
