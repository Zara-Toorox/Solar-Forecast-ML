# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Polling coordinator for a Hoymiles DTU or HMS-W inverter (hoymiles-wifi). @zara"""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, CONF_SCAN_INTERVAL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import LOGGER
from .vendors import hoymiles_dtu

CONF_IS_ENCRYPTED = "is_encrypted"
CONF_ENC_RAND = "enc_rand"
ENCRYPTION_SETTLE_SECONDS = 2
MISSES_BEFORE_ASLEEP = 3


def _dtu(host: str, is_encrypted: bool = False, enc_rand: str = "") -> Any:
    """Create the library client; imported lazily so HA starts without it. @zara"""
    from hoymiles_wifi.dtu import DTU  # noqa: PLC0415

    if is_encrypted and enc_rand:
        return DTU(host, is_encrypted=True, enc_rand=bytes.fromhex(enc_rand))
    return DTU(host)


def _serial_of(raw: int) -> str:
    from hoymiles_wifi.hoymiles import generate_inverter_serial_number  # noqa: PLC0415

    return str(generate_inverter_serial_number(raw))


def _offline(client: Any) -> bool:
    """Return True when the last request found no DTU at all (not an unreadable answer). @zara"""
    from hoymiles_wifi.dtu import NetworkState  # noqa: PLC0415

    return client.get_state() == NetworkState.Offline


def encryption_of(info: Any) -> tuple[bool, str]:
    """Return (encrypted, enc_rand hex) from the DTU information answer. @zara"""
    from hoymiles_wifi.const import IS_ENCRYPTED_BIT_INDEX  # noqa: PLC0415

    dtu_info = getattr(info, "dtu_info", None)
    dfs = getattr(dtu_info, "dfs", 0) or 0
    if not (dfs >> IS_ENCRYPTED_BIT_INDEX) & 1:
        return False, ""
    rand = getattr(dtu_info, "enc_rand", b"") or b""
    return True, rand.hex() if isinstance(rand, bytes) else str(rand)


async def async_probe(host: str) -> dict[str, Any]:
    """Connect to a DTU, detect encryption and return its identity. @zara"""
    host = host.strip()
    client = _dtu(host)
    encrypted, enc_rand = encryption_of(await client.async_app_information_data())
    if encrypted:
        client = _dtu(host, True, enc_rand)
        await asyncio.sleep(ENCRYPTION_SETTLE_SECONDS)
    real = await client.async_get_real_data_new()
    serial = getattr(real, "device_serial_number", None)
    if real is None and _offline(client):
        raise ConnectionError(f"no device reachable at {host}")
    if real is None or not serial:
        raise ValueError("no Hoymiles DTU answered")
    return {
        "serial": str(serial),
        "name": f"Hoymiles DTU {serial}",
        "data": {CONF_IS_ENCRYPTED: encrypted, CONF_ENC_RAND: enc_rand},
    }


class HoymilesDtuCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Fetch the real data of all inverters behind one DTU per cycle. @zara"""

    vendor = hoymiles_dtu

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Initialize from the config entry. @zara"""
        seconds = entry.options.get(
            CONF_SCAN_INTERVAL, hoymiles_dtu.DEFAULT_SCAN_SECONDS
        )
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"S-INV Hoymiles DTU {entry.data[CONF_HOST]}",
            update_interval=timedelta(seconds=seconds),
        )
        self.host: str = entry.data[CONF_HOST]
        self._encrypted = bool(entry.data.get(CONF_IS_ENCRYPTED))
        self._enc_rand = str(entry.data.get(CONF_ENC_RAND) or "")
        self._client: Any = None
        self._last: dict[str, Any] = {}
        self._misses: dict[str, int] = {}
        # Session baseline. Three answers that do not fall further replace it;
        # until then a lower reading is discarded.
        self._accepted_energy: dict[str, float] = {}
        self._invalid_logged = False
        self._reset_pending: dict[str, hoymiles_dtu.ResetTrack] = {}

    async def _async_update_data(self) -> dict[str, Any]:
        if self._client is None:
            self._client = _dtu(self.host, self._encrypted, self._enc_rand)
        try:
            real = await self._client.async_get_real_data_new()
        except (OSError, TimeoutError, ValueError) as err:
            real = None
            LOGGER.debug("Hoymiles DTU %s request failed: %s", self.host, err)
        if real is None:
            if not _offline(self._client):
                # the DTU answered but nothing could be read: encryption may have
                # changed (firmware update); never report this as 0 W
                await self._async_recheck_encryption()
                raise UpdateFailed(f"Hoymiles DTU at {self.host} answer unreadable")
            if not self._last:
                raise UpdateFailed(f"Hoymiles DTU at {self.host} not reachable")
            # the DTU is off (HMS-W built-in DTU at night): inverters read 0 W
            return {
                serial: hoymiles_dtu.asleep(device)
                for serial, device in self._last.items()
            }
        devices = hoymiles_dtu.build_devices(real, _serial_of)
        if hoymiles_dtu.null_frame(devices):
            # zeros are not a counter reading and break a reset streak
            self._reset_pending.clear()
            self._reject_invalid(hoymiles_dtu.NULL_FRAME)
        drops = hoymiles_dtu.lifetime_drops(devices, self._accepted_energy)
        if not self._confirm_resets(drops):
            serial = next(iter(drops))
            self._reject_invalid(
                f"lifetime energy of {serial} dropped from "
                f"{self._accepted_energy[serial]} to {drops[serial]}"
            )
        if devices:
            self._invalid_logged = False
        hoymiles_dtu.remember_energy(self._accepted_energy, devices)
        for serial, device in self._last.items():
            if serial in devices:
                self._misses.pop(serial, None)
                continue
            # a page can be lost in one cycle; only a lasting absence means asleep
            misses = self._misses.get(serial, 0) + 1
            self._misses[serial] = misses
            devices[serial] = (
                hoymiles_dtu.asleep(device)
                if misses >= MISSES_BEFORE_ASLEEP
                else device
            )
        self._last = devices
        return devices

    def _reject_invalid(self, reason: str) -> None:
        """Discard this cycle and log the reason once per series. @zara"""
        if not self._invalid_logged:
            LOGGER.warning(
                "Hoymiles DTU %s discarded an invalid data set: %s",
                self.host,
                reason,
            )
            self._invalid_logged = True
        raise UpdateFailed(
            f"Hoymiles DTU at {self.host} discarded an invalid data set: {reason}"
        )

    def _confirm_resets(self, drops: dict[str, float]) -> bool:
        """Advance reset streaks. Return True when every drop may be published. @zara"""
        for serial in list(self._reset_pending):
            if serial not in drops:
                self._reset_pending.pop(serial, None)
        ready: list[str] = []
        for serial, energy in drops.items():
            count = hoymiles_dtu.advance_reset(self._reset_pending, serial, energy)
            if count >= hoymiles_dtu.RESET_CONFIRMATIONS:
                ready.append(serial)
        if len(ready) < len(drops):
            return False
        for serial in ready:
            self._accepted_energy[serial] = drops[serial]
            self._reset_pending.pop(serial, None)
        if ready:
            LOGGER.info("Hoymiles DTU %s counter reset accepted", self.host)
        return True

    async def _async_recheck_encryption(self) -> None:
        """Store changed encryption data so the next cycle can read again. @zara"""
        try:
            info = await _dtu(self.host).async_app_information_data()
        except (OSError, TimeoutError, ValueError):
            return
        if info is None:
            return
        encrypted, enc_rand = encryption_of(info)
        if (encrypted, enc_rand) == (self._encrypted, self._enc_rand):
            return
        LOGGER.info("Hoymiles DTU %s changed its encryption, updating", self.host)
        self._encrypted, self._enc_rand = encrypted, enc_rand
        self._client = None
        entry = self.config_entry
        if entry is not None:
            self.hass.config_entries.async_update_entry(
                entry,
                data={
                    **entry.data,
                    CONF_IS_ENCRYPTED: encrypted,
                    CONF_ENC_RAND: enc_rand,
                },
            )
