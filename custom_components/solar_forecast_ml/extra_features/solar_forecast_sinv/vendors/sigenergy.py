# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Sigenergy hybrid adapter for the S-INV contract (Modbus TCP, read only). @zara

Register map: Sigenergy Modbus Protocol V2.9 (2026-05-13), "Hybrid Inv." models
(Sigen Hybrid SP/SP2/TP/TP2, SigenStor EC). Modbus TCP port 502, function 0x04
(input registers) only, at most 124 registers per request and at least 1 s
between two requests (section 4.2). The address on the wire is the documented
register (section 6 example: 30540 = 0x774C). Multi-register values carry the
high word first (section 6 example: 00 00 61 A8 = 25000).

Two Modbus slave addresses on one connection:
- 247, the plant address: grid sensor, plant battery power, load and energy
  statistics of the whole plant (table 5-1)
- 1-246, the inverter address set in the MySigen app: identity, PV strings,
  AC side, battery of this inverter (table 5-3)

Power registers have gain 1000 and unit kW, so the raw value is W.
Documented signs used directly:
- Grid sensor active power 30005: >0 buy from grid -> ``power_grid``
- Plant ESS power 30037: >0 charging, <0 discharging -> ``power_battery``
Grid and house values need the grid sensor (30004 = 1). The inverter's own
battery power 30599 has no stated sign, so ``power_battery`` comes from the
plant and is published only while this inverter holds the plant's whole rated
battery capacity (30548 equals 30083): otherwise a plant with several
inverters would count the battery twice. ``power_house`` is the plant's total
load power 30284 (V2.8 and later); the protocol does not say how it is formed,
so Sigenergy is not a balance-house vendor. PV channels are the PV strings
(31025 string count), not the MPPTs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import struct
from typing import Any

from ..contract import indexed_role

VENDOR = "sigenergy"
NAME = "Sigenergy"
CONNECTION_MODBUS = "local_modbus_sigenergy"
DEFAULT_SCAN_SECONDS = 30
MIN_SCAN_SECONDS = 15
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
PLANT_UNIT_ID = 247
REQUEST_GAP_SECONDS = 1.0
MAX_STRINGS = 16
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((30500, 40),)
PLANT_PROBE_BLOCKS: tuple[tuple[int, int], ...] = ((30000, 6),)
PLANT_BLOCKS: tuple[tuple[int, int], ...] = ((30000, 88),)
INVERTER_BLOCKS: tuple[tuple[int, int], ...] = ((30500, 124), (31000, 42))
# added in later protocol versions; dropped on "illegal address"
OPTIONAL_PLANT_BLOCKS: tuple[tuple[int, int], ...] = (
    (30088, 10),
    (30194, 30),
    (30272, 14),
)
OPTIONAL_INVERTER_BLOCKS: tuple[tuple[int, int], ...] = ((31509, 4),)
# PV strings 5-16 (strings 1-4 sit in 31027-31034)
STRING_BLOCK_HIGH = (31042, 24)
# battery capacities must agree within this share to count as the plant's battery
CAPACITY_TOLERANCE = 0.01


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "running_state": VendorSpec(None, None, None, "Running state", "Betriebszustand"),
    "firmware": VendorSpec(None, None, None, "Firmware", "Firmware"),
    "ems_work_mode": VendorSpec(None, None, None, "EMS work mode", "EMS-Betriebsmodus"),
}


