# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Kostal PLENTICORE adapter for the S-INV contract (Modbus TCP, read only). @zara

Register map: KOSTAL Interface description MODBUS (TCP) & SunSpec, revision 2.9
(17.07.2026), valid for PLENTICORE G2 from SW 02.15. Port 1502, unit id 71.
Floats are 32-bit IEEE 754 in two registers; their word order follows register 5
(0 = little-endian CDAB, the default; 1 = big-endian ABCD). Unsupported values read
as NaN and are dropped.

Contract mapping:
- ``power_battery`` = -(current 200 x voltage 216): register 200 is negative while
  charging, the contract is positive while charging
- house flows from 106 (battery), 108 (grid), 116 (PV); ``power_house`` is their sum
- DC inputs 1..n with n = register 34 (number of PV strings); on hybrid devices the
  battery may occupy the last DC input, which then is no PV input
- the powermeter total (252) depends on the sensor position (grid point or house
  branch) that Modbus does not report, so it stays a vendor value
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
import struct
from typing import Any

from ..contract import indexed_role

VENDOR = "kostal"
NAME = "KOSTAL"
CONNECTION_LOCAL = "local_modbus"
DEFAULT_SCAN_SECONDS = 10
MIN_SCAN_SECONDS = 10
DEFAULT_PORT = 1502
DEFAULT_UNIT_ID = 71
BYTE_ORDER_REGISTER = 5
# (start, count) blocks read every cycle and once for identity / optional values
DATA_BLOCKS: tuple[tuple[int, int], ...] = (
    (5, 1),
    (14, 8),
    (30, 6),
    (56, 2),
    (98, 28),
    (150, 68),
    (252, 36),
    (320, 8),
    (512, 23),
    (576, 8),
    (588, 1),
    (1046, 22),
)
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((768, 32), (800, 32))
OPTIONAL_BLOCKS: tuple[tuple[int, int], ...] = ((40428, 1),)
DC_INPUTS = (
    (260, 258, 266),
    (270, 268, 276),
    (280, 278, 286),
)  # power, current, voltage


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "inverter_state": VendorSpec(
        None, None, None, "Inverter state", "Wechselrichter-Zustand"
    ),
    "controller_temperature": VendorSpec(
        "°C",
        "temperature",
        "measurement",
        "Controller temperature",
        "Temperatur Steuerplatine",
    ),
    "powermeter_power": VendorSpec(
        "W", "power", "measurement", "Powermeter active power", "Leistung Energiezähler"
    ),
    "daily_yield": VendorSpec(
        "kWh", "energy", "total_increasing", "Daily yield (AC)", "Tagesertrag (AC)"
    ),
    "total_yield": VendorSpec(
        "kWh", "energy", "total_increasing", "Total yield (AC)", "Gesamtertrag (AC)"
    ),
}


@dataclass
class KostalDevice:
    """One PLENTICORE inverter (with its battery, if any). @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def _words(regs: dict[int, int], address: int, big_endian: bool) -> bytes | None:
    if address not in regs or address + 1 not in regs:
        return None
    first, second = regs[address], regs[address + 1]
    words = (first, second) if big_endian else (second, first)
    return struct.pack(">HH", *words)


def u16(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 16-bit register. @zara"""
    return regs.get(address)


def u32(regs: dict[int, int], address: int, big_endian: bool) -> int | None:
    """Unsigned 32-bit value in the configured word order. @zara"""
    raw = _words(regs, address, big_endian)
    return None if raw is None else struct.unpack(">I", raw)[0]


def f32(regs: dict[int, int], address: int, big_endian: bool) -> float | None:
    """IEEE 754 float in the configured word order; NaN/inf -> None. @zara"""
    raw = _words(regs, address, big_endian)
    if raw is None:
        return None
    value = struct.unpack(">f", raw)[0]
    return value if math.isfinite(value) else None


def text(regs: dict[int, int], address: int, count: int) -> str:
    """ASCII string, two characters per register, NUL padded. @zara"""
    data = b"".join(
        struct.pack(">H", regs[address + offset])
        for offset in range(count)
        if address + offset in regs
    )
    return data.split(b"\x00", 1)[0].decode("ascii", "ignore").strip()


def big_endian(regs: dict[int, int]) -> bool:
    """Word order of floats as configured in the inverter (register 5). @zara"""
    return regs.get(BYTE_ORDER_REGISTER) == 1


