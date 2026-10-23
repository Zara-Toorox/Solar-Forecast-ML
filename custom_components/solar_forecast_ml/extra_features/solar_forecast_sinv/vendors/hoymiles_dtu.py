# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Hoymiles adapter for the original DTU and HMS-W inverters (local protobuf). @zara

Parses the ``RealDataNew`` answer that the hoymiles-wifi library (MIT) fetches from
a DTU-Pro, DTU-Lite, DTU-WLite or the built-in DTU of an HMS-xxxW inverter. No Home
Assistant imports and no library import: the message is read by attribute name.

Scaling as used by the established hoymiles-wifi Home Assistant integration:
power 0.1 W, voltage 0.1 V, current 0.01 A, frequency 0.01 Hz, temperature 0.1 °C,
PV energies in Wh. ``sgs_data`` are single-phase inverters, ``tgs_data`` three-phase
ones, ``pv_data`` the PV ports of all inverters.

A whole answer is unusable when every inverter grid voltage is 0 or missing and
every DC voltage is 0, or when a lifetime energy counter fell below the last
accepted value of that device. The coordinator discards that answer. The same
lower total is accepted only after it repeats for three answers without falling
further. A null frame never counts toward those three.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field, replace
from typing import Any

from ..contract import ac_net_without_battery, indexed_role
from .opendtu import HoymilesDevice

VENDOR = "hoymiles"
NAME = "Hoymiles"
CONNECTION_LOCAL = "local_dtu"
DEFAULT_SCAN_SECONDS = 35
# DTUs (above all the Wi-Fi ones) suffer from frequent polling
MIN_SCAN_SECONDS = 30
# Lifetime totals are integer Wh, published as kWh rounded to 3 decimals.
# Half of that 0.001 kWh step is float residue around the rounding boundary,
# not a counter reset. A full displayed step downwards is rejected.
ENERGY_ROLLBACK_TOLERANCE_KWH = 0.0005
# A lasting reset (firmware, swapped inverter, overflow) repeats the new total.
# One low answer does not. Three readings that do not fall further adopt it.
RESET_CONFIRMATIONS = 3
POWER_ROLES_PREFIX = ("power_",)


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "warning_count": VendorSpec(None, None, "measurement", "Warnings", "Warnungen"),
}


def _scaled(message: Any, name: str, factor: float) -> float | None:
    value = getattr(message, name, None)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value * factor


@dataclass
class _Ports:
    power: float = 0.0
    energy_total: float = 0.0
    energy_daily: float = 0.0
    roles: dict[str, float] = field(default_factory=dict)


def _port_index(port: Any, fallback: int) -> int:
    number = getattr(port, "port_number", None)
    return number if isinstance(number, int) and number >= 1 else fallback


def build_devices(
    real: Any, serial_of: Callable[[int], str]
) -> dict[str, HoymilesDevice]:
    """Parse one RealDataNew answer into one device per inverter. @zara"""
    devices: dict[str, HoymilesDevice] = {}

    def device_for(raw_serial: Any) -> HoymilesDevice | None:
        if not isinstance(raw_serial, int) or raw_serial <= 0:
            return None
        serial = serial_of(raw_serial)
        if serial not in devices:
            devices[serial] = HoymilesDevice(
                serial=serial,
                kind="inverter",
                name=f"{NAME} {serial}",
                manufacturer=NAME,
                model="Microinverter",
            )
        return devices[serial]

    for message, three_phase in (
        *((item, False) for item in getattr(real, "sgs_data", []) or []),
        *((item, True) for item in getattr(real, "tgs_data", []) or []),
    ):
        device = device_for(getattr(message, "serial_number", None))
        if device is None:
            continue
        for role, name, factor, digits in (
            ("power_inverter_ac_output", "active_power", 0.1, 0),
            ("frequency_grid", "frequency", 0.01, 2),
            ("temperature_inverter", "temperature", 0.1, 1),
            ("voltage_grid", "voltage_phase_A" if three_phase else "voltage", 0.1, 1),
        ):
            value = _scaled(message, name, factor)
            if value is not None:
                device.roles[role] = round(value, digits)
        warnings = getattr(message, "warning_number", None)
        if isinstance(warnings, int) and not isinstance(warnings, bool):
            device.vendor["warning_count"] = warnings

    ports: dict[str, _Ports] = {}
    for position, port in enumerate(getattr(real, "pv_data", []) or [], start=1):
        device = device_for(getattr(port, "serial_number", None))
        if device is None:
            continue
        totals = ports.setdefault(device.serial, _Ports())
        index = _port_index(port, position)
        power = _scaled(port, "power", 0.1)
        voltage = _scaled(port, "voltage", 0.1)
        current = _scaled(port, "current", 0.01)
        if power is not None:
            totals.power += power
            device.roles[indexed_role("power_solar_mppt", index)] = round(power)
        if voltage is not None:
            device.roles[indexed_role("voltage_solar_mppt", index)] = round(voltage, 1)
        if current is not None:
            device.roles[indexed_role("current_solar_mppt", index)] = round(current, 2)
        totals.energy_total += _scaled(port, "energy_total", 1.0) or 0.0
        totals.energy_daily += _scaled(port, "energy_daily", 1.0) or 0.0
    for serial, totals in ports.items():
        device = devices[serial]
        device.roles["power_solar"] = round(totals.power)
        device.derived.add("power_solar")
        # 0 stays visible so a wiped lifetime counter can be rejected before it
        # is published; Home Assistant would otherwise book it as a reset
        device.roles["energy_solar_total"] = round(totals.energy_total / 1000, 3)
        device.roles["energy_solar_today"] = round(totals.energy_daily / 1000, 3)
    for device in devices.values():
        if (net := ac_net_without_battery(device.roles)) is not None:
            device.roles["power_ac_net"] = net
    return devices


