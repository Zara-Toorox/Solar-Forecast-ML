# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Huawei SUN2000 adapter for the S-INV contract (Modbus TCP, read only). @zara

Register map: Huawei SUN2000MA V100R001C20 Modbus Interface Definitions (identity
30000 ff., PV strings 32016 ff., inverter 32064 ff., energy 32106 ff., power meter
37100 ff.). The same registers are used by the residential SUN2000 L1/M1/M2
inverters. Modbus TCP runs on the SDongle (port 502, Modbus TCP enabled in the
FusionSolar app) or on the inverter's own access point (port 6607). All values are
holding registers (function 0x03) at the documented address; 32-bit values are
high word first.

Documented signs used directly:
- Meter active power 37113: positive = feeding the grid -> contract
  ``power_grid`` (positive import) = -37113
The LUNA2000 battery registers (37758 ff.) are not part of the SUN2000MA
document; they follow the residential SUN2000 interface definitions: battery power
37765 positive while charging -> ``power_battery``. The house consumption is
derived: inverter active power minus the meter's feed-in.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import struct
from typing import Any

from ..contract import indexed_role

VENDOR = "huawei"
NAME = "Huawei"
CONNECTION_LOCAL = "local_modbus_huawei"
DEFAULT_SCAN_SECONDS = 30
MIN_SCAN_SECONDS = 20
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
# Huawei dongles and the inverter access point dislike frequent reconnects: the
# connection stays open across cycles and the registers are read in few large
# blocks with a short gap (the huawei-solar integration uses 0.05 s)
REQUEST_GAP_SECONDS = 0.1
# the SDongle drops requests sent right after the connection is opened
CONNECT_DELAY_SECONDS = 1.0
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((30000, 25), (30070, 3))
INPUT_BLOCKS: tuple[tuple[int, int], ...] = (
    (32016, 16),  # PV string voltage/current
    (32064, 52),  # DC power ... daily yield (32064-32115) in one request
)
# no meter or no battery: the dongle answers "illegal address" and the block is dropped
OPTIONAL_BLOCKS: tuple[tuple[int, int], ...] = (
    (37100, 23),
    (37758, 3),
    (37765, 2),
    (37780, 4),
)
MAX_STRINGS = 8
# consecutive silent cycles before an optional block is given up
SILENT_LIMIT = 3
METER_NORMAL = 1


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "device_status": VendorSpec(None, None, None, "Device status", "Gerätestatus"),
    "inverter_energy_total": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Total yield (AC)",
        "Gesamtertrag (AC)",
    ),
    "inverter_energy_today": VendorSpec(
        "kWh", "energy", "total_increasing", "Yield today (AC)", "Tagesertrag (AC)"
    ),
}


@dataclass
class HuaweiDevice:
    """One Huawei SUN2000 inverter with its meter and battery. @zara"""

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
    """Unsigned 32-bit value, high word first. @zara"""
    high, low = regs.get(address), regs.get(address + 1)
    if high is None or low is None:
        return None
    return (high << 16) | low


def s32(regs: dict[int, int], address: int) -> int | None:
    """Signed 32-bit value, high word first. @zara"""
    value = u32(regs, address)
    return None if value is None else struct.unpack(">i", struct.pack(">I", value))[0]


def text(regs: dict[int, int], address: int, count: int) -> str:
    """ASCII string, two characters per register, zero padded. @zara"""
    data = b"".join(
        struct.pack(">H", regs[address + offset])
        for offset in range(count)
        if address + offset in regs
    )
    return data.split(b"\x00", 1)[0].decode("ascii", "ignore").strip()


def identity(regs: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model from the identity registers, or None. @zara"""
    # the serial ends up in unique ids and logs: keep plain ASCII letters and digits
    serial = "".join(c for c in text(regs, 30015, 10) if c.isascii() and c.isalnum())
    if not serial:
        return None
    model = "".join(c for c in text(regs, 30000, 15) if c.isprintable())
    model = (
        model
        if model.upper().startswith(NAME.upper())
        else f"{NAME} {model or 'SUN2000'}"
    )
    return {"serial": serial, "name": model, "model": model}


def _set(device: HuaweiDevice, role: str, value: float | None, digits: int = 1) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _scaled(value: int | None, divisor: float) -> float | None:
    return None if value is None else value / divisor


def build_devices(regs: dict[int, int]) -> dict[str, HuaweiDevice]:
    """Parse identity and running registers into the inverter device. @zara"""
    ident = identity(regs)
    if ident is None:
        return {}
    device = HuaweiDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    strings = min(u16(regs, 30071) or 0, MAX_STRINGS)
    for index in range(1, strings + 1):
        voltage = _scaled(s16(regs, 32016 + 2 * (index - 1)), 10)
        current = _scaled(s16(regs, 32017 + 2 * (index - 1)), 100)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current, 2)
        if voltage is not None and current is not None:
            role = indexed_role("power_solar_mppt", index)
            _set(device, role, max(0.0, voltage * current), 0)
            device.derived.add(role)
    _set(device, "power_solar", s32(regs, 32064), 0)  # kW x1000 = W
    active = s32(regs, 32080)
    _set(device, "power_inverter_ac_output", active, 0)
    # single-phase models (L1) report the grid voltage as line A-B, others per phase
    single_phase = "-L1" in device.model.upper()
    _set(
        device,
        "voltage_grid",
        _scaled(u16(regs, 32066 if single_phase else 32069), 10),
    )
    _set(device, "frequency_grid", _scaled(u16(regs, 32085), 100), 2)
    _set(device, "temperature_inverter", _scaled(s16(regs, 32087), 10))

    battery_present = bool(u32(regs, 37758)) and u16(regs, 37760) is not None
    total = _scaled(u32(regs, 32106), 100)
    today = _scaled(u32(regs, 32114), 100)
    if battery_present:
        # with a battery the inverter yield includes battery discharge
        if total is not None:
            device.vendor["inverter_energy_total"] = round(total, 2)
        if today is not None:
            device.vendor["inverter_energy_today"] = round(today, 2)
    else:
        _set(device, "energy_solar_total", total, 2)
        _set(device, "energy_solar_today", today, 2)

    meter = s32(regs, 37113)
    if meter is not None and u16(regs, 37100) == METER_NORMAL:
        grid = -meter
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0, grid), 0)
        _set(device, "power_grid_export", max(0, -grid), 0)
        _set(device, "energy_grid_export_total", _scaled(s32(regs, 37119), 100), 2)
        _set(device, "energy_grid_import_total", _scaled(s32(regs, 37121), 100), 2)
        if active is not None:
            _set(device, "power_house", active - meter, 0)
            device.derived.add("power_house")

    if battery_present:
        _set(device, "capacity_battery", _scaled(u32(regs, 37758), 1000), 2)
        _set(device, "battery_soc", _scaled(u16(regs, 37760), 10), 1)
        battery = s32(regs, 37765)
        if battery is not None:
            _set(device, "power_battery", battery, 0)
            _set(device, "power_battery_charge", max(0, battery), 0)
            _set(device, "power_battery_discharge", max(0, -battery), 0)
        _set(device, "energy_battery_charge_total", _scaled(u32(regs, 37780), 100), 2)
        _set(
            device,
            "energy_battery_discharge_total",
            _scaled(u32(regs, 37782), 100),
            2,
        )

    status = u16(regs, 32089)
    if status is not None:
        device.vendor["device_status"] = status
    return {device.serial: device}
