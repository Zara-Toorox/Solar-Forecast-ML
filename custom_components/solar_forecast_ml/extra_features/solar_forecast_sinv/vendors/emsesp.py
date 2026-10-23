# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Bosch/Buderus heat pumps via EMS-ESP, read only. @zara

Maps the short JSON of ``/api/boiler/values``, ``/api/thermostat/values`` and
``/api/heatpump/values`` onto S-INV HP roles. No Home Assistant imports and no
network access. The coordinator fetches; this module only parses.

EMS-ESP publishes booleans as words. With the gateway set to German those
words are ``an`` and ``aus``, not ``on`` and ``off``. ``hpactivity`` uses the
same locale. ``-1`` means a flow sensor is not installed. Nested objects
``dhw`` and ``hcN`` carry hot water and one heating circuit. A missing or
unrecognized value stays missing.

``metercomp`` and ``metereheat`` are the compressor and electric-heater parts
of ``metertotal`` (tester 2026-10-23: 4076.02 + 234.53 = 4310.55, next to
``metertotal`` 4310.56). They are not heating and hot-water roles.
``meterheat`` and ``dhw.meter`` are the electrical heating and hot-water
meters. ``nrgheat`` and ``dhw.nrg`` are thermal.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
import re
from typing import Any

VENDOR = "emsesp"
NAME = "Bosch/Buderus"
CONNECTION = "local_emsesp"
# EMS-ESP runs on an ESP32 that shares the EMS bus. A poll is three GETs with
# a 1 s gap between them (coordinator). Two gaps plus the reads stay inside
# 15 s, and the bus is idle before the next cycle.
MIN_SCAN_SECONDS = 15
DEFAULT_SCAN_SECONDS = 30

CONF_CIRCUIT = "heating_circuit"
CONF_CIRCUITS = "heating_circuits"
CONF_HPPOWER_UNIT = "hppower_unit"
CIRCUIT_NONE = "none"

# Values outside these bounds are sensor errors, not a heat pump.
_TEMP_MIN = -40.0
_TEMP_MAX = 120.0
_POWER_MAX_W = 100_000.0
_ENERGY_MAX_KWH = 10_000_000.0
_FLOW_MAX_LPH = 100_000.0
_STARTS_MAX = 10_000_000.0
_RUNTIME_MAX_MIN = 100_000_000.0

_HC = re.compile(r"^hc([1-9]|[1-9][0-9])$")

# Locale words below are facts from EMS-ESP locale_translations.h (LGPL-3.0,
# emsesp/EMS-ESP), language order en, de, nl, sv, pl, no, fr, tr, it, sk, cs.
# on/off 155-158, heating 228, cooling 229, hot_water 255, pool 256,
# pool_heating 257, defrost 310. enum_hpactivity is locale_common.h:396.
# compressor_alarm (line 267) is not a contract state, so it stays unknown.


def _token(value: str) -> str:
    return " ".join(value.casefold().split())


def _wordset(*words: str) -> frozenset[str]:
    return frozenset(_token(word) for word in words)


# on/off rows, plus the EMS-ESP "boolean format" values true/false and 1/0.
_ON = _wordset("on", "an", "aan", "på", "włączono", "açık", "zap", "wł.", "true", "1")
_OFF = _wordset(
    "off", "aus", "uit", "av", "wyłączono", "kapalı", "vyp", "wył.", "false", "0"
)
_ACTIVITY = {
    **dict.fromkeys(
        _wordset("off", "aus", "uit", "av", "wyłączono", "kapalı", "vyp", "wył."),
        "off",
    ),
    **dict.fromkeys(
        _wordset(
            "heating",
            "heizen",
            "verwarmen",
            "uppvärmning",
            "ogrzewanie",
            "oppvarming",
            "chauffage",
            "ısıtma",
            "riscaldamento",
            "kúrenie",
            "topení",
        ),
        "heating",
    ),
    **dict.fromkeys(
        _wordset(
            "cooling",
            "kühlen",
            "koelen",
            "kyler",
            "chłodzenie",
            "kjøling",
            "refroidissement",
            "soğuma",
            "raffreddamento",
            "chladenie",
            "chlazení",
        ),
        "cooling",
    ),
    **dict.fromkeys(
        _wordset(
            "hot water",
            "warmwasser",
            "warm water",
            "varmvatten",
            "c.w.u.",
            "varmtvann",
            "eau chaude",
            "sıcak su",
            "acqua calda",
            "horúca voda",
            "horká voda",
            "dhw",
        ),
        "dhw",
    ),
    **dict.fromkeys(
        _wordset(
            "pool heating",
            "pool beheizen",
            "zwembadverwarming",
            "uppvärmning av pool",
            "ogrzewanie basenu",
            "bassengoppvarming",
            "chauffage piscine",
            "havuz ısıtma",
            "riscaldamento piscina",
            "ohrev bazéna",
            "ohřev bazénu",
        ),
        "pool",
    ),
    **dict.fromkeys(
        _wordset(
            "pool",
            "zwembad",
            "basen",
            "basseng",
            "piscine",
            "havuz",
            "piscina",
            "bazén",
        ),
        "pool",
    ),
    **dict.fromkeys(
        _wordset(
            "defrost",
            "abtauen",
            "ontdooien",
            "avfrostning",
            "odladzanie",
            "tine",
            "dégivrage",
            "buz çözücü",
            "scongelamento",
            "odmrazenie",
            "odmrazování",
        ),
        "defrost",
    ),
}
# An aux status is active only for a contract mode that is not off.
_AUX_ACTIVE = frozenset({"heating", "cooling", "dhw", "pool", "defrost"})


