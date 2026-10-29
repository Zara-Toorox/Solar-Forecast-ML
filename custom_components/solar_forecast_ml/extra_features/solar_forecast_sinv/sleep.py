# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Night sleep of local PV devices that switch off with the sun. @zara

Micro inverters with a built-in DTU, PV-side data loggers and small string
inverters drop off the network at night. A device that is not reachable at all
while the sun is low, and that has neither battery nor grid values, is asleep:
power reads 0 W and the energy counters keep their last reading. Every other
value is unavailable. The last good reading of every device is stored per
config entry, so a restart at night starts asleep instead of failing setup.
During the day, or for an answer that cannot be read, the failure stays visible.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime
import math
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import UpdateFailed
from homeassistant.util import dt as dt_util

from .const import DOMAIN, LOGGER

# Inverters start a few degrees above the horizon; below that an unreachable
# PV device is taken as switched off, above it as a fault.
SLEEP_ELEVATION = 5.0
# Counter readings change on every poll; the store is written at most this often
# and on shutdown.
SAVE_DELAY = 300.0
# A device with any of these roles powers or meters the house at night.
AWAKE_ROLE_PREFIXES = (
    "power_battery",
    "energy_battery",
    "battery_",
    "capacity_battery",
    "power_grid",
    "energy_grid",
    "power_house",
    "energy_house",
)


class DeviceUnreachable(UpdateFailed):
    """The device did not answer at all (not an unreadable answer). @zara"""


@dataclass
class SleepingDevice:
    """A device restored from the store, shaped like the vendor devices. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def is_unreachable(err: BaseException) -> bool:
    """Return True when the failure means no answer at all. @zara

    aiohttp connection errors are OSError subclasses; an HTTP error status, a
    broken frame or an unreadable answer is not.
    """
    seen: set[int] = set()
    current: BaseException | None = err
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, DeviceUnreachable):
            return True
        if isinstance(current, OSError | TimeoutError):
            return True
        current = current.__cause__
    return False


def may_sleep(device: Any) -> bool:
    """Return True for a pure PV device: no battery, grid or house values. @zara"""
    roles = getattr(device, "roles", None)
    if not isinstance(roles, dict) or not roles:
        return False
    return not any(role.startswith(AWAKE_ROLE_PREFIXES) for role in roles)


def asleep(device: Any) -> Any:
    """Copy of a device at night: power 0 W, counters kept, everything else gone. @zara"""
    roles = {
        role: 0 if role.startswith("power_") else value
        for role, value in device.roles.items()
        if role.startswith(("power_", "energy_"))
    }
    derived = {role for role in device.derived if role in roles}
    return replace(device, roles=roles, vendor={}, derived=derived)


def sun_is_low(hass: HomeAssistant, now: datetime | None = None) -> bool:
    """Return True while the sun is below SLEEP_ELEVATION; False when unknown. @zara"""
    try:
        from astral.sun import elevation  # noqa: PLC0415

        from homeassistant.helpers.sun import get_astral_observer  # noqa: PLC0415

        value = elevation(get_astral_observer(hass), now or dt_util.utcnow())
    except (AttributeError, TypeError, ValueError, ImportError):
        return False
    return isinstance(value, int | float) and value < SLEEP_ELEVATION


def snapshot(devices: dict[str, Any]) -> dict[str, Any]:
    """JSON-ready identity, power roles and counter readings of each device. @zara"""
    result: dict[str, Any] = {}
    for serial, device in devices.items():
        energy = {
            role: float(value)
            for role, value in device.roles.items()
            if role.startswith("energy_")
            and isinstance(value, int | float)
            and not isinstance(value, bool)
            and math.isfinite(value)
        }
        result[serial] = {
            "kind": device.kind,
            "name": device.name,
            "manufacturer": device.manufacturer,
            "model": device.model,
            "power": sorted(role for role in device.roles if role.startswith("power_")),
            "energy": energy,
        }
    return result


def restore(raw: Any) -> dict[str, SleepingDevice]:
    """Rebuild sleeping devices from a snapshot; broken items are dropped. @zara"""
    devices: dict[str, SleepingDevice] = {}
    if not isinstance(raw, dict):
        return devices
    for serial, item in raw.items():
        if not isinstance(serial, str) or not isinstance(item, dict):
            continue
        texts = [item.get(key) for key in ("kind", "name", "manufacturer", "model")]
        power = item.get("power")
        energy = item.get("energy")
        if not all(isinstance(text, str) for text in texts):
            continue
        if not isinstance(power, list) or not isinstance(energy, dict):
            continue
        roles: dict[str, Any] = {
            role: 0
            for role in power
            if isinstance(role, str) and role.startswith("power_")
        }
        for role, value in energy.items():
            if (
                isinstance(role, str)
                and role.startswith("energy_")
                and isinstance(value, int | float)
                and not isinstance(value, bool)
                and math.isfinite(value)
            ):
                roles[role] = float(value)
        if not roles:
            continue
        kind, name, manufacturer, model = texts
        devices[serial] = SleepingDevice(serial, kind, name, manufacturer, model, roles)
    return devices


def sleeping_devices(
    last: dict[str, Any] | None,
    stored: dict[str, SleepingDevice],
    err: BaseException,
    sun_low: bool,
) -> dict[str, Any] | None:
    """Devices to publish as asleep, or None when the failure must stand. @zara"""
    if not sun_low or not is_unreachable(err):
        return None
    devices = last or stored
    if not devices or not all(may_sleep(device) for device in devices.values()):
        return None
    return {serial: asleep(device) for serial, device in devices.items()}


def _store(hass: HomeAssistant, entry: ConfigEntry) -> Store:
    return Store(hass, 1, f"{DOMAIN}.sleep.{entry.entry_id}")


async def async_remove_store(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Delete the stored devices of a removed config entry. @zara"""
    await _store(hass, entry).async_remove()


