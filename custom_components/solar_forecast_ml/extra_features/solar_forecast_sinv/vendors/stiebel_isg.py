# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Parse one Stiebel Eltron ISG Modbus image into S-INV HP roles. @zara

No Home Assistant imports and no sockets. The coordinator reads input
registers; this module only scales them. Table addresses are 1-based, so
the PDU address is the table address minus one: register 30501 is table
address 501 and PDU 500, function 04. 32768 means the object is absent.
There is no live electric-power register, so ``hp_power_electric`` is
never published.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

VENDOR = "stiebel_isg"
NAME = "Stiebel Eltron"
CONNECTION = "local_modbus_stiebel"
# WPM energy totals move slowly, and a second integration may share the ISG.
# 60 s is the steady poll. 30 s still fits three short reads and leaves the
# gateway idle before the next cycle.
DEFAULT_SCAN_SECONDS = 60
MIN_SCAN_SECONDS = 30
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
REQUEST_GAP_SECONDS = 0.2
# Table addresses are 1-based. The PDU address is the table address minus 1.
WIRE_OFFSET = 1
ABSENT = 32768

# One plant device. Per-WP blocks exist, but the aggregate would add them
# on top of these "all heat pumps" sums.
TEMP_BLOCK = (507, 30)  # 507..536
STATUS_BLOCK = (2501, 3)  # 2501..2503
ENERGY_BLOCK = (3501, 16)  # 3501..3516, each kWh/MWh pair in this read
PROBE_BLOCK = (507, 1)
READ_BLOCKS = (TEMP_BLOCK, STATUS_BLOCK, ENERGY_BLOCK)

REG_OUTDOOR = 507
REG_FLOW = 513
REG_RETURN = 516
REG_BUFFER = 518
REG_VOLUME = 521
REG_DHW = 522
REG_SOURCE = 536
REG_STATUS = 2501
REG_STATUS_WP = 2503
REG_HEAT_DAY = 3501
REG_HEAT_KWH = 3502
REG_HEAT_MWH = 3503
REG_DHW_DAY = 3504
REG_DHW_KWH = 3505
REG_DHW_MWH = 3506
REG_EL_HEAT_DAY = 3511
REG_EL_HEAT_KWH = 3512
REG_EL_HEAT_MWH = 3513
REG_EL_DHW_DAY = 3514
REG_EL_DHW_KWH = 3515
REG_EL_DHW_MWH = 3516

_KWH_MAX = 999
_MWH_MAX = 65535
_DAY_MAX = 65535
_FLOW_MAX_LPH = 100_000.0


@dataclass
class StiebelDevice:
    """One ISG plant. ``roles`` holds only present values. @zara"""

    serial: str
    name: str
    manufacturer: str
    model: str
    kind: str
    roles: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)
    source: str = ""


def build_device(
    registers: dict[int, int],
    *,
    serial: str,
    previous: dict[str, float] | None = None,
) -> StiebelDevice:
    """Map one register image. A backward total is left out. @zara"""
    previous = previous or {}
    roles: dict[str, Any] = {}
    _put(roles, "hp_temperature_outdoor", _temp(registers.get(REG_OUTDOOR), -60, 80))
    _put(roles, "hp_temperature_flow", _temp(registers.get(REG_FLOW), -40, 120))
    _put(roles, "hp_temperature_return", _temp(registers.get(REG_RETURN), 0, 90))
    _put(roles, "hp_temperature_dhw", _temp(registers.get(REG_DHW), 10, 65))
    _put(roles, "hp_temperature_storage", _temp(registers.get(REG_BUFFER), 0, 90))
    _put(roles, "hp_temperature_source", _temp(registers.get(REG_SOURCE), -40, 120))
    _put(roles, "hp_volume_flow", _volume(registers.get(REG_VOLUME)))
    _put(roles, "hp_compressor_running", _compressor(registers))
    _put(roles, "hp_aux_heater_active", _aux(registers))
    _put(roles, "hp_operating_mode", _mode(registers.get(REG_STATUS)))
    heat_total = _accept(
        "hp_energy_thermal_heating_total",
        _total(registers.get(REG_HEAT_KWH), registers.get(REG_HEAT_MWH)),
        previous,
    )
    dhw_total = _accept(
        "hp_energy_thermal_dhw_total",
        _total(registers.get(REG_DHW_KWH), registers.get(REG_DHW_MWH)),
        previous,
    )
    el_heat = _accept(
        "hp_energy_electric_heating_total",
        _total(registers.get(REG_EL_HEAT_KWH), registers.get(REG_EL_HEAT_MWH)),
        previous,
    )
    el_dhw = _accept(
        "hp_energy_electric_dhw_total",
        _total(registers.get(REG_EL_DHW_KWH), registers.get(REG_EL_DHW_MWH)),
        previous,
    )
    heat_today = _day(registers.get(REG_HEAT_DAY))
    dhw_today = _day(registers.get(REG_DHW_DAY))
    el_heat_today = _day(registers.get(REG_EL_HEAT_DAY))
    el_dhw_today = _day(registers.get(REG_EL_DHW_DAY))
    _put(roles, "hp_energy_thermal_heating_total", heat_total)
    _put(roles, "hp_energy_thermal_dhw_total", dhw_total)
    _put(roles, "hp_energy_thermal_total", _both(heat_total, dhw_total))
    _put(roles, "hp_energy_thermal_heating_today", heat_today)
    _put(roles, "hp_energy_thermal_dhw_today", dhw_today)
    _put(roles, "hp_energy_thermal_today", _both(heat_today, dhw_today))
    _put(roles, "hp_energy_electric_heating_total", el_heat)
    _put(roles, "hp_energy_electric_dhw_total", el_dhw)
    _put(roles, "hp_energy_electric_total", _both(el_heat, el_dhw))
    _put(roles, "hp_energy_electric_heating_today", el_heat_today)
    _put(roles, "hp_energy_electric_dhw_today", el_dhw_today)
    _put(roles, "hp_energy_electric_today", _both(el_heat_today, el_dhw_today))
    return StiebelDevice(
        serial=serial,
        name="Heat pump",
        manufacturer="Stiebel Eltron",
        model="ISG",
        kind="heat_pump",
        roles=roles,
    )


