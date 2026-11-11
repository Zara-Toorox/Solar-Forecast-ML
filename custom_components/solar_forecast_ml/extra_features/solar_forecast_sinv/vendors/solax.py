# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""SolaX hybrid adapter for the S-INV contract (Modbus TCP, read only). @zara

Register map: SolaX Power Energy Storage Inverter MODBUS Communication protocols
V001.02 (X1/X3 Hybrid G4, X1/X3-IES, X3-IES-P, X3-ULTRA, ...). Modbus TCP runs on
the SolaX monitoring module (Pocket WiFi+LAN), port 502, unit 1; at least 1 s
between two requests. Real-time values are input registers (function 0x04);
identity is in holding registers (0x03). 32-bit values: first register is the low
word (LSB), the second the high word (MSB).

Documented signs used directly:
- FeedinPower 0x0046 at the grid point: positive to grid, negative from grid ->
  contract ``power_grid`` (positive import) = -FeedinPower
- BatPowerSum 0x0038: positive while charging -> contract ``power_battery``
- OnGridPowerSum 0x0034: positive output -> ``power_inverter_ac_output``
The house consumption is derived: inverter AC output on the grid side minus the
feed-in, plus the off-grid (EPS) output.

Older firmware follows the Modbus TCP&RTU protocol V3.29 (X1/X3 Hybrid G4,
X1/X3-IES, X3-ULTRA) and leaves input registers 0x0028..0x003D empty. With that
whole range at 0 the totals come from the V3.29 registers instead: PV power as
the sum of the strings, AC output from GridPower (X1 0x0002, X3 per phase
0x006C/0x0070/0x0074), battery power 0x0016 with the direction of BDCStatus
0x0019, SOC 0x001C, SOH 0x00BF and capacity 0x0026 (Wh). V3.29 has no inverter
type in holding 0x0015; holding 0x0105 MachineType (1 = X1, 3 = X3) gives the
phase count then.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import struct
from typing import Any

from ..contract import indexed_role

VENDOR = "solax"
NAME = "SolaX"
CONNECTION_LOCAL = "local_modbus_solax"
DEFAULT_SCAN_SECONDS = 15
MIN_SCAN_SECONDS = 10
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
REQUEST_GAP_SECONDS = 1.0
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((0x0000, 0x16),)  # holding
INPUT_BLOCKS: tuple[tuple[int, int], ...] = (
    (0x0000, 0x4C),
    (0x006A, 4),
    (0x0094, 3),
    (0x00B8, 1),
)
OPTIONAL_INPUT_BLOCKS: tuple[tuple[int, int], ...] = ((0x0122, 3),)  # PV3
# V3.29 firmware: phases S/T (X3 only) and BMS user SOC/SOH, read only while the
# V001.02 totals are empty
LEGACY_INPUT_BLOCKS: tuple[tuple[int, int], ...] = ((0x006E, 8), (0x00BE, 2))
LEGACY_TOTALS = range(0x0028, 0x003E)
MACHINE_TYPE_BLOCK: tuple[int, int] = (0x0105, 1)  # holding, V3.29: 1 X1, 3 X3
MAX_CAPACITY_WH = 500_000
# (voltage, current, power) registers per PV input
PV_INPUTS = (
    (0x0003, 0x0005, 0x000A),
    (0x0004, 0x0006, 0x000B),
    (0x0122, 0x0123, 0x0124),
)
INVERTER_TYPES = {
    0x0E: "X3-Hybrid G4",
    0x0F: "X1-Hybrid G4",
    0x17: "X1-IES",
    0x18: "X3-IES",
    0x19: "X3-ULTRA",
    0x1F: "X3-AELIO",
    0x20: "X3-Hybrid G4 PRO",
    0x22: "X1-VAST",
    0x23: "X3-IES-P",
    0x28: "X3-IES-A",
    0x29: "X1-IES-A",
}
THREE_PHASE_TYPES = {0x0E, 0x18, 0x19, 0x1F, 0x20, 0x23, 0x28}
SINGLE_PHASE_TYPES = {0x0F, 0x17, 0x22, 0x29}


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "run_mode": VendorSpec(None, None, None, "Run mode", "Betriebsmodus"),
    "eps_power": VendorSpec(
        "W", "power", "measurement", "Off-grid (EPS) power", "Notstrom-Leistung (EPS)"
    ),
}


