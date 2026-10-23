# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Solplanet (AISWEI) adapter, Modbus TCP input registers, read only. @zara

Register map: AISWEI MB001 V2.1.3. The documented decimal address drops the
3xxxx prefix and then one (31001 -> 1000). Function 0x04. Real value = gain
times the raw value. NaN values from section 3.2 are missing data.

A 32-bit value uses the lower address as the high word: section 3.6 orders
every multi-byte field high then low, and section 3.2 writes the NaN as
0xFFFF FFFF. The assignment table has no separate word-order sentence.

Grid power, house consumption and battery power are not published. The meter
and the battery-power register do not state a sign. Battery measurements are
published only while battery status is not "not available".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..contract import indexed_role

VENDOR = "solplanet"
NAME = "Solplanet"
CONNECTION_MODBUS = "local_modbus_solplanet"
DEFAULT_SCAN_SECONDS = 20
MIN_SCAN_SECONDS = 10
DEFAULT_PORT = 502
# inverter Modbus address in MB001; an Ai-logger answers as 239
DEFAULT_UNIT_ID = 3
REQUEST_GAP_SECONDS = 1.0
# documented address -> PDU address (mb001: 31001 -> 1000)
ADDRESS_BASE = 30001
DOC_TYPE = 31001
DOC_SERIAL = 31003
SERIAL_WORDS = 16
DOC_MODEL = 31019
MODEL_WORDS = 8
DOC_RATED = 31028
DOC_FIRMWARE = 31030
FIRMWARE_WORDS = 7
DOC_TEMPERATURE = 31311
DOC_E_TODAY = 31303
DOC_E_TOTAL = 31305
DOC_VOLTAGE_L1 = 31359
DOC_VOLTAGE_L2 = 31361
DOC_VOLTAGE_L3 = 31363
DOC_FREQUENCY = 31368
DOC_ACTIVE_POWER = 31371
DOC_PV_E_TODAY = 31603
DOC_PV_E_TOTAL = 31605
DOC_BATTERY_STATUS = 31608
DOC_BATTERY_VOLTAGE = 31617
DOC_BATTERY_TEMPERATURE = 31621
DOC_BATTERY_SOC = 31622
DOC_BATTERY_SOH = 31623
# (voltage, current, optional). PV3 and above are marked optional in the table.
PV_INPUTS = (
    (31319, 31320, False),
    (31321, 31322, False),
    (31323, 31324, True),
    (31325, 31326, True),
    (31327, 31328, True),
    (31329, 31330, True),
    (31331, 31332, True),
    (31333, 31334, True),
    (31335, 31336, True),
    (31337, 31338, True),
)
# 0 = not available, 1 idle, 2 charging, 3 discharging, 4 error
BATTERY_PRESENT = frozenset({1, 2, 3, 4})
IDENTITY_BLOCKS = ((DOC_TYPE - ADDRESS_BASE, 36),)
RUNNING_BLOCKS = ((31301 - ADDRESS_BASE, 79),)
# PV energy and the battery block. Absent on a string that rejects the range.
OPTIONAL_BLOCKS = ((31601 - ADDRESS_BASE, 23),)
MAX_MPPT_W = 30_000
MAX_POWER_W = 100_000
MAX_PV_V = 1_000.0
MAX_PV_A = 40.0
MAX_ENERGY_TODAY = 10_000.0
MAX_ENERGY_TOTAL = 10_000_000.0


def wire(address: int) -> int:
    """Return the PDU address for one documented 3xxxx register. @zara"""
    return address - ADDRESS_BASE


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "rated_power": VendorSpec(
        "W", "power", "measurement", "Rated power", "Nennleistung"
    ),
    "firmware": VendorSpec(None, None, None, "Firmware", "Firmware"),
    "battery_voltage": VendorSpec(
        "V", "voltage", "measurement", "Battery voltage", "Akkuspannung"
    ),
    "inverter_energy_today": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Inverter energy today",
        "Wechselrichter-Energie heute",
    ),
    "inverter_energy_total": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Inverter energy total",
        "Wechselrichter-Energie gesamt",
    ),
    "voltage_grid_l2": VendorSpec(
        "V", "voltage", "measurement", "Grid voltage L2", "Netzspannung L2"
    ),
    "voltage_grid_l3": VendorSpec(
        "V", "voltage", "measurement", "Grid voltage L3", "Netzspannung L3"
    ),
}