@dataclass
class EmsespDevice:
    """One heat pump after parsing. ``roles`` holds only present values. @zara"""

    serial: str
    name: str
    manufacturer: str
    model: str
    kind: str
    roles: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)
    source: str = ""


def heating_circuits(thermostat: Any) -> list[str]:
    """Return hcN keys that are objects, in circuit order. @zara"""
    if not isinstance(thermostat, dict):
        return []
    names = [
        key
        for key, value in thermostat.items()
        if isinstance(key, str) and _HC.fullmatch(key) and isinstance(value, dict)
    ]
    return sorted(names, key=lambda name: int(name[2:]))


def unit_from_detail(detail: Any) -> str | None:
    """Read the hppower unit from the one-time entity read. @zara"""
    if not isinstance(detail, dict):
        return None
    for key in ("uom", "unit", "unit_of_measurement"):
        unit = _power_unit(detail.get(key))
        if unit is not None:
            return unit
    return None


def default_hppower_unit(boiler: Any, heatpump: Any) -> str | None:
    """Return the unit when the entity read has none. @zara

    The entity catalogue lists boiler ``hppower`` in kW and the heatpump
    device (CSH5800iG and the HP module) in W. A boiler value wins when both
    devices report the key, matching the boiler entity that was queried.
    """
    boiler_has = isinstance(boiler, dict) and "hppower" in boiler
    pump_has = isinstance(heatpump, dict) and "hppower" in heatpump
    if pump_has and not boiler_has:
        return "W"
    if boiler_has:
        return "kW"
    return None


def build_device(
    boiler: Any,
    thermostat: Any,
    heatpump: Any,
    *,
    serial: str,
    hppower_unit: str | None,
    circuit: str | None,
) -> EmsespDevice:
    """Parse one poll. Hostile shapes yield a device with no roles. @zara

    ``serial`` is the stable device id (from the config entry). It is not a
    host address and it is not read from the payload.
    """
    try:
        return _build(boiler, thermostat, heatpump, serial, hppower_unit, circuit)
    except (TypeError, ValueError, RecursionError, ArithmeticError):
        return _empty(serial)


def _empty(serial: str) -> EmsespDevice:
    return EmsespDevice(
        serial=serial,
        name=NAME,
        manufacturer="Bosch",
        model="EMS-ESP",
        kind="heat_pump",
    )


def _build(boiler, thermostat, heatpump, serial, hppower_unit, circuit):
    boiler = boiler if isinstance(boiler, dict) else {}
    heatpump = heatpump if isinstance(heatpump, dict) else {}
    thermostat = thermostat if isinstance(thermostat, dict) else {}
    values = dict(heatpump)
    values.update(boiler)
    roles: dict[str, Any] = {}
    _put(
        roles,
        "hp_power_electric",
        _quantity(values.get("hpcurrpower"), 0.0, _POWER_MAX_W),
    )
    _put(roles, "hp_power_thermal", _thermal_power(values.get("hppower"), hppower_unit))
    _put(roles, "hp_energy_electric_total", _kwh(values.get("metertotal")))
    _put(roles, "hp_energy_electric_heating_total", _kwh(values.get("meterheat")))
    _put(roles, "hp_energy_thermal_total", _kwh(values.get("nrgtotal")))
    _put(roles, "hp_energy_thermal_heating_total", _kwh(values.get("nrgheat")))
    dhw = values.get("dhw")
    if isinstance(dhw, dict):
        _put(roles, "hp_energy_electric_dhw_total", _kwh(dhw.get("meter")))
        _put(roles, "hp_energy_thermal_dhw_total", _kwh(dhw.get("nrg")))
        _put(roles, "hp_temperature_dhw", _temp(dhw.get("curtemp")))
        _put(roles, "hp_temperature_storage", _temp(dhw.get("storagetemp1")))
        _put(roles, "hp_runtime_dhw", _hours(dhw.get("uptimecomp")))
    _put(roles, "hp_temperature_outdoor", _temp(values.get("outdoortemp")))
    _put(roles, "hp_temperature_flow", _temp(values.get("curflowtemp")))
    _put(roles, "hp_temperature_return", _temp(values.get("rettemp")))
    source, source_temp = _source_temperature(values)
    _put(roles, "hp_temperature_source", source_temp)
    _put(roles, "hp_volume_flow", _flow(values.get("pc1flow")))
    _put(roles, "hp_operating_mode", _activity(values.get("hpactivity")))
    _put(roles, "hp_compressor_running", _on_off(values.get("hpcompon")))
    _put(roles, "hp_compressor_starts", _count(values.get("totalcompstarts")))
    _put(roles, "hp_runtime_total", _hours(values.get("uptimetotal")))
    _put(roles, "hp_runtime_heating", _hours(values.get("uptimecompheating")))
    _put(roles, "hp_aux_heater_active", _aux(values.get("auxheaterstatus")))
    _put(
        roles, "hp_aux_heater_energy_total", _kwh(values.get("auxelecheatnrgconstotal"))
    )
    _circuit(roles, thermostat, circuit)
    model = "EMS-ESP"
    if source == "air":
        model = "EMS-ESP air/water"
    elif source == "brine":
        model = "EMS-ESP brine/water"
    return EmsespDevice(
        serial=serial,
        name=NAME,
        manufacturer="Bosch",
        model=model,
        kind="heat_pump",
        roles=roles,
        source=source,
    )


