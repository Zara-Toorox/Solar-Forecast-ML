# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Sigenergy hybrid inverters over Modbus TCP. @zara"""

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
from .vendors import sigenergy


async def read_blocks(
    client: ModbusTcpClient, unit_id: int, blocks: tuple[tuple[int, int], ...]
) -> dict[int, int]:
    """Read input register blocks of one slave address into a register map. @zara"""
    # plant (247) and inverter share the TCP connection; the client checks the
    # unit id of every answer against this value
    client.unit_id = unit_id
    registers: dict[int, int] = {}
    for start, count in blocks:
        values = await client.read(start, count, READ_INPUT_REGISTERS)
        for offset, value in enumerate(values):
            registers[start + offset] = value
    return registers


def _client(host: str, port: int) -> ModbusTcpClient:
    return ModbusTcpClient(
        host,
        port,
        sigenergy.PLANT_UNIT_ID,
        min_gap=sigenergy.REQUEST_GAP_SECONDS,
    )


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read the inverter identity and the plant address; raises if either fails. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        _client(host.strip(), port) as client,
    ):
        inverter = await read_blocks(client, unit_id, sigenergy.IDENTITY_BLOCKS)
        plant = await read_blocks(
            client, sigenergy.PLANT_UNIT_ID, sigenergy.PLANT_PROBE_BLOCKS
        )
    ident = sigenergy.identity(inverter)
    if ident is None:
        raise ValueError("no Sigenergy serial number")
    if not sigenergy.is_plant(plant):
        raise ValueError("no Sigenergy plant at address 247")
    return {**ident, "data": {CONF_PORT: port, CONF_UNIT_ID: unit_id}}


class SigenergyCoordinator(DataUpdateCoordinator[dict[str, sigenergy.SigenergyDevice]]):
    """Read plant and inverter input registers per cycle. @zara"""

    vendor = sigenergy

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, sigenergy.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Sigenergy {entry.data[CONF_HOST]}",
            update_interval=timedelta(
                seconds=max(int(seconds), sigenergy.MIN_SCAN_SECONDS)
            ),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, sigenergy.DEFAULT_PORT))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, sigenergy.DEFAULT_UNIT_ID))
        self._optional_plant: list[tuple[int, int]] = list(
            sigenergy.OPTIONAL_PLANT_BLOCKS
        )
        self._optional_inverter: list[tuple[int, int]] | None = None

    async def _read_optional(
        self,
        client: ModbusTcpClient,
        unit_id: int,
        blocks: list[tuple[int, int]],
        regs: dict[int, int],
    ) -> None:
        for block in list(blocks):
            try:
                regs.update(await read_blocks(client, unit_id, (block,)))
            except ModbusError as err:
                # older firmware: the register range does not exist yet
                if err.code in UNSUPPORTED_CODES:
                    blocks.remove(block)
                else:
                    LOGGER.debug("Sigenergy optional block %s: %s", block, err)

    async def _async_update_data(self) -> dict[str, sigenergy.SigenergyDevice]:
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(self.host, self.port) as client,
            ):
                plant = await read_blocks(
                    client, sigenergy.PLANT_UNIT_ID, sigenergy.PLANT_BLOCKS
                )
                await self._read_optional(
                    client, sigenergy.PLANT_UNIT_ID, self._optional_plant, plant
                )
                inverter = await read_blocks(
                    client, self.unit_id, sigenergy.INVERTER_BLOCKS
                )
                if self._optional_inverter is None:
                    self._optional_inverter = list(
                        sigenergy.optional_inverter_blocks(inverter)
                    )
                await self._read_optional(
                    client, self.unit_id, self._optional_inverter, inverter
                )
        except READ_ERRORS as err:
            raise UpdateFailed(
                f"Sigenergy at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = sigenergy.build_devices(plant, inverter)
        if not devices:
            raise UpdateFailed(f"Sigenergy at {self.host} reported no serial number")
        return devices
