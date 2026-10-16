# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for SolaX hybrid inverters over Modbus TCP. @zara"""

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
from .modbus_tcp import (
    READ_HOLDING_REGISTERS,
    READ_INPUT_REGISTERS,
    ModbusError,
    ModbusTcpClient,
)
from .vendors import solax


async def read_blocks(
    client: ModbusTcpClient, blocks: tuple[tuple[int, int], ...], function: int
) -> dict[int, int]:
    """Read register blocks of one function code into an address map. @zara"""
    registers: dict[int, int] = {}
    for start, count in blocks:
        for offset, value in enumerate(await client.read(start, count, function)):
            registers[start + offset] = value
    return registers


def _client(host: str, port: int, unit_id: int) -> ModbusTcpClient:
    return ModbusTcpClient(host, port, unit_id, min_gap=solax.REQUEST_GAP_SECONDS)


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read serial and model; raises if no SolaX inverter answers. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        _client(host.strip(), port, unit_id) as client,
    ):
        holding = await read_blocks(
            client, solax.IDENTITY_BLOCKS, READ_HOLDING_REGISTERS
        )
    ident = solax.identity(holding)
    if ident is None:
        raise ValueError("no SolaX serial number")
    return {**ident, "data": {CONF_PORT: port, CONF_UNIT_ID: unit_id}}


class SolaxCoordinator(DataUpdateCoordinator[dict[str, solax.SolaxDevice]]):
    """Read identity once and the real-time input registers per cycle. @zara"""

    vendor = solax

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, solax.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV SolaX {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, solax.DEFAULT_PORT))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, solax.DEFAULT_UNIT_ID))
        self._holding: dict[int, int] = {}
        self._optional = list(solax.OPTIONAL_INPUT_BLOCKS)

    async def _async_update_data(self) -> dict[str, solax.SolaxDevice]:
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(self.host, self.port, self.unit_id) as client,
            ):
                if not self._holding:
                    self._holding = await read_blocks(
                        client, solax.IDENTITY_BLOCKS, READ_HOLDING_REGISTERS
                    )
                inputs = await read_blocks(
                    client, solax.INPUT_BLOCKS, READ_INPUT_REGISTERS
                )
                for block in list(self._optional):
                    try:
                        inputs.update(
                            await read_blocks(client, (block,), READ_INPUT_REGISTERS)
                        )
                    except ModbusError as err:
                        # models with two PV inputs have no PV3 registers
                        if err.code in UNSUPPORTED_CODES:
                            self._optional.remove(block)
                        else:
                            LOGGER.debug("SolaX optional block %s: %s", block, err)
                    except (TimeoutError, EOFError) as err:
                        # some dongles stay silent on missing registers; the block
                        # is the last request, so the main data stay valid
                        LOGGER.debug("SolaX optional block %s dropped: %s", block, err)
                        self._optional.remove(block)
                        break
        except READ_ERRORS as err:
            raise UpdateFailed(
                f"SolaX at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = solax.build_devices(self._holding, inputs)
        if not devices:
            raise UpdateFailed(f"SolaX at {self.host} reported no serial number")
        return devices