@dataclass
class SolaxDevice:
    """One SolaX hybrid inverter with its battery. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def u16(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 16-bit register. @zara"""
    return regs.get(address)


def s16(regs: dict[int, int], address: int) -> int | None:
    """Signed 16-bit register. @zara"""
    value = regs.get(address)
    return None if value is None else struct.unpack(">h", struct.pack(">H", value))[0]


def u32(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 32-bit value, low word first. @zara"""
    low, high = regs.get(address), regs.get(address + 1)
    if low is None or high is None:
        return None
    return (high << 16) | low


def s32(regs: dict[int, int], address: int) -> int | None:
    """Signed 32-bit value, low word first. @zara"""
    value = u32(regs, address)
    return None if value is None else struct.unpack(">i", struct.pack(">I", value))[0]


def text(regs: dict[int, int], address: int, count: int) -> str:
    """ASCII string, two characters per register. @zara"""
    data = b"".join(
        struct.pack(">H", regs[address + offset])
        for offset in range(count)
        if address + offset in regs
    )
    return data.split(b"\x00", 1)[0].decode("ascii", "ignore").strip()


def identity(holding: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model from the holding registers, or None. @zara"""
    serial = text(holding, 0x0000, 7)
    if not serial:
        return None
    model = INVERTER_TYPES.get(u16(holding, 0x0015) or -1) or text(holding, 0x000E, 7)
    model = f"{NAME} {model}".strip() if model else f"{NAME} Hybrid"
    return {"serial": serial, "name": model, "model": model}


def is_legacy(inputs: dict[int, int]) -> bool:
    """True when the V001.02 totals 0x0028..0x003D are all empty (V3.29 firmware). @zara"""
    return not any(inputs.get(address) for address in LEGACY_TOTALS)


def needs_machine_type(holding: dict[int, int]) -> bool:
    """True when holding 0x0015 is empty, as in V3.29, and 0x0105 is not read yet. @zara"""
    return not u16(holding, 0x0015) and MACHINE_TYPE_BLOCK[0] not in holding


def phase_count(holding: dict[int, int]) -> int | None:
    """1 or 3 from the inverter type, else from V3.29 MachineType; None if unknown. @zara"""
    inverter_type = u16(holding, 0x0015)
    if inverter_type in THREE_PHASE_TYPES:
        return 3
    if inverter_type in SINGLE_PHASE_TYPES:
        return 1
    if inverter_type:  # an unlisted V001.02 type: do not guess
        return None
    machine = u16(holding, MACHINE_TYPE_BLOCK[0])
    return machine if machine in (1, 3) else None


def _legacy_ac_output(inputs: dict[int, int], phases: int | None) -> int | None:
    if phases == 1:
        return s16(inputs, 0x0002)
    if phases == 3:
        powers = [s16(inputs, address) for address in (0x006C, 0x0070, 0x0074)]
        if None not in powers:
            return sum(powers)  # type: ignore[arg-type]
    return None


def _legacy_battery_power(inputs: dict[int, int]) -> int | None:
    """Batpower_Charge1 0x0016; BDCStatus 0x0019 (0 discharge, 1 charge) sets the sign. @zara"""
    power = s16(inputs, 0x0016)
    if power is None:
        return None
    status = u16(inputs, 0x0019)
    if status == 1:
        return abs(power)
    if status == 0:
        return -abs(power)
    return power


def _set(device: SolaxDevice, role: str, value: float | None, digits: int = 1) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _scaled(value: int | None, divisor: float) -> float | None:
    return None if value is None else value / divisor


def build_devices(
    holding: dict[int, int], inputs: dict[int, int]
) -> dict[str, SolaxDevice]:
    """Parse identity and real-time registers into the inverter device. @zara"""
    ident = identity(holding)
    if ident is None:
        return {}
    device = SolaxDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    legacy = is_legacy(inputs)
    phases = phase_count(holding)
    count = u16(inputs, 0x001B) or 2
    string_powers: list[int] = []
    for index, (voltage, current, power) in enumerate(
        PV_INPUTS[: max(0, min(count, 3))], start=1
    ):
        _set(
            device,
            indexed_role("voltage_solar_mppt", index),
            _scaled(u16(inputs, voltage), 10),
        )
        _set(
            device,
            indexed_role("current_solar_mppt", index),
            _scaled(u16(inputs, current), 10),
        )
        string_power = u16(inputs, power)
        _set(device, indexed_role("power_solar_mppt", index), string_power, 0)
        if string_power is not None:
            string_powers.append(string_power)
    if legacy:
        on_grid = _legacy_ac_output(inputs, phases)
        off_grid = None  # V3.29 reports off-grid power in VA only
        if string_powers:
            _set(device, "power_solar", sum(string_powers), 0)
            device.derived.add("power_solar")
        if on_grid is not None and phases == 3:
            device.derived.add("power_inverter_ac_output")
    else:
        on_grid = s32(inputs, 0x0034)
        off_grid = s32(inputs, 0x0036)
        _set(device, "power_solar", u32(inputs, 0x0032), 0)
    _set(device, "power_inverter_ac_output", on_grid, 0)
    # grid voltage/frequency registers differ by phase count; unknown types skip them
    phase_registers = (
        (0x006A, 0x006D)
        if phases == 3
        else (0x0000, 0x0007)
        if phases == 1
        else None
    )
    if phase_registers is not None:
        voltage_reg, frequency_reg = phase_registers
        _set(device, "voltage_grid", _scaled(u16(inputs, voltage_reg), 10))
        _set(device, "frequency_grid", _scaled(u16(inputs, frequency_reg), 100), 2)
    _set(device, "energy_solar_total", _scaled(u32(inputs, 0x0094), 10), 1)
    _set(device, "energy_solar_today", _scaled(u16(inputs, 0x0096), 10), 1)

    # grid point (meter / CT 1); skipped while the meter reports a communication error
    feed_in = s32(inputs, 0x0046)
    if feed_in is not None and u16(inputs, 0x00B8) == 1:
        grid = -feed_in
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0, grid), 0)
        _set(device, "power_grid_export", max(0, -grid), 0)
        _set(device, "energy_grid_export_total", _scaled(u32(inputs, 0x0048), 100), 2)
        _set(device, "energy_grid_import_total", _scaled(u32(inputs, 0x004A), 100), 2)
        if on_grid is not None:
            house = on_grid - feed_in + max(0, off_grid or 0)
            _set(device, "power_house", house, 0)
            device.derived.add("power_house")

    if u16(inputs, 0x0017) == 1:  # BMS1 connected
        if legacy:
            battery = _legacy_battery_power(inputs)
            soc = u16(inputs, 0x001C)
            soh = u16(inputs, 0x00BF)
            capacity = u32(inputs, 0x0026)
        else:
            battery = s32(inputs, 0x0038)
            soc = u16(inputs, 0x003C)
            soh = u16(inputs, 0x003D)
            capacity = u32(inputs, 0x003A)
        _set(device, "power_battery", battery, 0)
        if battery is not None:
            _set(device, "power_battery_charge", max(0, battery), 0)
            _set(device, "power_battery_discharge", max(0, -battery), 0)
        if soc is not None and soc <= 100:
            _set(device, "battery_soc", soc, 0)
        if soh is not None and 0 < soh <= 100:
            device.roles["battery_soh"] = soh
        if capacity and capacity <= MAX_CAPACITY_WH:
            _set(device, "capacity_battery", capacity / 1000, 2)
        _set(device, "temperature_battery", s16(inputs, 0x0018))
        _set(device, "energy_battery_charge_total", _scaled(u32(inputs, 0x0021), 10), 1)
        _set(
            device,
            "energy_battery_discharge_total",
            _scaled(u32(inputs, 0x001D), 10),
            1,
        )

    run_mode = u16(inputs, 0x0009)
    if run_mode is not None:
        device.vendor["run_mode"] = run_mode
    if off_grid is not None:
        device.vendor["eps_power"] = off_grid
    return {device.serial: device}
