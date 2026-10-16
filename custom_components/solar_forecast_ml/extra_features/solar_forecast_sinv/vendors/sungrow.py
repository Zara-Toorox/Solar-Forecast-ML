# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Sungrow hybrid adapter for the S-INV contract (Modbus TCP, read only). @zara

Register map: Sungrow communication protocol of residential and small industrial
hybrid inverters V1.1.17 (SH-RS/RT/T/RL/CX, MG-RL/TL). Modbus TCP runs on the
inverter's LAN port or the Ethernet port of WiNet-S/WiNet-S2, port 502, unit 1;
at least 1 s between two requests. All values used here are read-only input
registers (function 0x04). The protocol numbers registers from 1: the address on
the wire is the documented register minus one. 32-bit values: first register is
the low word, the second the high word. Unavailable registers answer 0xFFFF,
0x7FFF, 0xFFFFFFFF or 0x7FFFFFFF and are treated as missing.

Documented signs used directly:
- Meter active power 5601: positive = from grid -> contract ``power_grid``
- Load power 13008 -> ``power_house`` (the inverter's own value, not derived)
- Battery power 5214: negative while charging, positive while discharging ->
  contract ``power_battery`` (positive charging) = -5214
Firmware without 5214 only has the unsigned 13022; its direction comes from the
charge/discharge bits of the power flow status 13001. Grid and load values are
only valid with a smart meter connected directly to the inverter; without one the
inverter reports them as 0, so they are published only once the meter shows any
power or energy. Behind an iHomeManager they describe the whole house.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import struct
from typing import Any

from ..contract import indexed_role

VENDOR = "sungrow"
NAME = "Sungrow"
CONNECTION_LOCAL = "local_modbus_sungrow"
DEFAULT_SCAN_SECONDS = 20
MIN_SCAN_SECONDS = 15
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
REQUEST_GAP_SECONDS = 1.0
# documented register number minus this offset is the address on the wire
ADDRESS_OFFSET = 1
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((4990, 13),)
INPUT_BLOCKS: tuple[tuple[int, int], ...] = ((4990, 47), (13000, 48))
# missing on older firmware or without a meter; dropped on "illegal address"
OPTIONAL_INPUT_BLOCKS: tuple[tuple[int, int], ...] = (
    (5214, 2),
    (5242, 1),
    (5601, 2),
    (5639, 1),
)
# (voltage, current) registers per MPPT
MPPT_REGISTERS = (
    (5011, 5012),
    (5013, 5014),
    (5015, 5016),
    (5115, 5116),
    (5117, 5118),
    (5119, 5120),
    (5121, 5122),
    (5123, 5124),
    (5130, 5131),
    (5132, 5133),
)
# device type code -> (model, MPPT count), protocol appendix 1
DEVICE_TYPES: dict[int, tuple[str, int]] = {
    0xD17: ("SH3.0RS", 2),
    0xD0D: ("SH3.6RS", 2),
    0xD18: ("SH4.0RS", 2),
    0xD0F: ("SH5.0RS", 2),
    0xD10: ("SH6.0RS", 2),
    0xD1A: ("SH8.0RS", 4),
    0xD1B: ("SH10RS", 4),
    0xE00: ("SH5.0RT", 2),
    0xE01: ("SH6.0RT", 2),
    0xE02: ("SH8.0RT", 2),
    0xE03: ("SH10RT", 2),
    0xE10: ("SH5.0RT-20", 2),
    0xE11: ("SH6.0RT-20", 2),
    0xE12: ("SH8.0RT-20", 2),
    0xE13: ("SH10RT-20", 2),
    0xE0C: ("SH5.0RT-V112", 2),
    0xE0D: ("SH6.0RT-V112", 2),
    0xE0E: ("SH8.0RT-V112", 2),
    0xE0F: ("SH10RT-V112", 2),
    0xE08: ("SH5.0RT-V122", 2),
    0xE09: ("SH6.0RT-V122", 2),
    0xE0A: ("SH8.0RT-V122", 2),
    0xE0B: ("SH10RT-V122", 2),
    0xE20: ("SH5T", 2),
    0xE21: ("SH6T", 2),
    0xE22: ("SH8T", 2),
    0xE23: ("SH10T", 2),
    0xE24: ("SH12T", 2),
    0xE25: ("SH15T", 3),
    0xE26: ("SH20T", 3),
    0xE28: ("SH25T", 3),
    0xD27: ("MG5RL", 2),
    0xD28: ("MG6RL", 2),
    0xD31: ("MG7.5RL", 3),
    0xD29: ("MG8RL", 3),
    0xD2A: ("MG10RL", 3),
    0xD2F: ("MG12RL", 3),
    0xD41: ("SH3RL", 2),
    0xD42: ("SH3.6RL", 2),
    0xD43: ("SH4RL", 2),
    0xD2B: ("SH5RL", 2),
    0xD2C: ("SH6RL", 2),
    0xD2D: ("SH8RL", 3),
    0xD2E: ("SH10RL", 3),
    0xE51: ("SH50CX", 10),
    0xE52: ("SH80CX", 10),
    0xE39: ("SH100CX", 10),
    0xE3A: ("SH110CX", 10),
    0xE3D: ("SH125CX", 10),
    0xE53: ("MG10TL", 3),
    0xE54: ("MG12TL", 3),
    0xE55: ("MG15TL", 3),
    0xE56: ("MG20TL", 3),
    0xE57: ("MG25TL", 3),
}
# power flow status bits (appendix 3)
FLOW_CHARGING = 0x02
FLOW_DISCHARGING = 0x04


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
    "total_output_energy": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Total output (AC)",
        "Gesamtertrag (AC)",
    ),
}


