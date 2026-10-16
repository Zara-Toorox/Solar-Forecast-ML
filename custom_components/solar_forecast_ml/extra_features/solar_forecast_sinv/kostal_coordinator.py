# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for KOSTAL PLENTICORE inverters over Modbus TCP. @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
import struct
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .modbus_tcp import ModbusError, ModbusTcpClient
from .vendors import kostal

CONF_UNIT_ID = "unit_id"
READ_ERRORS = (OSError, TimeoutError, EOFError, ModbusError, struct.error)
# one read cycle may never outlast this, whatever the device does
CYCLE_TIMEOUT_SECONDS = 30
# exception codes meaning "this register does not exist here"
UNSUPPORTED_CODES = (1, 2)


async def read_blocks(
    client: ModbusTcpClient, blocks: tuple[tuple[int, int], ...]
) -> dict[int, int]:
    """Read register blocks into an address -> value map. @zara"""
    registers: dict[int, int] = {}
    for start, count in blocks:
        for offset, value in enumerate(await client.read(start, count)):
            registers[start + offset] = value
    return registers


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read serial and model; raises if no PLENTICORE answers. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        ModbusTcpClient(host.strip(), port, unit_id) as client,
    ):
        registers = await read_blocks(client, ((14, 8), *kostal.IDENTITY_BLOCKS))
    ident = kostal.identity(registers)
    if ident is None:
        raise ValueError("no KOSTAL serial number")
    return {**ident, "data": {CONF_PORT: port, CONF_UNIT_ID: unit_id}}


class KostalCoordinator(DataUpdateCoordinator[dict[str, kostal.KostalDevice]]):
    """Read all operating data of one PLENTICORE per cycle. @zara"""

    vendor = kostal

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, kostal.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV KOSTAL {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, kostal.DEFAULT_PORT))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, kostal.DEFAULT_UNIT_ID))
        self._identity: dict[int, int] = {}
        self._optional = list(kostal.OPTIONAL_BLOCKS)

    async def _async_update_data(self) -> dict[str, kostal.KostalDevice]:
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                ModbusTcpClient(self.host, self.port, self.unit_id) as client,
            ):
                registers = await read_blocks(client, kostal.DATA_BLOCKS)
                if not self._identity:
                    self._identity = await read_blocks(client, kostal.IDENTITY_BLOCKS)
                for block in list(self._optional):
                    try:
                        registers.update(await read_blocks(client, (block,)))
                    except ModbusError as err:
                        # not provided by this device (e.g. battery without SoH);
                        # a busy or garbled answer is retried next cycle
                        if err.code in UNSUPPORTED_CODES:
                            self._optional.remove(block)
        except READ_ERRORS as err:
            raise UpdateFailed(
                f"KOSTAL at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = kostal.build_devices({**self._identity, **registers})
        if not devices:
            raise UpdateFailed(f"KOSTAL at {self.host} reported no serial number")
        return devices
