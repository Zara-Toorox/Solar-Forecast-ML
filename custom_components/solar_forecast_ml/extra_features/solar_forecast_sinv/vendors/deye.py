# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Deye three-phase hybrid adapter (Modbus, read only). @zara

Register map: Deye MODBUS RTU protocol for three-phase storage inverters V105.4.
Holding registers, function 0x03, at the documented address. Device type 0
selects the family: 0x0500 low-voltage three-phase hybrid, 0x0600 high-voltage
three-phase hybrid. Any other type yields no device.

V104 made the AC-side values 32-bit. The original register is the low word and
the matching register in 687-709 is the high word. PV and battery power stay
16-bit. Low-voltage power scales are 1 W, high-voltage 10 W (register 672 states
L:1W / H:10W; register 143 states Low Vol 1 W / High Vol 10 W). Battery register
590 is output power (S16): positive means the battery is outputting, so
discharging. Contract ``power_battery`` is the negated value.

Grid power 625/690 is the signed meter/CT total that follows the internal (607)
or external (619) measurement, 1 W, low word first. V105.4 does not print which
sign is import. community map: positive means import, which is already the
contract sign of ``power_grid``.

Load power 653/659 is the load-side total. The load currents are marked unused,
and the document does not show this total to be a balance of grid power and the
inverter's own AC power, so Deye is not a balance-house vendor. ``power_ac_net``
is not published: the contract reserves it for an unambiguous house-grid flow,
and inverter output 636/694 is the inverter port of a hybrid.

Total PV energy 534/535 is marked reserved and is not published. Daily PV 529
is the device's own solar-today counter.

Device type 0x0300 (single-phase hybrid), 0x0200 (string) and 0x0400
(microinverter) use community register tables. Every value taken from those
tables is marked "community map". Single-phase grid power (register 169) and
battery power (register 190) are not published: the scale of 169 is 1 in one
table and 10 in another, and neither source states the sign outright.
``power_house`` is not derived from them. The single-phase hybrid is read in
blocks of at most 16 registers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..contract import indexed_role

VENDOR = "deye"
NAME = "Deye"
CONNECTION_SOLARMAN = "local_solarman_v5"
CONNECTION_MODBUS = "local_modbus_deye"
DEFAULT_SCAN_SECONDS = 20
MIN_SCAN_SECONDS = 10
DEFAULT_PORT_SOLARMAN = 8899
DEFAULT_PORT_MODBUS = 502
DEFAULT_UNIT_ID = 1
REQUEST_GAP_SECONDS = 1.0
TYPE_STRING = 0x0200
TYPE_1P = 0x0300
TYPE_MICRO = 0x0400
TYPE_LV = 0x0500
TYPE_HV = 0x0600
# (model, high-voltage battery/PV scale). The flag is only meaningful for 3P.
DEVICE_TYPES: dict[int, tuple[str, bool]] = {
    TYPE_STRING: ("String", False),
    TYPE_1P: ("1P Hybrid", False),
    TYPE_MICRO: ("Micro", False),
    TYPE_LV: ("3P LV Hybrid", False),
    TYPE_HV: ("3P HV Hybrid", True),
}
# SG03LP1 answers at most 16 registers per request. Every 1P block stays at or under that.
LP1_BLOCKS: tuple[tuple[int, int], ...] = (
    (0, 16),
    (16, 9),
    (70, 16),
    (90, 2),
    (96, 16),
    (112, 1),
    (150, 1),
    (182, 3),
    (186, 2),
    (192, 1),
)
STRING_BLOCKS: tuple[tuple[int, int], ...] = (
    (0, 25),
    (60, 32),
    (109, 8),
    (198, 13),
)
MICRO_BLOCKS: tuple[tuple[int, int], ...] = (
    (0, 25),
    (60, 32),
    (109, 8),
)
# (power, voltage, current) shared by the LP1 tables. PV3 exists only on one variant.
LP1_MPPT = (
    (186, 109, 110),
    (187, 111, 112),
)
# (voltage, current) for string and micro. Per-input power is marked computed.
PV_VI = (
    (109, 110),
    (111, 112),
    (113, 114),
    (115, 116),
)
MPPT_LIMIT = 4
# (power, voltage, current) per MPPT 1-4
MPPT_REGISTERS = (
    (672, 676, 677),
    (673, 678, 679),
    (674, 680, 681),
    (675, 682, 683),
)
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((0, 25),)
INPUT_BLOCKS: tuple[tuple[int, int], ...] = (
    (0, 25),
    (500, 44),  # 500-543: state, energies, heat-sink temperature
    (586, 70),  # 586-655: battery, grid, inverter and load low words
    (656, 55),  # 656-710: load high words and AC high words 687-709
)
# Deye battery area; missing on inverters that do not proxy a pack
OPTIONAL_BLOCKS: tuple[tuple[int, int], ...] = ((10000, 9),)
MAX_MPPT_W = 30_000
MAX_POWER_W = 100_000
MAX_BATTERY_W = 50_000
MAX_PV_V = 1_000.0
MAX_PV_A = 40.0
MAX_ENERGY_TODAY = 10_000.0
MAX_ENERGY_TOTAL = 10_000_000.0


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
    "running_state": VendorSpec(None, None, None, "Running state", "Betriebszustand"),
    "battery_voltage": VendorSpec(
        "V", "voltage", "measurement", "Battery voltage", "Akkuspannung"
    ),
    "ac_energy_today": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Grid-side generation today",
        "Netzseitige Erzeugung heute",
    ),
    "ac_energy_total": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Grid-side generation total",
        "Netzseitige Erzeugung gesamt",
    ),
}


