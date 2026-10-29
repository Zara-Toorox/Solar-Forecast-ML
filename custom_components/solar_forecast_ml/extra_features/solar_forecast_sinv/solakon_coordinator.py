# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for the Solakon ONE over Modbus TCP. @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_PORT, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN, LOGGER
from .kostal_coordinator import (
    CONF_UNIT_ID,
    CYCLE_TIMEOUT_SECONDS,
    READ_ERRORS,
    UNSUPPORTED_CODES,
)
from .modbus_tcp import READ_HOLDING_REGISTERS, ModbusError, ModbusTcpClient
from .solax_coordinator import read_blocks
from .vendors import solakon


def _client(host: str, port: int, unit_id: int) -> ModbusTcpClient:
    return ModbusTcpClient(host, port, unit_id, min_gap=solakon.REQUEST_GAP_SECONDS)


async def _read(
    client: ModbusTcpClient, blocks: tuple[tuple[int, int], ...]
) -> dict[int, int]:
    return await read_blocks(client, blocks, READ_HOLDING_REGISTERS)


async def async_probe(host: str, port: int, unit_id: int) -> dict[str, Any]:
    """Read serial and model; raises if no Solakon ONE answers. @zara"""
    async with (
        asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
        _client(host.strip(), port, unit_id) as client,
    ):
        regs = await _read(client, solakon.IDENTITY_BLOCKS)
    ident = solakon.identity(regs)
    if ident is None:
        raise ValueError("no Solakon serial number")
    return {**ident, "data": {CONF_PORT: port, CONF_UNIT_ID: unit_id}}


class SolakonCoordinator(DataUpdateCoordinator[dict[str, solakon.SolakonDevice]]):
    """Read identity once and the running registers per cycle. @zara"""

    vendor = solakon

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(CONF_SCAN_INTERVAL, solakon.DEFAULT_SCAN_SECONDS)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Solakon {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self.port = int(entry.data.get(CONF_PORT, solakon.DEFAULT_PORT))
        self.unit_id = int(entry.data.get(CONF_UNIT_ID, solakon.DEFAULT_UNIT_ID))
        self._identity: dict[int, int] = {}
        self._optional = list(solakon.OPTIONAL_BLOCKS)
        self._sign_book: solakon.BatterySigns | None = None
        self._sign_store: Store | None = None

    async def _battery_signs(self) -> solakon.BatterySigns:
        """Load the per-serial sign store once. @zara"""
        book = getattr(self, "_sign_book", None)
        if book is not None:
            return book
        hass = getattr(self, "hass", None)
        entry = getattr(self, "config_entry", None)
        if hass is None or entry is None:
            self._sign_book = solakon.BatterySigns()
            return self._sign_book
        store: Store = Store(hass, 1, f"{DOMAIN}.solakon_battery_sign.{entry.entry_id}")
        self._sign_book = solakon.BatterySigns.from_snapshot(await store.async_load())
        self._sign_store = store
        return self._sign_book

    async def _async_update_data(self) -> dict[str, solakon.SolakonDevice]:
        try:
            async with (
                asyncio.timeout(CYCLE_TIMEOUT_SECONDS),
                _client(self.host, self.port, self.unit_id) as client,
            ):
                if not self._identity:
                    self._identity = await _read(client, solakon.IDENTITY_BLOCKS)
                blocks = solakon.INPUT_BLOCKS + solakon.PV_BLOCKS
                regs = {**self._identity, **await _read(client, blocks)}
                for block in list(self._optional):
                    try:
                        regs.update(await _read(client, (block,)))
                    except ModbusError as err:
                        # no second battery tower: the register does not exist
                        if err.code in UNSUPPORTED_CODES:
                            self._optional.remove(block)
                        else:
                            LOGGER.debug("Solakon optional block %s: %s", block, err)
        except READ_ERRORS as err:
            raise UpdateFailed(
                f"Solakon at {self.host}:{self.port} not readable: {err}"
            ) from err
        devices = solakon.build_devices(regs)
        if not devices:
            raise UpdateFailed(f"Solakon at {self.host} reported no serial number")
        book = await self._battery_signs()
        for serial, device in devices.items():
            if "energy_battery_charge_total" not in device.roles:
                continue
            event = book.observe(
                serial,
                device.battery_raw,
                device.roles.get("energy_battery_charge_total"),
                device.roles.get("energy_battery_discharge_total"),
            )
            solakon.publish_battery_power(device, book.get(serial))
            if event == "determined":
                LOGGER.info(
                    "Solakon %s battery sign determined: %s after %s observations",
                    serial,
                    device.battery_sign,
                    device.battery_sign_observations,
                )
            elif event == "redetermined":
                LOGGER.info(
                    "Solakon %s battery sign changed: %s after %s contrary observations",
                    serial,
                    device.battery_sign,
                    solakon.SIGN_REVISIONS,
                )
        store = getattr(self, "_sign_store", None)
        if store is not None:
            store.async_delay_save(book.snapshot, 1.0)
        return devices