@dataclass
class SolplanetDevice:
    """One Solplanet inverter. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def _word(regs: dict[int, int], address: int) -> int | None:
    """One register, or None when the value is missing or not a 16-bit word. @zara"""
    if not isinstance(regs, dict):
        return None
    value = regs.get(address)
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    if value < 0 or value > 0xFFFF:
        return None
    return value


def _u16(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 16-bit value. 0xFFFF is NaN. @zara"""
    value = _word(regs, address)
    if value is None or value == 0xFFFF:
        return None
    return value


def _s16(regs: dict[int, int], address: int) -> int | None:
    """Signed 16-bit value. 0x8000 is NaN. @zara"""
    value = _word(regs, address)
    if value is None or value == 0x8000:
        return None
    return value - 0x10000 if value >= 0x8000 else value


def _u32(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 32-bit value, high word at the lower address. 0xFFFFFFFF is NaN. @zara"""
    high, low = _word(regs, wire(address)), _word(regs, wire(address) + 1)
    if high is None or low is None or (high == 0xFFFF and low == 0xFFFF):
        return None
    return (high << 16) | low


def _s32(regs: dict[int, int], address: int) -> int | None:
    """Signed 32-bit value, high word at the lower address. 0x80000000 is NaN. @zara"""
    value = _u32(regs, address)
    if value is None or value == 0x80000000:
        return None
    return value - 0x100000000 if value >= 0x80000000 else value


def _text(regs: dict[int, int], address: int, count: int, *, alnum: bool) -> str:
    """ASCII text, high byte first. A 0x0000 word ends the string (NaN). @zara"""
    raw = bytearray()
    for offset in range(count):
        word = _word(regs, wire(address) + offset)
        if word is None or word == 0:
            break
        raw.extend((word >> 8, word & 0xFF))
    text = bytes(raw).split(b"\x00", 1)[0].decode("ascii", "ignore")
    if alnum:
        return "".join(
            character
            for character in text
            if character.isascii() and character.isalnum()
        )
    return "".join(
        character
        for character in text
        if character.isascii() and (character.isalnum() or character in ".-_")
    )


def _phase_count(regs: dict[int, int]) -> int | None:
    """Device type string: 1 single phase, 3 three phase. @zara"""
    text = _text(regs, DOC_TYPE, 1, alnum=True)
    if text in ("1", "3"):
        return int(text)
    return None


def _between(value: float | None, low: float, high: float) -> float | None:
    if value is None or value < low or value > high:
        return None
    return value


def _scaled(raw: int | None, gain: float, low: float, high: float) -> float | None:
    if raw is None:
        return None
    return _between(raw * gain, low, high)


def _set(
    device: SolplanetDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def reject_reason(regs: dict[int, int]) -> str:
    """Why ``build_devices`` produced nothing, or an empty string. @zara"""
    try:
        if _phase_count(regs) is None:
            return "Solplanet register 31001 did not contain device type 1 or 3"
        if not _text(regs, DOC_SERIAL, SERIAL_WORDS, alnum=True):
            return "Solplanet reported no serial number"
    except Exception:
        return "Solplanet registers could not be read"
    return ""


def identity(regs: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model, or None when the type or the serial is unusable. @zara"""
    try:
        phases = _phase_count(regs)
        serial = _text(regs, DOC_SERIAL, SERIAL_WORDS, alnum=True)
        model = _text(regs, DOC_MODEL, MODEL_WORDS, alnum=False)
    except Exception:
        return None
    if phases is None or not serial:
        return None
    if not model:
        model = "1P" if phases == 1 else "3P"
    name = f"{NAME} {model}"
    return {"serial": serial, "name": name, "model": name}


def _channels(device: SolplanetDevice, regs: dict[int, int]) -> None:
    solar = 0.0
    solar_seen = False
    for index, (voltage_doc, current_doc, optional) in enumerate(PV_INPUTS, start=1):
        voltage = _scaled(_u16(regs, wire(voltage_doc)), 0.1, 0, MAX_PV_V)
        current = _scaled(_u16(regs, wire(current_doc)), 0.01, 0, MAX_PV_A)
        if optional and not voltage and not current:
            continue
        if voltage is None and current is None:
            continue
        power = None
        if voltage is not None and current is not None:
            power = _between(voltage * current, 0, MAX_MPPT_W)
        _set(device, indexed_role("power_solar_mppt", index), power, 0)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current)
        if power is not None:
            device.derived.add(indexed_role("power_solar_mppt", index))
            solar += power
            solar_seen = True
    if solar_seen:
        _set(device, "power_solar", _between(solar, 0, MAX_POWER_W), 0)
        device.derived.add("power_solar")