@dataclass
class DeyeDevice:
    """One Deye three-phase hybrid inverter with its battery. @zara"""

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


def _s16(regs: dict[int, int], address: int) -> int | None:
    value = _word(regs, address)
    if value is None:
        return None
    return value - 0x10000 if value >= 0x8000 else value


def _u32(regs: dict[int, int], low: int, high: int) -> int | None:
    """Unsigned 32-bit value, low word first. @zara"""
    low_word, high_word = _word(regs, low), _word(regs, high)
    if low_word is None or high_word is None:
        return None
    return (high_word << 16) | low_word


def _s32(regs: dict[int, int], low: int, high: int) -> int | None:
    """Signed 32-bit value, low word first (V104 AC registers). @zara"""
    value = _u32(regs, low, high)
    if value is None:
        return None
    return value - 0x100000000 if value >= 0x80000000 else value


def _serial(regs: dict[int, int]) -> str:
    """Return the serial from registers 3-7, ASCII alnum only. @zara"""
    raw = bytearray()
    for address in range(3, 8):
        word = _word(regs, address)
        if word is None:
            break
        raw.extend((word >> 8, word & 0xFF))
    text = bytes(raw).split(b"\x00", 1)[0].decode("ascii", "ignore")
    return "".join(
        character for character in text if character.isascii() and character.isalnum()
    )


def _high_voltage(regs: dict[int, int]) -> bool:
    return _word(regs, 0) == TYPE_HV


def _power_scale(regs: dict[int, int]) -> int:
    """1 W on a low-voltage hybrid, 10 W on a high-voltage hybrid. @zara"""
    return 10 if _high_voltage(regs) else 1


def mppt_count(regs: dict[int, int]) -> int:
    """MPPT count from register 22 (high byte), capped at the four mapped inputs. @zara"""
    raw = _word(regs, 22)
    if raw is None:
        return 0
    count, phases = (raw >> 8) & 0xFF, raw & 0xFF
    if not 1 <= count <= 8 or not 1 <= phases <= 3:
        return 0
    return min(count, MPPT_LIMIT)


def reject_reason(regs: dict[int, int]) -> str:
    """Why ``build_devices`` produced nothing, or an empty string. @zara"""
    try:
        device_type = _word(regs, 0) if isinstance(regs, dict) else None
        if device_type is None:
            return "Deye register 0 did not contain a device type"
        if device_type not in DEVICE_TYPES:
            return (
                f"Deye device type {device_type:#06x} is not a supported family "
                "(expected 0x0200 string, 0x0300 single-phase hybrid, "
                "0x0400 microinverter, 0x0500 or 0x0600 three-phase hybrid)"
            )
        if not _serial(regs):
            return "Deye reported no serial number"
    except Exception:
        return "Deye registers could not be read"
    return ""