class SleepGuard:
    """Last good devices of one config entry and the night decision. @zara"""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Bind the guard to one config entry. @zara"""
        self._hass = hass
        self._store: Store = _store(hass, entry)
        self._last: dict[str, Any] | None = None
        self._stored: dict[str, SleepingDevice] = {}
        self._saved: dict[str, Any] | None = None
        self._pending = False
        self.asleep = False

    async def async_load(self) -> None:
        """Load the stored devices before the first refresh. @zara"""
        raw = await self._store.async_load()
        self._stored = restore(raw)
        self._saved = raw if isinstance(raw, dict) else None

    def remember(self, devices: dict[str, Any]) -> None:
        """Keep a good reading and store it when every device may sleep. @zara"""
        if self.asleep:
            LOGGER.info("%s woke up", self._name(devices))
        self.asleep = False
        if not devices:
            return
        self._last = devices
        if not all(may_sleep(device) for device in devices.values()):
            return
        current = snapshot(devices)
        if current == self._saved or self._pending:
            return
        self._pending = True
        self._store.async_delay_save(self._snapshot_for_save, SAVE_DELAY)

    def sleeping(self, err: BaseException) -> dict[str, Any] | None:
        """Asleep devices for this failure, or None to let it stand. @zara"""
        devices = sleeping_devices(
            self._last, self._stored, err, sun_is_low(self._hass)
        )
        if devices is not None and not self.asleep:
            LOGGER.info("%s asleep: %s", self._name(devices), err)
            self.asleep = True
        return devices

    def _snapshot_for_save(self) -> dict[str, Any]:
        self._pending = False
        self._saved = snapshot(self._last or {})
        return self._saved

    @staticmethod
    def _name(devices: dict[str, Any]) -> str:
        return ", ".join(device.name for device in devices.values()) or "device"


class SleepAware:
    """Mixin in front of a local coordinator: night failures become asleep data. @zara"""

    sleep_guard: SleepGuard | None = None

    async def _async_update_data(self) -> Any:
        guard = self.sleep_guard
        try:
            data = await super()._async_update_data()  # type: ignore[misc]
        except UpdateFailed as err:
            devices = guard.sleeping(err) if guard is not None else None
            if devices is None:
                raise
            return devices
        if guard is not None and isinstance(data, dict):
            guard.remember(data)
        return data


_SLEEP_AWARE: dict[type, type] = {}


def sleep_aware(coordinator_class: type) -> type:
    """Return the coordinator class with SleepAware in front of it. @zara"""
    cls = _SLEEP_AWARE.get(coordinator_class)
    if cls is None:
        cls = type(coordinator_class.__name__, (SleepAware, coordinator_class), {})
        _SLEEP_AWARE[coordinator_class] = cls
    return cls