def identity(regs: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model of the inverter, or None if this is no PLENTICORE. @zara"""
    serial = text(regs, 14, 8)
    if not serial:
        return None
    product = " ".join(
        part for part in (text(regs, 768, 32), text(regs, 800, 32)) if part
    )
    model = product or f"{NAME} PLENTICORE"
    return {"serial": serial, "name": model, "model": model}


def _set(device: KostalDevice, role: str, value: float | None, digits: int = 1) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _kwh(value: float | None) -> float | None:
    return None if value is None else value / 1000


def build_devices(regs: dict[int, int]) -> dict[str, KostalDevice]:
    """Parse one cycle of registers into the inverter device. @zara"""
    ident = identity(regs)
    if ident is None:
        return {}
    order = big_endian(regs)
    device = KostalDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    strings = u16(regs, 34) or len(DC_INPUTS)
    inputs = DC_INPUTS[: max(0, min(strings, len(DC_INPUTS)))]
    dc_powers: list[float] = []
    for index, (power_reg, current_reg, voltage_reg) in enumerate(inputs, start=1):
        power = f32(regs, power_reg, order)
        if power is not None:
            dc_powers.append(power)
        _set(device, indexed_role("power_solar_mppt", index), power, 0)
        _set(
            device,
            indexed_role("current_solar_mppt", index),
            f32(regs, current_reg, order),
            2,
        )
        _set(
            device,
            indexed_role("voltage_solar_mppt", index),
            f32(regs, voltage_reg, order),
        )
    total_pv = f32(regs, 1066, order)
    if total_pv is None and dc_powers:
        total_pv = sum(dc_powers)
        device.derived.add("power_solar")
    _set(device, "power_solar", total_pv, 0)
    _set(device, "power_inverter_ac_output", f32(regs, 172, order), 0)
    _set(device, "voltage_grid", f32(regs, 158, order))
    _set(device, "frequency_grid", f32(regs, 152, order), 2)
    _set(device, "energy_solar_total", _kwh(f32(regs, 1056, order)), 3)

    battery_type = u16(regs, 588) or 0
    # battery type 0 = "no battery (PV functionality)"; a hybrid-capable device
    # without battery may still report a bidirectional converter (register 30)
    has_battery = bool(battery_type)
    flows = {
        "power_grid_to_house": f32(regs, 108, order),
        "power_solar_to_house": f32(regs, 116, order),
    }
    if has_battery:
        flows["power_battery_to_house"] = f32(regs, 106, order)
    for role, value in flows.items():
        _set(device, role, None if value is None else max(0.0, value), 0)
    if all(value is not None for value in flows.values()):
        _set(device, "power_house", sum(max(0.0, value) for value in flows.values()), 0)
        device.derived.add("power_house")
    _set(device, "energy_house_total", _kwh(f32(regs, 118, order)), 3)

    if has_battery:
        _set(device, "battery_soc", f32(regs, 210, order), 0)
        _set(device, "temperature_battery", f32(regs, 214, order))
        capacity = u32(regs, 529, order)
        if capacity:
            _set(device, "capacity_battery", capacity / 1000, 2)
        current = f32(regs, 200, order)
        voltage = f32(regs, 216, order)
        if current is not None and voltage is not None:
            power = -current * voltage
            _set(device, "power_battery", power, 0)
            _set(device, "power_battery_charge", max(0.0, power), 0)
            _set(device, "power_battery_discharge", max(0.0, -power), 0)
            device.derived.update(
                {"power_battery", "power_battery_charge", "power_battery_discharge"}
            )
        _set(device, "energy_battery_charge_total", _kwh(f32(regs, 1046, order)), 3)
        _set(device, "energy_battery_discharge_total", _kwh(f32(regs, 1048, order)), 3)
        soh = u16(regs, 40428)
        if soh is not None and 0 < soh <= 100:
            device.roles["battery_soh"] = soh

    state = u32(regs, 56, order)
    if state is not None:
        device.vendor["inverter_state"] = state
    for key, value, digits in (
        ("controller_temperature", f32(regs, 98, order), 1),
        ("powermeter_power", f32(regs, 252, order), 0),
        ("daily_yield", _kwh(f32(regs, 322, order)), 3),
        ("total_yield", _kwh(f32(regs, 320, order)), 3),
    ):
        if value is not None:
            device.vendor[key] = round(value, digits)
    return {device.serial: device}