def _finite(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and value == value
        and value not in (float("inf"), float("-inf"))
    )


NULL_FRAME = "null frame: grid voltage missing or 0 and every DC voltage is 0"


@dataclass
class ResetTrack:
    """One discarded lifetime total and how many answers have held it. @zara"""

    value: float
    count: int


def null_frame(devices: dict[str, HoymilesDevice]) -> bool:
    """Return True when every grid voltage is 0 or missing and every DC voltage is 0. @zara"""
    if not devices:
        return False
    grid_dead = all(
        device.roles.get("voltage_grid", 0) == 0 for device in devices.values()
    )
    if not grid_dead:
        return False
    dc = [
        value
        for device in devices.values()
        for role, value in device.roles.items()
        if role.startswith("voltage_solar_mppt_")
    ]
    return all(value == 0 for value in dc)


def lifetime_drops(
    devices: dict[str, HoymilesDevice], accepted_energy: dict[str, float]
) -> dict[str, float]:
    """Return lifetime totals that fell below the accepted baseline. @zara"""
    drops: dict[str, float] = {}
    for serial, device in devices.items():
        energy = device.roles.get("energy_solar_total")
        previous = accepted_energy.get(serial)
        if not _finite(energy) or not _finite(previous):
            continue
        if energy < previous - ENERGY_ROLLBACK_TOLERANCE_KWH:
            drops[serial] = float(energy)
    return drops


def advance_reset(pending: dict[str, ResetTrack], serial: str, energy: float) -> int:
    """Count this reading when it stays at or above the previous discard. @zara"""
    track = pending.get(serial)
    # Same rounding window as the baseline check: a full 0.001 kWh step down
    # starts a new streak, float residue around one reading does not.
    if track is not None and energy >= track.value - ENERGY_ROLLBACK_TOLERANCE_KWH:
        count = track.count + 1
    else:
        count = 1
    pending[serial] = ResetTrack(float(energy), count)
    return count


def invalid_frame(
    devices: dict[str, HoymilesDevice], accepted_energy: dict[str, float]
) -> str | None:
    """Return why this answer must be discarded, or None when it is usable. @zara

    A running inverter always measures grid voltage, so a set where every grid
    voltage is 0 or missing and every DC voltage is 0 is a null frame. A
    lifetime total below the last accepted value of the same device (beyond
    rounding) would be stored as a counter reset until it has repeated.
    """
    if not devices:
        return None
    if null_frame(devices):
        return NULL_FRAME
    drops = lifetime_drops(devices, accepted_energy)
    if not drops:
        return None
    serial = next(iter(drops))
    return (
        f"lifetime energy of {serial} dropped from "
        f"{accepted_energy[serial]} to {drops[serial]}"
    )


def remember_energy(
    accepted: dict[str, float], devices: dict[str, HoymilesDevice]
) -> None:
    """Keep the highest accepted lifetime total; a lower reading never replaces it. @zara"""
    for serial, device in devices.items():
        energy = device.roles.get("energy_solar_total")
        if not _finite(energy):
            continue
        previous = accepted.get(serial)
        if previous is None or energy > previous:
            accepted[serial] = float(energy)


def asleep(device: HoymilesDevice) -> HoymilesDevice:
    """Inverter the DTU no longer reports (night): power 0 W, counters kept. @zara"""
    roles = {
        role: 0 if role.startswith(POWER_ROLES_PREFIX) else value
        for role, value in device.roles.items()
        if role.startswith(POWER_ROLES_PREFIX) or role.startswith("energy_")
    }
    return replace(device, roles=roles, vendor={}, derived=set(device.derived))
