# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Map an existing Home Assistant heat-pump integration onto S-INV HP. @zara

No network and no Home Assistant imports. The coordinator reads states; this
module checks the selection and converts values into contract units. A missing
or incompatible source stays missing and is never stored as 0.

One of ``hp_power_electric`` or ``hp_energy_electric_total`` is required.
Power is the live value the forecast stack reads. The electric total is the
fallback: the aggregate still derives today's electric energy from it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Any

from ..contract import HP_OPERATING_MODES, HP_SPEC_BY_BASE, is_hp_role

VENDOR = "hp_bridge"
NAME = "Heat pump"
CONNECTION = "ha_bridge"
CONF_SOURCES = "hp_sources"
OWN_PLATFORM = "solar_forecast_sinv"
# Electric power or the electric total. Either one makes the device a heat pump.
REQUIRED_ANY = ("hp_power_electric", "hp_energy_electric_total")

_POWER = {"w": 1.0, "kw": 1000.0, "mw": 1_000_000.0}
_ENERGY = {"wh": 0.001, "kwh": 1.0, "mwh": 1000.0}
_HOURS = {
    "h": 1.0,
    "hr": 1.0,
    "hrs": 1.0,
    "hour": 1.0,
    "hours": 1.0,
    "min": 1.0 / 60.0,
    "mins": 1.0 / 60.0,
    "minute": 1.0 / 60.0,
    "minutes": 1.0 / 60.0,
}
_FLOW = {"l/h": 1.0, "l/hr": 1.0, "m³/h": 1000.0, "m3/h": 1000.0, "m³/hr": 1000.0}
_TEMP_C = {"°c", "c", "degc", "celsius"}
_TEMP_F = {"°f", "f", "degf", "fahrenheit"}
_TEMP_K = {"k", "kelvin"}
_BINARY_ROLES = frozenset({"hp_compressor_running", "hp_aux_heater_active"})
_MODE_WORDS = (
    ("pool heating", "pool"),
    ("schwimmbad", "pool"),
    ("piscine", "pool"),
    ("hot water", "dhw"),
    ("warmwasser", "dhw"),
    ("eau chaude", "dhw"),
    ("defrost", "defrost"),
    ("abtau", "defrost"),
    ("dégivrage", "defrost"),
    ("degivrage", "defrost"),
    ("cooling", "cooling"),
    ("kühlen", "cooling"),
    ("kuehlen", "cooling"),
    ("refroidissement", "cooling"),
    ("heating", "heating"),
    ("heizen", "heating"),
    ("heizung", "heating"),
    ("chauffage", "heating"),
    ("dhw", "dhw"),
    ("ecs", "dhw"),
    ("pool", "pool"),
    ("froid", "cooling"),
    ("cool", "cooling"),
    ("heat", "heating"),
    ("off", "off"),
    ("aus", "off"),
    ("arrêt", "off"),
    ("arret", "off"),
)


@dataclass(frozen=True)
class Source:
    """What the flow knows about one chosen entity. @zara"""

    entity_id: str
    domain: str
    platform: str
    unit: str | None = None
    device_class: str | None = None
    state_class: str | None = None


@dataclass
class BridgeDevice:
    """One bridged heat pump. ``roles`` holds only present values. @zara"""

    serial: str
    name: str
    manufacturer: str
    model: str
    kind: str
    roles: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)
    source: str = ""


def quantity(role: str) -> str:
    """Contract family used to check units. @zara"""
    if role in _BINARY_ROLES:
        return "binary"
    if role == "hp_operating_mode":
        return "mode"
    if role in {"hp_cop_live", "hp_cop_total"}:
        return "factor"
    if role.startswith("hp_temperature_"):
        return "temperature"
    if role.startswith("hp_runtime_"):
        return "duration"
    if role == "hp_volume_flow":
        return "flow"
    if "power" in role:
        return "power"
    if "energy" in role:
        return "energy"
    return "count"


def selection_errors(chosen: dict[str, Source]) -> dict[str, str]:
    """Return a field error for every rejected source. @zara"""
    errors: dict[str, str] = {}
    seen: dict[str, str] = {}
    for role, source in chosen.items():
        if not is_hp_role(role):
            errors[role] = "hp_bridge_role"
            continue
        if source.entity_id in seen.values():
            errors[role] = "hp_bridge_duplicate"
            continue
        seen[role] = source.entity_id
        error = _source_error(role, source)
        if error:
            errors[role] = error
    present = set(chosen) - set(errors)
    if not errors and not any(role in present for role in REQUIRED_ANY):
        errors["base"] = "hp_bridge_required"
    return errors


