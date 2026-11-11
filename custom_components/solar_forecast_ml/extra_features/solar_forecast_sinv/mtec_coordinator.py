# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Read an M-TEC heat-pump controller over Modbus TCP. Holding registers only. @zara

Port 502 and unit 1 are the controller defaults. The Modbus server starts with
the first socket, so the first answer may take up to 10 s. The device serial
comes from the config entry id, not from the host.
"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .kostal_coordinator import CONF_UNIT_ID
from .modbus_tcp import READ_HOLDING_REGISTERS, ModbusError, ModbusTcpClient
from .stiebel_isg_coordinator import bind_identity, normalize_host
from .stiebel_isg_coordinator import same_target as _same_target
from .vendors import mtec

CYCLE_TIMEOUT_SECONDS = 25.0
# the first answer after a new socket may take up to 10 s
READ_TIMEOUT_SECONDS = 12.0
# Modbus exception 1 = illegal function, 2 = illegal data address.
INACTIVE_CODES = (1, 2)
_TOTAL_ROLES = (
    "hp_energy_thermal_total",
    "hp_energy_electric_total",
    "hp_runtime_total",
)


class MtecError(Exception):
    """The controller could not be read. ``code`` selects the setup text. @zara"""

    def __init__(self, code: str) -> None:
        """Store the config-flow code. @zara"""
        self.code = code
        super().__init__(code)


def same_target(
    entries, host: str, port: int, unit_id: int, *, skip: str | None
) -> bool:
    """Return True when another M-TEC entry already uses this target. @zara"""
    return _same_target(entries, host, port, unit_id, skip=skip, vendor=mtec.VENDOR)


def setup_code(err: Exception) -> str:
    """Map a probe failure onto one config-flow error code. @zara"""
    if isinstance(err, MtecError):
        return err.code
    if isinstance(err, ModbusError) and err.code in INACTIVE_CODES:
        return "mtec_modbus_inactive"
    if isinstance(err, ModbusError):
        return "mtec_modbus_error"
    return "mtec_unreachable"


def _client(host: str, port: int, unit_id: int) -> ModbusTcpClient:
    return ModbusTcpClient(
        host,
        port,
        unit_id,
        timeout=READ_TIMEOUT_SECONDS,
        min_gap=mtec.REQUEST_GAP_SECONDS,
    )


async def _read_block(
    client: ModbusTcpClient, start: int, count: int
) -> dict[int, int]:
    values = await client.read(start, count, READ_HOLDING_REGISTERS)
    return {start + offset: value for offset, value in enumerate(values)}


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read the heat-pump state once. Raises when Modbus is not available. @zara"""
    host = normalize_host(host)
    try:
        async with (
            asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
            _client(host, port, unit_id) as client,
        ):
            await _read_block(client, *mtec.PROBE_BLOCK)
    except ModbusError as err:
        code = setup_code(err)
        LOGGER.warning("M-TEC %s at %s", code, host)
        raise MtecError(code) from err
    except (OSError, EOFError) as err:
        LOGGER.warning("M-TEC mtec_unreachable at %s", host)
        raise MtecError("mtec_unreachable") from err
    return {"host": host, "port": port, "unit_id": unit_id}


def _scan_seconds(entry: ConfigEntry) -> int:
    raw = entry.options.get(CONF_SCAN_INTERVAL, mtec.DEFAULT_SCAN_SECONDS)
    try:
        seconds = int(raw)
    except (TypeError, ValueError):
        return mtec.DEFAULT_SCAN_SECONDS
    if seconds < mtec.MIN_SCAN_SECONDS:
        return mtec.MIN_SCAN_SECONDS
    return min(seconds, 300)


class MtecCoordinator(DataUpdateCoordinator[dict[str, mtec.MtecDevice]]):
    """Poll one M-TEC controller. Backward totals keep the last value. @zara"""

    vendor = mtec

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Bind the stable serial and take the scan interval from the entry. @zara"""
        self._serial = bind_identity(hass, entry)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name="S-INV M-TEC",
            update_interval=timedelta(seconds=_scan_seconds(entry)),
        )
        self._previous: dict[str, float] = {}
        self._optional = list(mtec.OPTIONAL_BLOCKS)

    async def _async_update_data(self) -> dict[str, mtec.MtecDevice]:
        data = self.config_entry.data
        host = str(data[CONF_HOST])
        port = int(data.get(CONF_PORT, mtec.DEFAULT_PORT))
        unit_id = int(data.get(CONF_UNIT_ID, mtec.DEFAULT_UNIT_ID))
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(host, port, unit_id) as client,
            ):
                registers: dict[int, int] = {}
                for start, count in mtec.READ_BLOCKS:
                    registers.update(await _read_block(client, start, count))
                for block in list(self._optional):
                    try:
                        registers.update(await _read_block(client, *block))
                    except ModbusError as err:
                        # tank, buffer or room circuit not configured
                        if err.code in INACTIVE_CODES:
                            self._optional.remove(block)
                        LOGGER.debug("M-TEC optional block %s: %s", block, err)
        except (ModbusError, OSError, EOFError) as err:
            LOGGER.warning("M-TEC %s at %s", setup_code(err), host)
            raise UpdateFailed("M-TEC read failed") from err
        device = mtec.build_device(
            registers, serial=self._serial, previous=self._previous
        )
        for role in _TOTAL_ROLES:
            if role in device.roles:
                self._previous[role] = float(device.roles[role])
        return {device.serial: device}
