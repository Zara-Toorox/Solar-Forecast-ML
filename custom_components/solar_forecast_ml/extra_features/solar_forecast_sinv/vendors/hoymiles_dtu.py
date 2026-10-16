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
        if totals.energy_total > 0:
            device.roles["energy_solar_total"] = round(totals.energy_total / 1000, 3)
        device.roles["energy_solar_today"] = round(totals.energy_daily / 1000, 3)
    for device in devices.values():
        if (net := ac_net_without_battery(device.roles)) is not None:
            device.roles["power_ac_net"] = net
    return devices


def asleep(device: HoymilesDevice) -> HoymilesDevice:
    """Inverter the DTU no longer reports (night): power 0 W, counters kept. @zara"""
    roles = {
        role: 0 if role.startswith(POWER_ROLES_PREFIX) else value
        for role, value in device.roles.items()
        if role.startswith(POWER_ROLES_PREFIX) or role.startswith("energy_")
    }
    return replace(device, roles=roles, vendor={}, derived=set(device.derived))