def _battery(device: SolplanetDevice, regs: dict[int, int]) -> None:
    status = _u16(regs, wire(DOC_BATTERY_STATUS))
    if status not in BATTERY_PRESENT:
        return
    volts = _scaled(_u16(regs, wire(DOC_BATTERY_VOLTAGE)), 0.01, 20, 900)
    if volts is not None:
        device.vendor["battery_voltage"] = round(volts, 2)
    _set(
        device,
        "temperature_battery",
        _scaled(_s16(regs, wire(DOC_BATTERY_TEMPERATURE)), 0.1, -20, 70),
    )
    _set(
        device,
        "battery_soc",
        _scaled(_u16(regs, wire(DOC_BATTERY_SOC)), 0.01, 0, 100),
        2,
    )
    soh = _scaled(_u16(regs, wire(DOC_BATTERY_SOH)), 0.01, 0, 100)
    if soh is not None and soh > 0:
        _set(device, "battery_soh", soh, 2)
    # 31619 is S32 battery power with no stated sign, so it is not published.


def _build(regs: dict[int, int]) -> dict[str, SolplanetDevice]:
    ident = identity(regs)
    if ident is None:
        return {}
    device = SolplanetDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer="AISWEI",
        model=ident["model"],
    )
    rated = _scaled(_u32(regs, DOC_RATED), 1.0, 100, MAX_POWER_W)
    if rated is not None:
        device.vendor["rated_power"] = round(rated)
    firmware = _text(regs, DOC_FIRMWARE, FIRMWARE_WORDS, alnum=False)
    if firmware:
        device.vendor["firmware"] = firmware
    _channels(device, regs)
    _set(
        device,
        "temperature_inverter",
        _scaled(_s16(regs, wire(DOC_TEMPERATURE)), 0.1, -25, 120),
    )
    _set(
        device,
        "voltage_grid",
        _scaled(_u16(regs, wire(DOC_VOLTAGE_L1)), 0.1, 180, 280),
    )
    for key, document in (
        ("voltage_grid_l2", DOC_VOLTAGE_L2),
        ("voltage_grid_l3", DOC_VOLTAGE_L3),
    ):
        voltage = _scaled(_u16(regs, wire(document)), 0.1, 180, 280)
        if voltage is not None:
            device.vendor[key] = round(voltage, 1)
    _set(
        device,
        "frequency_grid",
        _scaled(_u16(regs, wire(DOC_FREQUENCY)), 0.01, 45, 65),
        2,
    )
    # Active power is the inverter AC measurement. Its sign is not stated,
    # and it is not used as power_grid.
    _set(
        device,
        "power_inverter_ac_output",
        _scaled(_s32(regs, DOC_ACTIVE_POWER), 1.0, -MAX_POWER_W, MAX_POWER_W),
        0,
    )
    today = _scaled(_u32(regs, DOC_E_TODAY), 0.1, 0, MAX_ENERGY_TODAY)
    total = _scaled(_u32(regs, DOC_E_TOTAL), 0.1, 0, MAX_ENERGY_TOTAL)
    if today is not None:
        device.vendor["inverter_energy_today"] = round(today, 1)
    if total is not None:
        device.vendor["inverter_energy_total"] = round(total, 1)
    # PV energy, not the inverter counter (that one can include the battery).
    _set(
        device,
        "energy_solar_today",
        _scaled(_u32(regs, DOC_PV_E_TODAY), 0.1, 0, MAX_ENERGY_TODAY),
    )
    _set(
        device,
        "energy_solar_total",
        _scaled(_u32(regs, DOC_PV_E_TOTAL), 0.1, 0, MAX_ENERGY_TOTAL),
    )
    _battery(device, regs)
    return {device.serial: device}


def build_devices(regs: dict[int, int]) -> dict[str, SolplanetDevice]:
    """Parse a register map into the inverter device. Never raises. @zara"""
    try:
        return _build(regs)
    except Exception:
        return {}
