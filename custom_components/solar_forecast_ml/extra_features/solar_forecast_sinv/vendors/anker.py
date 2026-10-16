# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Anker Solix adapter for the S-INV contract. @zara

Maps entity description keys of the Anker Solix integration onto contract roles.
Only mappings whose meaning, unit and sign are verified are listed; every other
key stays a vendor entity (``sinv_anker_<key>``).

Verified conventions (Anker Solix API / MQTT map):
- ``battery_power_signed``: positive while charging (contract ``power_battery``)
- ``grid_power_signed``: positive while importing; a value the solarbank relays from the
  smart meter, so it stays a vendor entity (the meter is the grid meter gm01)
- ``pv_<n>_voltage`` / ``pv_<n>_current``: Solarbank 3 message 0500, V and A
"""

from __future__ import annotations

import re

from ..contract import indexed_role

VENDOR = "anker"
NAME = "Anker Solix"

_FIXED: dict[str, str] = {
    "input_power": "power_solar",
    "ac_output_power": "power_inverter_ac_output",
    "ac_voltage": "voltage_grid",
    "ac_frequency": "frequency_grid",
    "allow_grid_export": "state_grid_export_allowed",
    "state_of_charge": "battery_soc",
    "battery_power_signed": "power_battery",
    "bat_charge_power": "power_battery_charge",
    "bat_discharge_power": "power_battery_discharge",
    "grid_to_battery_power": "power_grid_to_battery",
    "home_demand_total": "power_house",
    "curtailment_active": "state_curtailment",
    # MQTT lifetime counters (kWh, total_increasing), verified against power on 2026-10-10
    "solar_energy": "energy_solar_total",
    "charged_energy": "energy_battery_charge_total",
    "discharged_energy": "energy_battery_discharge_total",
    "grid_import_energy": "energy_grid_import_total",
    "grid_export_energy": "energy_grid_export_total",
    "home_energy": "energy_house_total",
    # Cloud daily statistics (kWh, reset at local midnight)
    "daily_solar_production": "energy_solar_today",
    "daily_home_usage": "energy_house_today",
    # PV to battery: vendor value where the device reports it, otherwise derived
    "pv_to_battery_power": "power_solar_to_battery",
    "solar_to_battery_power": "power_solar_to_battery",
    # Solarbank AC output to the house (upstream key for solarbanks), equal to ac_output_power
    "ac_to_home_load": "power_inverter_ac_output",
    # Derived house flows for solarbanks
    "grid_to_house_power": "power_grid_to_house",
    "battery_to_house_power": "power_battery_to_house",
    "solar_to_house_power": "power_solar_to_house",
}

# MQTT lifetime counters behind contract roles. They cost no cloud requests, so S-INV
# creates them even when the device's energy category is excluded in the options.
CONTRACT_COUNTER_KEYS: frozenset[str] = frozenset(
    {
        "solar_energy",
        "charged_energy",
        "discharged_energy",
        "grid_import_energy",
        "grid_export_energy",
        "home_energy",
    }
)

# Keys whose value S-INV derives instead of the vendor reporting it.
DERIVED_KEYS: frozenset[str] = frozenset(
    {
        "solar_to_battery_power",
        "grid_to_house_power",
        "battery_to_house_power",
        "solar_to_house_power",
    }
)

# Keys that several device types report; only the measuring device owns the role.
_BY_DEVICE_TYPE: dict[str, dict[str, str]] = {
    "smartmeter": {
        "grid_to_home_power": "power_grid_import",
        "photovoltaic_to_grid_power": "power_grid_export",
    },
}

_INDEXED: tuple[tuple[re.Pattern[str], str, int], ...] = (
    (re.compile(r"^solar_power_(\d+)$"), "power_solar_mppt", 0),
    (re.compile(r"^pv_(\d+)_voltage$"), "voltage_solar_mppt", 0),
    (re.compile(r"^pv_(\d+)_current$"), "current_solar_mppt", 0),
    (re.compile(r"^exp_(\d+)_soc$"), "battery_pack_soc", 1),
    (re.compile(r"^exp_(\d+)_temperature$"), "temperature_battery_pack", 1),
)

_MAIN_PACK: dict[str, str] = {
    "main_battery_soc": "battery_pack_soc",
}


# roles an Anker key published before it became a vendor value: role -> key
RETIRED_ROLES = {"power_grid": "grid_power_signed"}


def role_for_key(key: str, device_type: str | None = None) -> str | None:
    """Return the contract role for an Anker entity description key. @zara"""
    if not isinstance(key, str):
        return None
    if (role := _FIXED.get(key)) is not None:
        return role
    if (role := _BY_DEVICE_TYPE.get(str(device_type), {}).get(key)) is not None:
        return role
    if (base := _MAIN_PACK.get(key)) is not None:
        return indexed_role(base, 1)
    for pattern, base, offset in _INDEXED:
        if (match := pattern.fullmatch(key)) is not None:
            channel = int(match.group(1)) + offset
            try:
                return indexed_role(base, channel)
            except ValueError:
                return None
    return None


def _number(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def curtailment_value(data: dict, _json_key: str) -> bool | None:
    """Curtailment rule approved for Anker (no vendor flag exists). @zara

    On while the battery is full (SOC >= 99 %), grid export is not allowed and
    PV is producing. None when one of the inputs is unknown.
    """
    soc = _number(data.get("battery_soc"))
    allowed = data.get("allow_grid_export")
    if not isinstance(allowed, bool):
        disabled = _number(data.get("grid_export_disabled"))
        allowed = None if disabled is None else disabled == 0
    pv = _number(data.get("input_power"))
    if pv is None:
        pv = _number(data.get("photovoltaic_power"))
    if soc is None or allowed is None or pv is None:
        return None
    return soc >= 99 and not allowed and pv > 0


def solar_to_battery_value(data: dict, _json_key: str, _context: str) -> float | None:
    """Derive PV power into the battery for devices without ``pv_to_battery_power``. @zara

    Charge power minus grid charge, bounded to 0 .. PV power: Anker reports
    ``grid_to_battery_power`` as 0 during protection charging from the grid
    (seen 2026-10-11: charge 1604 W, PV 421 W, grid to battery 0 W).
    """
    if data.get("pv_to_battery_power") is not None:
        return None
    charge = _number(data.get("bat_charge_power"))
    grid = _number(data.get("grid_to_battery_power"))
    pv = _number(data.get("input_power"))
    if pv is None:
        pv = _number(data.get("photovoltaic_power"))
    if charge is None or grid is None or pv is None:
        return None
    return float(round(min(max(0.0, charge - grid), max(0.0, pv))))


def _first(data: dict, *keys: str) -> float | None:
    for key in keys:
        if (value := _number(data.get(key))) is not None:
            return value
    return None


def _house_flows(data: dict) -> tuple[float, float, float] | None:
    """Split the house consumption into grid, battery and PV shares (W). @zara

    Inputs reported by the solarbank: signed grid power (+ import; cloud grid usage as
    fallback), grid-to-battery power, house demand, AC output to the house and battery
    discharge power. Every share is bounded so the three never exceed the house demand.
    """
    house = _first(data, "home_demand_total", "home_demand")
    grid = _first(data, "grid_power_signed", "grid_to_home_power")
    grid_to_battery = _number(data.get("grid_to_battery_power"))
    ac_out = _first(data, "to_home_load", "ac_output_power")
    discharge = _number(data.get("bat_discharge_power"))
    if None in (house, grid, grid_to_battery, ac_out, discharge):
        return None
    house = max(0.0, house)
    grid_to_house = min(max(0.0, grid - grid_to_battery), house)
    battery_to_house = min(max(0.0, discharge), max(0.0, ac_out), house)
    solar_to_house = max(
        0.0,
        min(ac_out - battery_to_house, house - battery_to_house - grid_to_house),
    )
    return grid_to_house, battery_to_house, solar_to_house


def grid_to_house_value(data: dict, _json_key: str, _context: str) -> float | None:
    """Return the derived grid power into the house. @zara"""
    flows = _house_flows(data)
    return None if flows is None else float(round(flows[0]))


def battery_to_house_value(data: dict, _json_key: str, _context: str) -> float | None:
    """Return the derived battery power into the house. @zara"""
    flows = _house_flows(data)
    return None if flows is None else float(round(flows[1]))


def solar_to_house_value(data: dict, _json_key: str, _context: str) -> float | None:
    """Return the derived PV power into the house. @zara"""
    flows = _house_flows(data)
    return None if flows is None else float(round(flows[2]))
