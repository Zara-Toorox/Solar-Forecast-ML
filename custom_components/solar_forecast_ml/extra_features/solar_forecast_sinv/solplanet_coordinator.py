# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for one Solplanet inverter over Modbus TCP. @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .kostal_coordinator import (
    CONF_UNIT_ID,
    CYCLE_TIMEOUT_SECONDS,
    READ_ERRORS,
    UNSUPPORTED_CODES,
)
from .modbus_tcp import READ_INPUT_REGISTERS, ModbusError, ModbusTcpClient
from .vendors import solplanet


def _client(host: str, port: int, unit_id: int) -> ModbusTcpClient:
    return ModbusTcpClient(host, port, unit_id, min_gap=solplanet.REQUEST_GAP_SECONDS)


async def read_blocks(
    client: ModbusTcpClient, blocks: tuple[tuple[int, int], ...]
) -> dict[int, int]:
    """Read input-register blocks (function 0x04) into an address map. @zara"""
    registers: dict[int, int] = {}
    for start, count in blocks:
        values = await client.read(start, count, READ_INPUT_REGISTERS)
        for offset, value in enumerate(values):
            registers[start + offset] = value
    return registers


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read serial and model; raises if no Solplanet inverter answers. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        _client(host.strip(), port, unit_id) as client,
    ):
        regs = await read_blocks(client, solplanet.IDENTITY_BLOCKS)
    ident = solplanet.identity(regs)
    if ident is None:
        raise ValueError(solplanet.reject_reason(regs) or "no Solplanet serial number")
    return {
        **ident,
        "data": {CONF_PORT: port, CONF_UNIT_ID: unit_id},
    }


class SolplanetCoordinator(DataUpdateCoordinator[dict[str, solplanet.SolplanetDevice]]):
    """Read the running input registers of one Solplanet inverter per cycle. @zara"""

    vendor = solplanet

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, solplanet.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Solplanet {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, solplanet.DEFAULT_PORT))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, solplanet.DEFAULT_UNIT_ID))
        self._optional: list[tuple[int, int]] | None = None

    async def _async_update_data(self) -> dict[str, solplanet.SolplanetDevice]:
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(self.host, self.port, self.unit_id) as client,
            ):
                regs = await read_blocks(
                    client, solplanet.IDENTITY_BLOCKS + solplanet.RUNNING_BLOCKS
                )
                if self._optional is None:
                    self._optional = list(solplanet.OPTIONAL_BLOCKS)
                for block in list(self._optional):
                    try:
                        regs.update(await read_blocks(client, (block,)))
                    except ModbusError as err:
                        if not client.connected:
                            raise
                        if err.code in UNSUPPORTED_CODES:
                            self._optional.remove(block)
                        else:
                            LOGGER.debug("Solplanet optional block %s: %s", block, err)
        except READ_ERRORS as err:
            if isinstance(err, TimeoutError):
                raise UpdateFailed(
                    f"Solplanet at {self.host}:{self.port} timed out"
                ) from err
            raise UpdateFailed(
                f"Solplanet at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = solplanet.build_devices(regs)
        if not devices:
            raise UpdateFailed(
                solplanet.reject_reason(regs)
                or f"Solplanet at {self.host} reported no serial number"
            )
        return devices
