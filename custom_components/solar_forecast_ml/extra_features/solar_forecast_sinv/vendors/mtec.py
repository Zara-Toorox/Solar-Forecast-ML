# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Parse one M-TEC heat-pump controller Modbus image into S-INV HP roles. @zara

No Home Assistant imports and no sockets. Source: M-TEC "Modbus Interface
Variables" version 20220112 (``.agents/evidence/vendor_docs/mtec/``). The
controller answers Modbus TCP on port 502, unit 1, function 03 (holding
registers) only. Addresses start at 0 and are used as they are. A read across an
unconfigured address fails with exception 2, so every block covers configured
addresses only.

The controller multiplies each value by the listed factor and cuts it to an
integer (no rounding). Temperatures carry factor 10 and are signed. The energy
totals exist twice per heat pump: as kWh (factor 1, one 16-bit register) and as
MWh (factor 0.001, cut to whole MWh). The MWh register selects the 1000 kWh
window, which also restores a kWh register that wrapped at 65536.

Heat pump 1 (``heatpump[0]``) only. A cascade publishes its first unit.
The thermal power register is whole kW and is not published: a live COP from
it would be off by up to one kW.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

VENDOR = "mtec"
NAME = "M-TEC"
CONNECTION = "local_modbus_mtec"
DEFAULT_SCAN_SECONDS = 60
MIN_SCAN_SECONDS = 30
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
REQUEST_GAP_SECONDS = 0.2

# (start, count); every address inside a block is configured in the variable list
HEAT_PUMP_BLOCK = (700, 20)  # 700..719 heatpump[0]
OUTDOOR_BLOCK = (1501, 2)  # message id, value
READ_BLOCKS = (HEAT_PUMP_BLOCK, OUTDOOR_BLOCK)
# Parts the installation may not have configured; exception 2 drops the block
ROOM_BLOCK = (0, 3)  # heatCircuit[0]: room message id, room value, set value
DHW_BLOCK = (400, 2)  # hotWaterTank[0]: top message id, top value
BUFFER_BLOCK = (600, 2)  # bufferTank[0]: top message id, top value
OPTIONAL_BLOCKS = (ROOM_BLOCK, DHW_BLOCK, BUFFER_BLOCK)
PROBE_BLOCK = (703, 1)

REG_RUNTIME = 700
REG_THERMAL_KWH = 701
REG_ELECTRIC_KWH = 702
REG_STATE = 703
REG_FLOW_MSG = 704
REG_FLOW = 705
REG_POWER_ELECTRIC = 707
REG_SOURCE_IN = 708
REG_RETURN = 710
REG_THERMAL_MWH = 715
REG_ELECTRIC_MWH = 716
REG_OUTDOOR_MSG = 1501
REG_OUTDOOR = 1502
REG_ROOM_MSG = 0
REG_ROOM = 1
REG_ROOM_SET = 2
REG_DHW_MSG = 400
REG_DHW = 401
REG_BUFFER_MSG = 600
REG_BUFFER = 601

# heatpumpState 703: 0 standby, 1 pre-run, 2 heat, 3 defrost, 4 cool,
# 5 post-run, 7 safety shutdown, 8 error
_STATES = {0: "off", 1: "off", 2: "heating", 3: "defrost", 4: "cooling", 5: "off"}
_COMPRESSOR_STATES = frozenset({2, 3, 4})
_POWER_MAX_W = 50_000
_WRAP = 0x10000


@dataclass
class MtecDevice:
    """One M-TEC heat pump. ``roles`` holds only present values. @zara"""

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
) -> MtecDevice:
    """Map one register image. A backward total is left out. @zara"""
    previous = previous or {}
    roles: dict[str, Any] = {}
    outdoor = _sensor(registers, REG_OUTDOOR_MSG, REG_OUTDOOR, -60, 80)
    _put(roles, "hp_temperature_outdoor", outdoor)
    flow = _sensor(registers, REG_FLOW_MSG, REG_FLOW, -40, 120)
    _put(roles, "hp_temperature_flow", flow)
    _put(roles, "hp_temperature_return", _temp(registers.get(REG_RETURN), 0, 90))
    source = _temp(registers.get(REG_SOURCE_IN), -40, 120)
    _put(roles, "hp_temperature_source", source)
    dhw = _sensor(registers, REG_DHW_MSG, REG_DHW, 10, 90)
    _put(roles, "hp_temperature_dhw", dhw)
    buffer = _sensor(registers, REG_BUFFER_MSG, REG_BUFFER, 0, 90)
    _put(roles, "hp_temperature_storage", buffer)
    room = _sensor(registers, REG_ROOM_MSG, REG_ROOM, 0, 40)
    _put(roles, "hp_temperature_indoor", room)
    if room is not None:  # the set value belongs to a circuit with a room sensor
        _put(roles, "hp_temperature_target", _temp(registers.get(REG_ROOM_SET), 5, 35))
    _put(roles, "hp_power_electric", _power(registers.get(REG_POWER_ELECTRIC)))
    state = registers.get(REG_STATE)
    if state is not None:
        roles["hp_operating_mode"] = _STATES.get(state, "unknown")
        roles["hp_compressor_running"] = state in _COMPRESSOR_STATES
    _put(
        roles,
        "hp_energy_thermal_total",
        _accept(
            "hp_energy_thermal_total",
            _total(registers.get(REG_THERMAL_KWH), registers.get(REG_THERMAL_MWH)),
            previous,
        ),
    )
    _put(
        roles,
        "hp_energy_electric_total",
        _accept(
            "hp_energy_electric_total",
            _total(registers.get(REG_ELECTRIC_KWH), registers.get(REG_ELECTRIC_MWH)),
            previous,
        ),
    )
    runtime = registers.get(REG_RUNTIME)
    _put(
        roles,
        "hp_runtime_total",
        _accept(
            "hp_runtime_total", None if runtime is None else float(runtime), previous
        ),
    )
    return MtecDevice(
        serial=serial,
        name="Heat pump",
        manufacturer=NAME,
        model="Modbus",
        kind="heat_pump",
        roles=roles,
    )


def _put(roles: dict[str, Any], role: str, value: Any) -> None:
    if value is not None:
        roles[role] = value


def _temp(raw: int | None, low: float, high: float) -> float | None:
    """Signed word times 0.1, dropped outside the plausible range. @zara"""
    if raw is None or not 0 <= raw <= 0xFFFF:
        return None
    signed = raw - _WRAP if raw >= 0x8000 else raw
    value = round(signed * 0.1, 1)
    if value < low or value > high:
        return None
    return value


def _sensor(
    registers: dict[int, int], msg: int, address: int, low: float, high: float
) -> float | None:
    """A value whose message id is not 0 reports a sensor fault and is absent. @zara"""
    if registers.get(msg) != 0:
        return None
    return _temp(registers.get(address), low, high)


def _power(raw: int | None) -> float | None:
    if raw is None or raw > _POWER_MAX_W:
        return None
    return float(raw)


def _total(kwh: int | None, mwh: int | None) -> float | None:
    """kWh inside the window of the whole-MWh register; a 16-bit wrap is undone. @zara"""
    if kwh is None or mwh is None:
        return None
    low = mwh * 1000
    value = kwh
    if value < low:
        value += -(-(low - value) // _WRAP) * _WRAP
    if not low <= value < low + 1000:
        return None
    return float(value)


def _accept(role: str, value: float | None, previous: dict[str, float]) -> float | None:
    """Drop a total that moved backwards since the last accepted read. @zara"""
    if value is None:
        return None
    old = previous.get(role)
    if old is not None and value < old:
        return None
    return value