def _circuit(roles: dict[str, Any], thermostat: dict, circuit: str | None) -> None:
    if not circuit or circuit == CIRCUIT_NONE:
        return
    block = thermostat.get(circuit)
    if not isinstance(block, dict):
        return
    _put(roles, "hp_temperature_indoor", _temp(block.get("currtemp")))
    _put(roles, "hp_temperature_target", _temp(block.get("seltemp")))


def _source_temperature(values: dict) -> tuple[str, float | None]:
    """Air inlet ``hptl2``, or brine ``hpbrinein``. @zara

    The 2026-10-23 air/water tester reports ``hpbrinein`` 0, meaning the
    brine sensor is not fitted. A non-zero plausible brine temperature is a
    ground-source machine. Exactly 0 is not published as 0 °C.
    """
    brine = _temp(values.get("hpbrinein"))
    air = _temp(values.get("hptl2"))
    if brine is not None and brine != 0.0:
        return "brine", brine
    if air is not None:
        return "air", air
    # Tester 2026-10-23: air/water reports hpbrinein 0 and may omit hptl2.
    if brine == 0.0:
        return "air", None
    return "", None


def _put(roles: dict[str, Any], role: str, value: Any) -> None:
    if value is not None:
        roles[role] = value


def _power_unit(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip().lower()
    if text == "kw":
        return "kW"
    if text == "w":
        return "W"
    return None


def _thermal_power(value: Any, unit: str | None) -> float | None:
    norm = _power_unit(unit)
    if norm == "kW":
        number = _quantity(value, 0.0, _POWER_MAX_W / 1000.0)
        if number is None:
            return None
        return number * 1000.0
    if norm == "W":
        return _quantity(value, 0.0, _POWER_MAX_W)
    return None


def _quantity(value: Any, low: float, high: float) -> float | None:
    if (
        isinstance(value, bool)
        or isinstance(value, str)
        or not isinstance(value, (int, float))
    ):
        return None
    number = float(value)
    if not math.isfinite(number) or number < low or number > high:
        return None
    return number


def _temp(value: Any) -> float | None:
    return _quantity(value, _TEMP_MIN, _TEMP_MAX)


def _kwh(value: Any) -> float | None:
    return _quantity(value, 0.0, _ENERGY_MAX_KWH)


def _flow(value: Any) -> float | None:
    """l/h. ``-1`` means the sensor is not installed. @zara"""
    number = _quantity(value, -1.0, _FLOW_MAX_LPH)
    if number is None or number < 0.0:
        return None
    return number


def _count(value: Any) -> float | None:
    number = _quantity(value, 0.0, _STARTS_MAX)
    if number is None:
        return None
    return float(int(number))


def _hours(value: Any) -> float | None:
    """EMS-ESP reports compressor runtime in minutes. @zara"""
    minutes = _quantity(value, 0.0, _RUNTIME_MAX_MIN)
    if minutes is None:
        return None
    return minutes / 60.0


def _on_off(value: Any) -> bool | None:
    """Read a boolean. Unknown text stays unknown. @zara"""
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if not isinstance(value, str):
        return None
    text = _token(value)
    if text in _ON:
        return True
    if text in _OFF:
        return False
    return None


def _aux(value: Any) -> bool | None:
    """Aux heater is on only for a recognized on-value or an active status. @zara

    ``off`` in every EMS-ESP language is false. Anything else, including
    ``compressor alarm``, stays unavailable.
    """
    flag = _on_off(value)
    if flag is not None:
        return flag
    mode = _activity(value)
    if mode in _AUX_ACTIVE:
        return True
    if mode == "off":
        return False
    return None


def _activity(value: Any) -> str | None:
    """Map hpactivity onto the contract modes. Unknown text is ``unknown``. @zara"""
    if not isinstance(value, str) or not value.strip():
        return None
    return _ACTIVITY.get(_token(value), "unknown")