def _put(roles: dict[str, Any], role: str, value: Any) -> None:
    if value is not None:
        roles[role] = value


def _present(raw: int | None) -> int | None:
    if raw is None or raw == ABSENT:
        return None
    if not isinstance(raw, int) or isinstance(raw, bool):
        return None
    if not 0 <= raw <= 0xFFFF:
        return None
    return raw


def _temp(raw: int | None, low: float, high: float) -> float | None:
    """Scale a type-2 register (raw x 0.1). 32768 stays absent. @zara"""
    number = _present(raw)
    if number is None:
        return None
    signed = number - 0x10000 if number >= 0x8000 else number
    value = signed * 0.1
    if value < low or value > high:
        return None
    return value


def _volume(raw: int | None) -> float | None:
    """Convert l/min to L/h. @zara"""
    flow = _temp(raw, 0, _FLOW_MAX_LPH)
    if flow is None:
        return None
    per_hour = flow * 60.0
    if per_hour > _FLOW_MAX_LPH:
        return None
    return per_hour


def _day(raw: int | None) -> float | None:
    """Return a day counter. Exactly 32768 is the absent marker. @zara"""
    number = _present(raw)
    if number is None or number > _DAY_MAX:
        return None
    return float(number)


def _total(kwh: int | None, mwh: int | None) -> float | None:
    """Compose MWh x 1000 + kWh. Either absent marker drops the total. @zara"""
    low = _present(kwh)
    high = _present(mwh)
    if low is None or high is None:
        return None
    if low > _KWH_MAX or high > _MWH_MAX:
        return None
    return float(high * 1000 + low)


def _accept(role: str, value: float | None, previous: dict[str, float]) -> float | None:
    """Drop a total that moved backwards since the last accepted read. @zara"""
    if value is None:
        return None
    old = previous.get(role)
    if old is not None and value < old:
        return None
    return value


def _both(left: float | None, right: float | None) -> float | None:
    """Sum two parts. A missing part is not treated as zero. @zara"""
    if left is None or right is None:
        return None
    return left + right


def _bits(raw: int | None, positions: tuple[int, ...]) -> bool | None:
    number = _present(raw)
    if number is None:
        return None
    return any(number & (1 << bit) for bit in positions)


def _any_present(flags: list[bool | None]) -> bool | None:
    if any(flag is True for flag in flags):
        return True
    if any(flag is False for flag in flags):
        return False
    return None


def _compressor(registers: dict[int, int]) -> bool | None:
    """Return True when any documented compressor bit is set. @zara"""
    return _any_present(
        [
            _bits(registers.get(REG_STATUS), (6,)),
            _bits(registers.get(REG_STATUS_WP), (0, 1, 2, 3, 4, 5)),
        ]
    )


def _aux(registers: dict[int, int]) -> bool | None:
    """Return True when a documented NHZ bit is set. @zara"""
    return _any_present(
        [
            _bits(registers.get(REG_STATUS), (3,)),
            _bits(registers.get(REG_STATUS_WP), (12, 13)),
        ]
    )


def _mode(raw: int | None) -> str | None:
    """Map the plant status word. Defrost wins, then cooling, hot water, heating. @zara"""
    number = _present(raw)
    if number is None:
        return None
    if number & (1 << 9):
        return "defrost"
    if number & (1 << 8):
        return "cooling"
    if number & (1 << 5):
        return "dhw"
    if number & (1 << 4):
        return "heating"
    return "off"