@dataclass
class SigenergyDevice:
    """One Sigenergy hybrid inverter with its battery and the plant grid point. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


Registers = dict[int, int]


def u16(regs: Registers, address: int) -> int | None:
    """Unsigned 16-bit register; 0xFFFF counts as unavailable. @zara"""
    value = regs.get(address)
    return None if value is None or value == 0xFFFF else value


def s16(regs: Registers, address: int) -> int | None:
    """Signed 16-bit register; 0x7FFF counts as unavailable. @zara"""
    value = regs.get(address)
    if value is None or value == 0x7FFF:
        return None
    return struct.unpack(">h", struct.pack(">H", value))[0]


def _raw(regs: Registers, address: int, words: int) -> int | None:
    value = 0
    for offset in range(words):
        word = regs.get(address + offset)
        if word is None:
            return None
        value = (value << 16) | word
    return value


def u32(regs: Registers, address: int) -> int | None:
    """Unsigned 32-bit value, high word first; all ones count as unavailable. @zara"""
    value = _raw(regs, address, 2)
    return None if value is None or value == 0xFFFFFFFF else value


def s32(regs: Registers, address: int) -> int | None:
    """Signed 32-bit value, high word first; 0x7FFFFFFF counts as unavailable. @zara"""
    value = _raw(regs, address, 2)
    if value is None or value == 0x7FFFFFFF:
        return None
    return struct.unpack(">i", struct.pack(">I", value))[0]


def u64(regs: Registers, address: int) -> int | None:
    """Unsigned 64-bit value, high word first; all ones count as unavailable. @zara"""
    value = _raw(regs, address, 4)
    return None if value is None or value == 0xFFFFFFFFFFFFFFFF else value


def text(regs: Registers, address: int, count: int) -> str:
    """ASCII string, high byte first, ended by a zero byte; printable only. @zara"""
    data = b"".join(
        struct.pack(">H", regs[address + offset])
        for offset in range(count)
        if address + offset in regs
    )
    raw = data.split(b"\x00", 1)[0].decode("ascii", "ignore")
    return "".join(c for c in raw if c.isprintable()).strip()


def identity(regs: Registers) -> dict[str, str] | None:
    """Return serial and model from the inverter identity registers, or None. @zara"""
    # the serial ends up in unique ids and logs: keep plain ASCII letters and digits
    serial = "".join(c for c in text(regs, 30515, 10) if c.isascii() and c.isalnum())
    if not serial:
        return None
    model = text(regs, 30500, 15)[:48] or "Hybrid"
    name = f"{NAME} {model}"
    return {"serial": serial, "name": name, "model": name}


def is_plant(regs: Registers) -> bool:
    """Return True when the plant address answered its running registers. @zara"""
    return u16(regs, 30004) in (0, 1)


def string_count(regs: Registers) -> int:
    """Return the PV string count of the inverter, capped at the contract limit. @zara"""
    count = u16(regs, 31025)
    return 0 if count is None else min(count, MAX_STRINGS)


def string_registers(index: int) -> tuple[int, int]:
    """(voltage, current) registers of PV string ``index`` (1-based). @zara"""
    if index <= 4:
        base = 31027 + 2 * (index - 1)
    else:
        # strings 5-16 continue at 31042; the table mislabels 31050 as "PV8 current"
        base = 31042 + 2 * (index - 5)
    return base, base + 1


def optional_inverter_blocks(regs: Registers) -> tuple[tuple[int, int], ...]:
    """Inverter blocks beyond the base set for this inverter. @zara"""
    blocks = list(OPTIONAL_INVERTER_BLOCKS)
    if string_count(regs) > 4:
        blocks.append(STRING_BLOCK_HIGH)
    return tuple(blocks)


def _set(
    device: SigenergyDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _scaled(value: int | None, divisor: float) -> float | None:
    return None if value is None else value / divisor


def _in(value: float | None, low: float, high: float) -> float | None:
    return value if value is not None and low <= value <= high else None


def _flows(device: SigenergyDevice, base: str, value: int, plus: str, minus: str):
    _set(device, base, value, 0)
    _set(device, plus, max(0, value), 0)
    _set(device, minus, max(0, -value), 0)
    device.derived.update({plus, minus})


def build_devices(plant: Registers, inverter: Registers) -> dict[str, SigenergyDevice]:
    """Parse plant (247) and inverter registers into the inverter device. @zara"""
    ident = identity(inverter)
    if ident is None:
        return {}
    device = SigenergyDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    for index in range(1, string_count(inverter) + 1):
        voltage_reg, current_reg = string_registers(index)
        voltage = _in(_scaled(s16(inverter, voltage_reg), 10), 0, 1500)
        current = _in(_scaled(s16(inverter, current_reg), 100), -1, 100)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current, 2)
        if voltage is not None and current is not None:
            role = indexed_role("power_solar_mppt", index)
            _set(device, role, max(0.0, voltage * current), 0)
            device.derived.add(role)
    _set(device, "power_solar", _in(s32(inverter, 31035), 0, 200_000), 0)
    _set(device, "power_inverter_ac_output", s32(inverter, 30587), 0)
    _set(
        device, "temperature_inverter", _in(_scaled(s16(inverter, 31003), 10), -40, 120)
    )
    _set(device, "frequency_grid", _in(_scaled(u16(inverter, 31002), 100), 40, 70), 2)
    # phase A voltage is the phase voltage for every output type with a neutral
    if u16(inverter, 31004) in (0, 2, 3):
        voltage = _in(_scaled(u32(inverter, 31011), 100), 150, 300)
        _set(device, "voltage_grid", voltage)
    _set(device, "energy_solar_today", _scaled(u32(inverter, 31509), 100), 2)
    total = u32(inverter, 31511)
    if total:
        _set(device, "energy_solar_total", total / 100, 2)

    if u16(plant, 30004) == 1:
        grid = s32(plant, 30005)
        if grid is not None:
            _flows(device, "power_grid", grid, "power_grid_import", "power_grid_export")
        imported = u64(plant, 30216)
        exported = u64(plant, 30220)
        # zero totals with a connected sensor mean "not counted yet"
        if imported or exported:
            _set(device, "energy_grid_import_total", _scaled(imported, 100), 2)
            _set(device, "energy_grid_export_total", _scaled(exported, 100), 2)
        _set(device, "power_house", s32(plant, 30284), 0)
        _set(device, "energy_house_today", _scaled(u32(plant, 30092), 100), 2)
        house_total = u64(plant, 30094)
        if house_total:
            _set(device, "energy_house_total", house_total / 100, 2)

    capacity = _scaled(u32(inverter, 30548), 100)
    if capacity:
        _set(device, "capacity_battery", capacity, 2)
        _set(device, "battery_soc", _in(_scaled(u16(inverter, 30601), 10), 0, 100), 1)
        _set(device, "battery_soh", _in(_scaled(u16(inverter, 30602), 10), 0.1, 100), 1)
        _set(
            device,
            "temperature_battery",
            _in(_scaled(s16(inverter, 30603), 10), -40, 100),
        )
        _set(
            device, "energy_battery_charge_today", _scaled(u32(inverter, 30566), 100), 2
        )
        _set(
            device,
            "energy_battery_discharge_today",
            _scaled(u32(inverter, 30572), 100),
            2,
        )
        charged = u64(inverter, 30568)
        discharged = u64(inverter, 30574)
        if charged or discharged:
            _set(device, "energy_battery_charge_total", _scaled(charged, 100), 2)
            _set(device, "energy_battery_discharge_total", _scaled(discharged, 100), 2)
        plant_capacity = _scaled(u32(plant, 30083), 100)
        battery = s32(plant, 30037)
        if (
            battery is not None
            and plant_capacity
            and abs(plant_capacity - capacity) <= capacity * CAPACITY_TOLERANCE
        ):
            _flows(
                device,
                "power_battery",
                battery,
                "power_battery_charge",
                "power_battery_discharge",
            )

    if (state := u16(inverter, 30578)) is not None:
        device.vendor["running_state"] = state
    if (mode := u16(plant, 30003)) is not None:
        device.vendor["ems_work_mode"] = mode
    if firmware := text(inverter, 30525, 15)[:48]:
        device.vendor["firmware"] = firmware
    return {device.serial: device}
