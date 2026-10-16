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
    count = u16(inputs, 0x001B) or 2
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
        _set(device, indexed_role("power_solar_mppt", index), u16(inputs, power), 0)
    _set(device, "power_solar", u32(inputs, 0x0032), 0)
    on_grid = s32(inputs, 0x0034)
    off_grid = s32(inputs, 0x0036)
    _set(device, "power_inverter_ac_output", on_grid, 0)
    # grid voltage/frequency registers differ by phase count; unknown types skip them
    inverter_type = u16(holding, 0x0015)
    phase_registers = (
        (0x006A, 0x006D)
        if inverter_type in THREE_PHASE_TYPES
        else (0x0000, 0x0007)
        if inverter_type in SINGLE_PHASE_TYPES
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
        battery = s32(inputs, 0x0038)
        _set(device, "power_battery", battery, 0)
        if battery is not None:
            _set(device, "power_battery_charge", max(0, battery), 0)
            _set(device, "power_battery_discharge", max(0, -battery), 0)
        _set(device, "battery_soc", u16(inputs, 0x003C), 0)
        soh = u16(inputs, 0x003D)
        if soh is not None and 0 < soh <= 100:
            device.roles["battery_soh"] = soh
        capacity = u32(inputs, 0x003A)
        if capacity:
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
