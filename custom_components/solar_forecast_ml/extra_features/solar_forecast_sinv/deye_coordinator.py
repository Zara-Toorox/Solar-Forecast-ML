# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Deye inverters (Solarman V5 or Modbus TCP). @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_LOGGER_SERIAL, LOGGER
from .kostal_coordinator import (
    CONF_UNIT_ID,
    CYCLE_TIMEOUT_SECONDS,
    READ_ERRORS,
    UNSUPPORTED_CODES,
)
from .modbus_tcp import READ_HOLDING_REGISTERS, ModbusError, ModbusTcpClient
from .solarman_v5 import SolarmanV5Client
from .vendors import deye


def _client(
    host: str, port: int, unit_id: int, logger_serial: int | None
) -> ModbusTcpClient | SolarmanV5Client:
    if logger_serial is None:
        return ModbusTcpClient(host, port, unit_id, min_gap=deye.REQUEST_GAP_SECONDS)
    return SolarmanV5Client(
        host,
        port,
        unit_id,
        int(logger_serial),
        min_gap=deye.REQUEST_GAP_SECONDS,
    )


async def read_blocks(
    client: ModbusTcpClient | SolarmanV5Client, blocks: tuple[tuple[int, int], ...]
) -> dict[int, int]:
    """Read holding-register blocks (function 0x03) into an address map. @zara"""
    registers: dict[int, int] = {}
    for start, count in blocks:
        values = await client.read(start, count, READ_HOLDING_REGISTERS)
        for offset, value in enumerate(values):
            registers[start + offset] = value
    return registers


async def async_probe(
    host: str, port: int, unit_id: int, logger_serial: int | None = None
) -> dict[str, Any]:
    """Read serial and model; raises if no supported Deye answers. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        _client(host.strip(), port, unit_id, logger_serial) as client,
    ):
        # 16 registers covers device type and serial and stays inside the LP1 limit
        regs = await read_blocks(client, ((0, 16),))
    ident = deye.identity(regs)
    if ident is None:
        raise ValueError(deye.reject_reason(regs) or "no Deye serial number")
    data: dict[str, Any] = {CONF_PORT: port, CONF_UNIT_ID: unit_id}
    if logger_serial is not None:
        data[CONF_LOGGER_SERIAL] = int(logger_serial)
    return {**ident, "data": data}


class DeyeCoordinator(DataUpdateCoordinator[dict[str, deye.DeyeDevice]]):
    """Read the running holding registers of one Deye inverter per cycle. @zara"""

    vendor = deye

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, deye.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Deye {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, deye.DEFAULT_PORT_MODBUS))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, deye.DEFAULT_UNIT_ID))
        serial = entry.data.get(CONF_LOGGER_SERIAL)
        self.logger_serial: int | None = None if serial is None else int(serial)
        self._optional: list[tuple[int, int]] | None = None

    async def _async_update_data(self) -> dict[str, deye.DeyeDevice]:
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(
                    self.host, self.port, self.unit_id, self.logger_serial
                ) as client,
            ):
                # One short read names the family. 1P never continues with a count above 16.
                regs = await read_blocks(client, ((0, 16),))
                device_type = regs.get(0)
                blocks = deye.input_blocks(device_type)
                if blocks[:1] == ((0, 16),):
                    blocks = blocks[1:]
                if blocks:
                    regs.update(await read_blocks(client, blocks))
                if self._optional is None:
                    self._optional = list(deye.optional_blocks(device_type))
                for block in list(self._optional):
                    try:
                        regs.update(await read_blocks(client, (block,)))
                    except ModbusError as err:
                        # a broken frame already closed the socket: do not continue
                        if getattr(err, "fatal", False) or not client.connected:
                            raise
                        if err.code in UNSUPPORTED_CODES:
                            self._optional.remove(block)
                        else:
                            LOGGER.debug("Deye optional block %s: %s", block, err)
        except READ_ERRORS as err:
            if self.logger_serial is not None and isinstance(err, TimeoutError):
                raise UpdateFailed(
                    f"Deye Solarman V5 at {self.host}:{self.port} timed out. "
                    "Loggers that only answer AT commands on port 48899 are not supported."
                ) from err
            raise UpdateFailed(
                f"Deye at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = deye.build_devices(regs)
        if not devices:
            raise UpdateFailed(
                deye.reject_reason(regs)
                or f"Deye at {self.host} reported no serial number"
            )
        return devices