@dataclass
class SungrowDevice:
    """One Sungrow hybrid inverter with its battery. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def u16(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 16-bit register; 0xFFFF means unavailable. @zara"""
    value = regs.get(address)
    return None if value is None or value == 0xFFFF else value


def s16(regs: dict[int, int], address: int) -> int | None:
    """Signed 16-bit register; 0x7FFF means unavailable. @zara"""
    value = regs.get(address)
    if value is None or value == 0x7FFF:
        return None
    return struct.unpack(">h", struct.pack(">H", value))[0]


def _raw32(regs: dict[int, int], address: int) -> int | None:
    low, high = regs.get(address), regs.get(address + 1)
    if low is None or high is None:
        return None
    return (high << 16) | low


def u32(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 32-bit value, low word first; 0xFFFFFFFF means unavailable. @zara"""
    value = _raw32(regs, address)
    return None if value is None or value == 0xFFFFFFFF else value


def s32(regs: dict[int, int], address: int) -> int | None:
    """Signed 32-bit value, low word first; 0x7FFFFFFF means unavailable. @zara"""
    value = _raw32(regs, address)
    if value is None or value == 0x7FFFFFFF:
        return None
    return struct.unpack(">i", struct.pack(">I", value))[0]


def text(regs: dict[int, int], address: int, count: int) -> str:
    """UTF-8 string, high byte first, padded with zero bytes. @zara"""
    data = b"".join(
        struct.pack(">H", regs[address + offset])
        for offset in range(count)
        if address + offset in regs
    )
    return data.split(b"\x00", 1)[0].decode("utf-8", "ignore").strip()


def mppt_count(regs: dict[int, int]) -> int:
    """MPPT count of the model; unknown models count the readable MPPT 1-3. @zara"""
    known = DEVICE_TYPES.get(u16(regs, 5000) or -1)
    if known is not None:
        return known[1]
    return sum(
        1 for voltage, _current in MPPT_REGISTERS[:3] if u16(regs, voltage) is not None
    )


def mppt_blocks(count: int) -> tuple[tuple[int, int], ...]:
    """Extra input blocks for models with more than three MPPTs. @zara"""
    blocks: list[tuple[int, int]] = []
    if count > 3:
        blocks.append((5115, 10))
    if count > 8:
        blocks.append((5130, 4))
    return tuple(blocks)


def identity(regs: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model from the identity registers, or None. @zara"""
    # the serial ends up in unique ids and logs: keep plain ASCII letters and digits
    serial = "".join(c for c in text(regs, 4990, 10) if c.isascii() and c.isalnum())
    if not serial:
        return None
    known = DEVICE_TYPES.get(u16(regs, 5000) or -1)
    model = f"{NAME} {known[0]}" if known else f"{NAME} Hybrid"
    return {"serial": serial, "name": model, "model": model}


def _set(
    device: SungrowDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _scaled(value: int | None, divisor: float) -> float | None:
    return None if value is None else value / divisor


def build_devices(regs: dict[int, int]) -> dict[str, SungrowDevice]:
    """Parse identity and running registers into the inverter device. @zara"""
    ident = identity(regs)
    if ident is None:
        return {}
    device = SungrowDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    for index, (voltage_reg, current_reg) in enumerate(
        MPPT_REGISTERS[: min(mppt_count(regs), len(MPPT_REGISTERS))], start=1
    ):
        voltage = _scaled(u16(regs, voltage_reg), 10)
        current = _scaled(u16(regs, current_reg), 10)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current)
        if voltage is not None and current is not None:
            role = indexed_role("power_solar_mppt", index)
            _set(device, role, voltage * current, 0)
            device.derived.add(role)
    _set(device, "power_solar", u32(regs, 5017), 0)
    _set(device, "power_inverter_ac_output", s32(regs, 13034), 0)
    _set(device, "temperature_inverter", _scaled(s16(regs, 5008), 10))
    # output type 2 (3P3L) reports line voltages only; an iHomeManager may report
    # line voltages for 3P4L too, which are dropped instead of being converted
    voltage = _scaled(u16(regs, 5019), 10)
    if u16(regs, 5002) in (0, 1) and voltage is not None and 180 <= voltage <= 280:
        _set(device, "voltage_grid", voltage)
    frequency = _scaled(u16(regs, 5242), 100)
    if frequency is None:
        frequency = _scaled(u16(regs, 5036), 10)
    _set(device, "frequency_grid", frequency, 2)
    _set(device, "energy_solar_today", _scaled(u16(regs, 13002), 10), 1)
    _set(device, "energy_solar_total", _scaled(u32(regs, 13003), 10), 1)

    # grid point and load need a smart meter connected directly to the inverter
    grid = s32(regs, 5601)
    imported = u32(regs, 13037)
    exported = u32(regs, 13046)
    # without a meter every grid value reads 0, which must not pass as a balance
    if grid is not None and (grid or imported or exported):
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0, grid), 0)
        _set(device, "power_grid_export", max(0, -grid), 0)
        _set(device, "energy_grid_import_total", _scaled(imported, 10), 1)
        _set(device, "energy_grid_export_total", _scaled(exported, 10), 1)
        load = s32(regs, 13008)
        if load is not None:
            _set(device, "power_house", load, 0)

    capacity = _scaled(u16(regs, 5639), 100)
    if capacity is None:
        capacity = _scaled(u16(regs, 13039), 10)
    if capacity:
        _set(device, "capacity_battery", capacity, 2)
        _set(device, "battery_soc", _scaled(u16(regs, 13023), 10), 1)
        soh = _scaled(u16(regs, 13024), 10)
        if soh is not None and 0 < soh <= 100:
            device.roles["battery_soh"] = round(soh, 1)
        _set(device, "temperature_battery", _scaled(s16(regs, 13025), 10))
        _set(device, "energy_battery_charge_total", _scaled(u32(regs, 13041), 10), 1)
        _set(
            device,
            "energy_battery_discharge_total",
            _scaled(u32(regs, 13027), 10),
            1,
        )
        signed = s32(regs, 5214)
        battery: int | None = -signed if signed is not None else None
        magnitude = u16(regs, 13022)
        flow = u16(regs, 13001)
        if battery is None and magnitude is not None and flow is not None:
            if flow & FLOW_CHARGING:
                battery = magnitude
            elif flow & FLOW_DISCHARGING:
                battery = -magnitude
            else:
                battery = 0
        if battery is not None:
            _set(device, "power_battery", battery, 0)
            _set(device, "power_battery_charge", max(0, battery), 0)
            _set(device, "power_battery_discharge", max(0, -battery), 0)

    state = u16(regs, 13000)
    if state is not None:
        device.vendor["running_state"] = state
    output = u32(regs, 5004)
    if output is not None:
        # SH50~125CX count this register in kWh, all other models in 0.1 kWh
        divisor = (
            1 if (u16(regs, 5000) or 0) in (0xE51, 0xE52, 0xE39, 0xE3A, 0xE3D) else 10
        )
        device.vendor["total_output_energy"] = round(output / divisor, 1)
    return {device.serial: device}
