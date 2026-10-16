# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for Huawei SUN2000 inverters over Modbus TCP. @zara"""

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
from .modbus_tcp import READ_HOLDING_REGISTERS, ModbusError, ModbusTcpClient
from .solax_coordinator import read_blocks
from .vendors import huawei


def _client(host: str, port: int, unit_id: int) -> ModbusTcpClient:
    return ModbusTcpClient(host, port, unit_id, min_gap=huawei.REQUEST_GAP_SECONDS)


async def _read(
    client: ModbusTcpClient, blocks: tuple[tuple[int, int], ...]
) -> dict[int, int]:
    return await read_blocks(client, blocks, READ_HOLDING_REGISTERS)


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read serial and model; raises if no Huawei inverter answers. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        _client(host.strip(), port, unit_id) as client,
    ):
        await asyncio.sleep(huawei.CONNECT_DELAY_SECONDS)
        regs = await _read(client, huawei.IDENTITY_BLOCKS)
    ident = huawei.identity(regs)
    if ident is None:
        raise ValueError("no Huawei serial number")
    return {**ident, "data": {CONF_PORT: port, CONF_UNIT_ID: unit_id}}


class HuaweiCoordinator(DataUpdateCoordinator[dict[str, huawei.HuaweiDevice]]):
    """Read identity once and the running registers per cycle. @zara"""

    vendor = huawei

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, huawei.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Huawei {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, huawei.DEFAULT_PORT))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, huawei.DEFAULT_UNIT_ID))
        self._identity: dict[int, int] = {}
        self._optional = list(huawei.OPTIONAL_BLOCKS)
        self._silent: dict[tuple[int, int], int] = {}
        # one connection kept open across cycles, reopened only after an error
        self._client: ModbusTcpClient | None = None
        self._shut_down = False

    async def _connected_client(self) -> ModbusTcpClient:
        """Return the open client, connecting (and waiting) when needed. @zara"""
        if self._client is not None and self._client.connected:
            return self._client
        if self._shut_down:
            raise ModbusError("coordinator shut down")
        await self._async_close_client()
        client = _client(self.host, self.port, self.unit_id)
        await client.connect()
        if self._shut_down:
            await client.close()
            raise ModbusError("coordinator shut down")
        self._client = client
        await asyncio.sleep(huawei.CONNECT_DELAY_SECONDS)
        return client

    async def _async_close_client(self) -> None:
        if self._client is not None:
            client, self._client = self._client, None
            await client.close()

    async def async_shutdown(self) -> None:
        """Close the Modbus connection when the entry unloads. @zara"""
        self._shut_down = True
        await super().async_shutdown()
        await self._async_close_client()

    async def _async_update_data(self) -> dict[str, huawei.HuaweiDevice]:
        try:
            async with asyncio.timeout(CYCLE_TIMEOUT_SECONDS):
                try:
                    regs = await self._async_read_cycle()
                except READ_ERRORS as err:
                    # a kept connection may have been closed by the dongle while
                    # idle: one retry on a fresh connection; a device exception
                    # (busy, illegal address) is not retried
                    if isinstance(err, ModbusError) and err.code is not None:
                        raise
                    await self._async_close_client()
                    regs = await self._async_read_cycle()
        except READ_ERRORS as err:
            await self._async_close_client()
            raise UpdateFailed(
                f"Huawei at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = huawei.build_devices(regs)
        if not devices:
            raise UpdateFailed(f"Huawei at {self.host} reported no serial number")
        return devices

    async def _async_read_cycle(self) -> dict[int, int]:
        """Read identity once, the running blocks and the optional blocks. @zara"""
        client = await self._connected_client()
        if not self._identity:
            self._identity = await _read(client, huawei.IDENTITY_BLOCKS)
        regs = {**self._identity, **await _read(client, huawei.INPUT_BLOCKS)}
        for block in list(self._optional):
            try:
                regs.update(await _read(client, (block,)))
                self._silent.pop(block, None)
            except ModbusError as err:
                # no meter or no battery: the register does not exist
                if err.code in UNSUPPORTED_CODES:
                    self._optional.remove(block)
                elif err.code is None:
                    # protocol error: the client closed the stream, stop this cycle
                    LOGGER.debug("Huawei optional block %s: %s", block, err)
                    break
                else:
                    LOGGER.debug("Huawei optional block %s: %s", block, err)
            except (TimeoutError, EOFError) as err:
                # a silent dongle leaves the stream unusable: the main data stay
                # valid, the connection is reopened next cycle. Dongles are often
                # slow, so a block is dropped only after repeated silence.
                self._silent[block] = self._silent.get(block, 0) + 1
                if self._silent[block] >= huawei.SILENT_LIMIT:
                    LOGGER.debug("Huawei optional block %s dropped: %s", block, err)
                    self._optional.remove(block)
                await self._async_close_client()
                break
        return regs