def convert(role: str, raw: Any, unit: str | None) -> Any:
    """Convert one live value into the contract unit, or return None. @zara"""
    if raw is None or not is_hp_role(role):
        return None
    if isinstance(raw, str) and raw.strip().lower() in {
        "",
        "unavailable",
        "unknown",
        "none",
    }:
        return None
    kind = quantity(role)
    if kind == "mode":
        return map_mode(raw)
    if kind == "binary":
        return map_binary(raw)
    try:
        number = float(raw)
    except (TypeError, ValueError):
        return None
    if isinstance(raw, bool) or not math.isfinite(number):
        return None
    converted = _scale(kind, number, unit)
    if converted is None or not _plausible(kind, converted):
        return None
    return converted


def map_mode(raw: Any) -> str | None:
    """Map free text onto the contract modes. Unknown words stay ``unknown``. @zara"""
    if not isinstance(raw, str):
        return None
    text = raw.strip().lower()
    if text in {"", "unavailable", "unknown", "none"}:
        return None
    for word, state in _MODE_WORDS:
        if word in text and state in HP_OPERATING_MODES:
            return state
    return "unknown"


def map_binary(raw: Any) -> bool | None:
    """Read on/off from a binary state or from on/off text. @zara"""
    if isinstance(raw, bool):
        return raw
    if not isinstance(raw, str):
        return None
    text = raw.strip().lower()
    if text == "on":
        return True
    if text == "off":
        return False
    return None


def _source_error(role: str, source: Source) -> str | None:
    spec = HP_SPEC_BY_BASE[role]
    domains = spec.domains
    if quantity(role) == "binary":
        domains = ("binary_sensor", "sensor")
    if source.domain not in domains:
        return "hp_bridge_domain"
    if source.platform == OWN_PLATFORM:
        return "hp_bridge_own"
    if role.endswith("_total") and source.state_class not in {
        "total",
        "total_increasing",
    }:
        return "hp_bridge_state_class"
    if source.device_class and not _class_ok(role, source.device_class):
        return "hp_bridge_class"
    if not _unit_ok(role, source.unit):
        return "hp_bridge_unit"
    return None


def _class_ok(role: str, device_class: str) -> bool:
    kind = quantity(role)
    expected = {
        "power": "power",
        "energy": "energy",
        "temperature": "temperature",
        "duration": "duration",
        "mode": "enum",
        "binary": "",
    }.get(kind)
    if kind == "binary":
        return True
    if expected is None:
        return True
    return device_class == expected


def unit_ok(role: str, unit: str | None) -> bool:
    """Return True when the unit converts into the contract unit. @zara"""
    return _unit_ok(role, unit)


def _unit_ok(role: str, unit: str | None) -> bool:
    kind = quantity(role)
    text = _norm_unit(unit)
    if kind in {"binary", "mode", "count", "factor"}:
        return text == ""
    if kind == "power":
        return text in _POWER
    if kind == "energy":
        return text in _ENERGY
    if kind == "duration":
        return text in _HOURS
    if kind == "flow":
        return text in _FLOW
    if kind == "temperature":
        return text in _TEMP_C | _TEMP_F | _TEMP_K
    return False


def _scale(kind: str, number: float, unit: str | None) -> float | None:
    text = _norm_unit(unit)
    if kind == "power" and text in _POWER:
        return number * _POWER[text]
    if kind == "energy" and text in _ENERGY:
        return number * _ENERGY[text]
    if kind == "duration" and text in _HOURS:
        return number * _HOURS[text]
    if kind == "flow" and text in _FLOW:
        return number * _FLOW[text]
    if kind == "temperature":
        if text in _TEMP_C:
            return number
        if text in _TEMP_F:
            return (number - 32.0) * 5.0 / 9.0
        if text in _TEMP_K:
            return number - 273.15
    if kind in {"count", "factor"} and text == "":
        return number
    return None


def _plausible(kind: str, number: float) -> bool:
    if kind == "temperature":
        return -40.0 <= number <= 120.0
    if kind == "power":
        return 0.0 <= number <= 1_000_000.0
    if kind == "energy":
        return 0.0 <= number <= 10_000_000.0
    if kind == "flow":
        return 0.0 <= number <= 100_000.0
    if kind == "duration":
        return 0.0 <= number <= 1_000_000.0
    if kind == "count":
        return 0.0 <= number <= 10_000_000.0
    if kind == "factor":
        return 0.0 <= number <= 20.0
    return True


def _norm_unit(unit: str | None) -> str:
    if unit is None:
        return ""
    return str(unit).strip().lower().replace(" ", "").replace("º", "°")