def identity(regs: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model, or None when the type or the serial is unusable. @zara"""
    try:
        known = DEVICE_TYPES.get(_word(regs, 0) or -1)
        serial = _serial(regs)
    except Exception:
        return None
    if known is None or not serial:
        return None
    model = f"{NAME} {known[0]}"
    return {"serial": serial, "name": model, "model": model}


def _set(device: DeyeDevice, role: str, value: float | None, digits: int = 1) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _between(value: float | None, low: float, high: float) -> float | None:
    if value is None or value < low or value > high:
        return None
    return value


def _energy(
    regs: dict[int, int], low: int, high: int | None, limit: float
) -> float | None:
    """0.1 kWh register, or a low/high pair, inside ``limit``. @zara"""
    if high is None:
        raw = _word(regs, low)
    else:
        raw = _u32(regs, low, high)
    if raw is None:
        return None
    return _between(raw / 10, 0, limit)


def input_blocks(device_type: int | None) -> tuple[tuple[int, int], ...]:
    """Holding-register blocks for one family. Unknown types read nothing further. @zara"""
    if device_type == TYPE_1P:
        return LP1_BLOCKS
    if device_type == TYPE_STRING:
        return STRING_BLOCKS
    if device_type == TYPE_MICRO:
        return MICRO_BLOCKS
    if device_type in (TYPE_LV, TYPE_HV):
        return INPUT_BLOCKS
    return ()


def optional_blocks(device_type: int | None) -> tuple[tuple[int, int], ...]:
    """Blocks that may be absent. Only the three-phase hybrid has one. @zara"""
    if device_type in (TYPE_LV, TYPE_HV):
        return OPTIONAL_BLOCKS
    return ()


def _build(regs: dict[int, int]) -> dict[str, DeyeDevice]:
    """Dispatch on register 0. The three-phase path is unchanged. @zara"""
    device_type = _word(regs, 0) if isinstance(regs, dict) else None
    if device_type in (TYPE_LV, TYPE_HV):
        return _build_three_phase(regs)
    if device_type == TYPE_1P:
        return _build_single_phase(regs)
    if device_type == TYPE_STRING:
        return _build_string(regs)
    if device_type == TYPE_MICRO:
        return _build_micro(regs)
    return {}


def _shell(regs: dict[int, int]) -> DeyeDevice | None:
    ident = identity(regs)
    if ident is None:
        return None
    return DeyeDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )


def _rated(device: DeyeDevice, regs: dict[int, int]) -> None:
    """Rated power from the V105.4 inherent area (registers 20-21, 0.1 W). @zara"""
    rated = _u32(regs, 20, 21)
    rated_w = None if rated is None else rated / 10
    rated_w = _between(rated_w, 100, MAX_POWER_W)
    if rated_w is not None:
        device.vendor["rated_power"] = round(rated_w)


def _scaled(raw: int | None, factor: float, low: float, high: float) -> float | None:
    if raw is None:
        return None
    return _between(raw * factor, low, high)


def _build_single_phase(regs: dict[int, int]) -> dict[str, DeyeDevice]:
    """Build a single-phase hybrid from the shared LP1 community tables. @zara"""
    device = _shell(regs)
    if device is None:
        return {}
    _rated(device, regs)
    solar = 0.0
    solar_seen = False
    for index, (power_reg, voltage_reg, current_reg) in enumerate(LP1_MPPT, start=1):
        # community map: PV power U16 W, voltage and current 0.1
        power = _scaled(_word(regs, power_reg), 1, 0, MAX_MPPT_W)
        voltage = _scaled(_word(regs, voltage_reg), 0.1, 0, MAX_PV_V)
        current = _scaled(_word(regs, current_reg), 0.1, 0, MAX_PV_A)
        _set(device, indexed_role("power_solar_mppt", index), power, 0)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current)
        if power is not None:
            solar += power
            solar_seen = True
    if solar_seen:
        _set(device, "power_solar", _between(solar, 0, MAX_POWER_W), 0)
        device.derived.add("power_solar")
    # community map: daily PV 108 and total PV 96/97, 0.1 kWh, low word first
    _set(device, "energy_solar_today", _energy(regs, 108, None, MAX_ENERGY_TODAY))
    _set(device, "energy_solar_total", _energy(regs, 96, 97, MAX_ENERGY_TOTAL))
    # community map: 76 bought and 77 sold are daily import and export, 0.1 kWh
    _set(device, "energy_grid_import_today", _energy(regs, 76, None, MAX_ENERGY_TODAY))
    _set(device, "energy_grid_export_today", _energy(regs, 77, None, MAX_ENERGY_TODAY))
    # community map: total sold 81/82 agrees; total bought does not (79, 80, or absent)
    _set(device, "energy_grid_export_total", _energy(regs, 81, 82, MAX_ENERGY_TOTAL))
    # community map: battery energy counters, unsigned, 0.1 kWh, low word first
    _set(
        device, "energy_battery_charge_today", _energy(regs, 70, None, MAX_ENERGY_TODAY)
    )
    _set(
        device,
        "energy_battery_discharge_today",
        _energy(regs, 71, None, MAX_ENERGY_TODAY),
    )
    _set(device, "energy_battery_charge_total", _energy(regs, 72, 73, MAX_ENERGY_TOTAL))
    _set(
        device,
        "energy_battery_discharge_total",
        _energy(regs, 74, 75, MAX_ENERGY_TOTAL),
    )
    # community map: grid voltage L1 register 150, 0.1 V
    _set(
        device,
        "voltage_grid",
        _scaled(_word(regs, 150), 0.1, 180, 280),
    )
    # community map: load frequency 192 is the register every LP1 table shares, 0.01 Hz
    _set(
        device,
        "frequency_grid",
        _scaled(_word(regs, 192), 0.01, 45, 65),
        2,
    )
    # community map: radiator temperature 90, S16, 0.1 °C
    _set(
        device,
        "temperature_inverter",
        _scaled(_s16(regs, 90), 0.1, 0, 120),
    )
    # community map: battery temperature 182, 0.1 °C; voltage 183, 0.01 V; SOC 184, 1 %
    _set(
        device,
        "temperature_battery",
        _scaled(_word(regs, 182), 0.1, 0, 70),
    )
    _set(device, "battery_soc", _scaled(_word(regs, 184), 1, 0, 100), 0)
    volts = _scaled(_word(regs, 183), 0.01, 20, 80)
    if volts is not None:
        device.vendor["battery_voltage"] = round(volts, 2)
    # Register 169 (grid power) and 190 (battery power) stay unpublished:
    # community map sources disagree on the scale of 169 and do not state either sign.
    return {device.serial: device}


def _pv_channels(device: DeyeDevice, regs: dict[int, int]) -> None:
    """Publish PV voltage and current. Power is not a register on these families. @zara"""
    for index, (voltage_reg, current_reg) in enumerate(PV_VI, start=1):
        # community map: 0.1 V and 0.1 A
        _set(
            device,
            indexed_role("voltage_solar_mppt", index),
            _scaled(_word(regs, voltage_reg), 0.1, 0, MAX_PV_V),
        )
        _set(
            device,
            indexed_role("current_solar_mppt", index),
            _scaled(_word(regs, current_reg), 0.1, 0, MAX_PV_A),
        )


def _build_string(regs: dict[int, int]) -> dict[str, DeyeDevice]:
    """Build a string inverter from the community string table. @zara"""
    device = _shell(regs)
    if device is None:
        return {}
    _rated(device, regs)
    _pv_channels(device, regs)
    # community map: production today 60 and total 63/64, 0.1 kWh, low word first
    _set(device, "energy_solar_today", _energy(regs, 60, None, MAX_ENERGY_TODAY))
    _set(device, "energy_solar_total", _energy(regs, 63, 64, MAX_ENERGY_TOTAL))
    # community map: DC total power 82, unit W, factor 0.1
    power = _scaled(_word(regs, 82), 0.1, 0, MAX_POWER_W)
    _set(device, "power_solar", power, 1)
    # community map: AC active power 86/87, unsigned, factor 0.1 W, low word first
    _set(
        device,
        "power_inverter_ac_output",
        _scaled(_u32(regs, 86, 87), 0.1, 0, MAX_POWER_W),
        1,
    )
    # community map: grid L1 voltage 73, 0.1 V; AC frequency 79, 0.01 Hz
    _set(device, "voltage_grid", _scaled(_word(regs, 73), 0.1, 180, 280))
    _set(device, "frequency_grid", _scaled(_word(regs, 79), 0.01, 45, 65), 2)
    # community map: radiator temperature 90, 0.1 °C
    _set(device, "temperature_inverter", _scaled(_word(regs, 90), 0.1, 0, 120))
    # community map: load consumption 200 (0.01 kWh) and 201/202 (0.1 kWh)
    _set(
        device,
        "energy_house_today",
        _scaled(_word(regs, 200), 0.01, 0, MAX_ENERGY_TODAY),
    )
    _set(
        device,
        "energy_house_total",
        _scaled(_u32(regs, 201, 202), 0.1, 0, MAX_ENERGY_TOTAL),
    )
    # community map: sold 205/206 and bought 208/209. Daily factor 0.01, totals 0.1
    _set(
        device,
        "energy_grid_export_today",
        _scaled(_word(regs, 205), 0.01, 0, MAX_ENERGY_TODAY),
    )
    _set(
        device,
        "energy_grid_export_total",
        _scaled(_u32(regs, 206, 207), 0.1, 0, MAX_ENERGY_TOTAL),
    )
    _set(
        device,
        "energy_grid_import_today",
        _scaled(_word(regs, 208), 0.01, 0, MAX_ENERGY_TODAY),
    )
    _set(
        device,
        "energy_grid_import_total",
        _scaled(_u32(regs, 209, 210), 0.1, 0, MAX_ENERGY_TOTAL),
    )
    # Grid power 203/204 is unsigned and load power 198/199 has no stated sign.
    return {device.serial: device}


def _build_micro(regs: dict[int, int]) -> dict[str, DeyeDevice]:
    """Build a microinverter from the community micro table. @zara"""
    device = _shell(regs)
    if device is None:
        return {}
    _rated(device, regs)
    _pv_channels(device, regs)
    # community map: production today 60 and total 63/64, 0.1 kWh, low word first
    _set(device, "energy_solar_today", _energy(regs, 60, None, MAX_ENERGY_TODAY))
    _set(device, "energy_solar_total", _energy(regs, 63, 64, MAX_ENERGY_TOTAL))
    # community map: AC active power 86/87, unsigned, factor 0.1 W, low word first
    _set(
        device,
        "power_inverter_ac_output",
        _scaled(_u32(regs, 86, 87), 0.1, 0, MAX_POWER_W),
        1,
    )
    # community map: grid L1 voltage 73, 0.1 V; AC frequency 79, 0.01 Hz
    _set(device, "voltage_grid", _scaled(_word(regs, 73), 0.1, 180, 280))
    _set(device, "frequency_grid", _scaled(_word(regs, 79), 0.01, 45, 65), 2)
    # community map: radiator temperature 90, factor 0.01 °C on this family
    _set(device, "temperature_inverter", _scaled(_word(regs, 90), 0.01, 0, 120))
    # PV power and DC total power are marked computed. No grid-power register.
    return {device.serial: device}


def _build_three_phase(regs: dict[int, int]) -> dict[str, DeyeDevice]:
    ident = identity(regs)
    if ident is None:
        return {}
    device = DeyeDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    scale = _power_scale(regs)
    high_voltage = _high_voltage(regs)
    solar = 0.0
    solar_seen = False
    for index, (power_reg, voltage_reg, current_reg) in enumerate(
        MPPT_REGISTERS[: mppt_count(regs)], start=1
    ):
        power_raw = _word(regs, power_reg)
        power = None if power_raw is None else power_raw * scale
        power = _between(power, 0, MAX_MPPT_W)
        voltage = _between(
            None if _word(regs, voltage_reg) is None else _word(regs, voltage_reg) / 10,
            0,
            MAX_PV_V,
        )
        current = _between(
            None if _word(regs, current_reg) is None else _word(regs, current_reg) / 10,
            0,
            MAX_PV_A,
        )
        _set(device, indexed_role("power_solar_mppt", index), power, 0)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current)
        if power is not None:
            solar += power
            solar_seen = True
    if solar_seen:
        _set(device, "power_solar", _between(solar, 0, MAX_POWER_W), 0)
        device.derived.add("power_solar")

    rated = _u32(regs, 20, 21)
    rated_w = None if rated is None else rated / 10
    rated_w = _between(rated_w, 100, MAX_POWER_W)
    if rated_w is not None:
        device.vendor["rated_power"] = round(rated_w)
    state = _word(regs, 500)
    if state is not None and 0 <= state <= 5:
        device.vendor["running_state"] = state

    grid = _s32(regs, 625, 690)
    grid = _between(grid, -MAX_POWER_W, MAX_POWER_W)
    if grid is not None:
        # community map: 625 positive = import
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0, grid), 0)
        _set(device, "power_grid_export", max(0, -grid), 0)
    house = _s32(regs, 653, 659)
    _set(device, "power_house", _between(house, -MAX_POWER_W, MAX_POWER_W), 0)
    output = _s32(regs, 636, 694)
    _set(
        device,
        "power_inverter_ac_output",
        _between(output, -MAX_POWER_W, MAX_POWER_W),
        0,
    )
    _set(
        device,
        "voltage_grid",
        _between(None if _word(regs, 598) is None else _word(regs, 598) / 10, 180, 280),
    )
    _set(
        device,
        "frequency_grid",
        _between(None if _word(regs, 638) is None else _word(regs, 638) / 100, 45, 65),
        2,
    )
    _set(
        device,
        "temperature_inverter",
        _between(None if _word(regs, 541) is None else _word(regs, 541) / 10, 0, 120),
    )

    battery_raw = _s16(regs, 590)
    if battery_raw is not None:
        # 590 positive = battery output = discharge
        battery = _between(-battery_raw * scale, -MAX_BATTERY_W, MAX_BATTERY_W)
        if battery is not None:
            _set(device, "power_battery", battery, 0)
            _set(device, "power_battery_charge", max(0, battery), 0)
            _set(device, "power_battery_discharge", max(0, -battery), 0)
    soc = _word(regs, 588)
    if soc is None or not 0 <= soc <= 100:
        soc = _word(regs, 589)
    if soc is not None and 0 <= soc <= 100:
        _set(device, "battery_soc", soc, 0)
    soh = _word(regs, 10006)
    if soh is not None and 0 < soh <= 100:
        _set(device, "battery_soh", soh, 0)
    _set(
        device,
        "temperature_battery",
        _between(None if _word(regs, 586) is None else _word(regs, 586) / 10, 0, 70),
    )
    volts = _word(regs, 587)
    if volts is not None:
        voltage = volts / (10 if high_voltage else 100)
        low, high = (80, 900) if high_voltage else (20, 80)
        voltage = _between(voltage, low, high)
        if voltage is not None:
            device.vendor["battery_voltage"] = round(voltage, 2)

    _set(device, "energy_solar_today", _energy(regs, 529, None, MAX_ENERGY_TODAY))
    _set(
        device,
        "energy_battery_charge_today",
        _energy(regs, 514, None, MAX_ENERGY_TODAY),
    )
    _set(
        device,
        "energy_battery_discharge_today",
        _energy(regs, 515, None, MAX_ENERGY_TODAY),
    )
    _set(device, "energy_grid_import_today", _energy(regs, 520, None, MAX_ENERGY_TODAY))
    _set(device, "energy_grid_export_today", _energy(regs, 521, None, MAX_ENERGY_TODAY))
    _set(device, "energy_house_today", _energy(regs, 526, None, MAX_ENERGY_TODAY))
    _set(
        device, "energy_battery_charge_total", _energy(regs, 516, 517, MAX_ENERGY_TOTAL)
    )
    _set(
        device,
        "energy_battery_discharge_total",
        _energy(regs, 518, 519, MAX_ENERGY_TOTAL),
    )
    _set(device, "energy_grid_import_total", _energy(regs, 522, 523, MAX_ENERGY_TOTAL))
    _set(device, "energy_grid_export_total", _energy(regs, 524, 525, MAX_ENERGY_TOTAL))
    _set(device, "energy_house_total", _energy(regs, 527, 528, MAX_ENERGY_TOTAL))

    ac_today = _s16(regs, 501)
    if ac_today is not None:
        ac_today_kwh = _between(ac_today / 10, -MAX_ENERGY_TODAY, MAX_ENERGY_TODAY)
        if ac_today_kwh is not None:
            device.vendor["ac_energy_today"] = round(ac_today_kwh, 1)
    ac_total = _energy(regs, 504, 505, MAX_ENERGY_TOTAL)
    if ac_total is not None:
        device.vendor["ac_energy_total"] = round(ac_total, 1)
    return {device.serial: device}


def build_devices(regs: dict[int, int]) -> dict[str, DeyeDevice]:
    """Parse a register map into the inverter device. Never raises. @zara"""
    try:
        return _build(regs)
    except Exception:
        return {}
