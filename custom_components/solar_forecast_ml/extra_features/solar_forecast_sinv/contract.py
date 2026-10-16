# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""S-INV data contract, version 1. @zara

Single source of truth for the vendor-neutral roles S-INV publishes. The module
has no Home Assistant imports so that tests and other integrations can read it.
Human-readable description: CONTRACT.md in the repository root.

Identity rules:
- device entity:  unique_id ``sinv:1:<device_serial_lower>:<role>``,
  entity_id ``<domain>.sinv_<class><nn>_<role>`` (class from the role: iv, bt, gm;
  nn = 01, 02, ... per class in order of first discovery)
- system entity:  unique_id ``sinv:1:site:<role>``, entity_id ``<domain>.sinv_<role>``,
  the value of the whole installation (aggregation rule per role)
- vendor entity:  unique_id ``sinv:1:<device_serial_lower>:<vendor>:<key>``,
  entity_id ``<domain>.sinv_<vendor>_<key>``, then ``sinv_<vendor>_<n>_<key>``

Units are normative: W, kWh, V, A, Hz, degC, %. Signed battery power is positive
while charging, signed grid power is positive while importing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

CONTRACT_VERSION = 1
UNIQUE_ID_PREFIX = f"sinv:{CONTRACT_VERSION}:"
OBJECT_ID_PREFIX = "sinv"

ATTR_CONTRACT = "sinv_contract"
ATTR_ROLE = "sinv_role"
ATTR_DEVICE_INDEX = "sinv_device_index"
ATTR_VENDOR = "sinv_vendor"
ATTR_DERIVED = "sinv_derived"

MAX_CHANNELS = 16

_SLUG = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True)
class RoleSpec:
    """Normative definition of one contract role (or an indexed role family). @zara"""

    base: str
    domains: tuple[str, ...]
    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str
    indexed: bool = False
    note: str = ""


ROLE_SPECS: tuple[RoleSpec, ...] = (
    # PV generator
    RoleSpec(
        "power_solar",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Solar power",
        "Solarleistung",
    ),
    RoleSpec(
        "power_solar_mppt",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Power MPPT {nn}",
        "Leistung MPPT {nn}",
        True,
    ),
    RoleSpec(
        "voltage_solar_mppt",
        ("sensor",),
        "V",
        "voltage",
        "measurement",
        "Voltage MPPT {nn}",
        "Spannung MPPT {nn}",
        True,
    ),
    RoleSpec(
        "current_solar_mppt",
        ("sensor",),
        "A",
        "current",
        "measurement",
        "Current MPPT {nn}",
        "Strom MPPT {nn}",
        True,
    ),
    RoleSpec(
        "energy_solar_total",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "Solar energy total",
        "Solarenergie gesamt",
    ),
    RoleSpec(
        "energy_solar_today",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "Solar energy today",
        "Solarenergie heute",
    ),
    # Inverter and grid quality
    RoleSpec(
        "power_inverter_ac_output",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Inverter AC output",
        "Wechselrichter AC-Ausgang",
    ),
    RoleSpec(
        "power_ac_net",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Net AC power",
        "AC-Nettoleistung",
        note="positive = delivered into the house grid, negative = drawn from it; "
        "published only where the sign is unambiguous",
    ),
    RoleSpec(
        "voltage_grid",
        ("sensor",),
        "V",
        "voltage",
        "measurement",
        "Grid voltage",
        "Netzspannung",
    ),
    RoleSpec(
        "frequency_grid",
        ("sensor",),
        "Hz",
        "frequency",
        "measurement",
        "Grid frequency",
        "Netzfrequenz",
    ),
    RoleSpec(
        "temperature_inverter",
        ("sensor",),
        "°C",
        "temperature",
        "measurement",
        "Inverter temperature",
        "Wechselrichter-Temperatur",
    ),
    RoleSpec(
        "state_grid_export_allowed",
        ("binary_sensor", "switch"),
        None,
        None,
        None,
        "Grid export allowed",
        "Netzeinspeisung erlaubt",
    ),
    RoleSpec(
        "state_curtailment",
        ("binary_sensor",),
        None,
        None,
        None,
        "Curtailment active",
        "Abregelung aktiv",
    ),
    # Battery
    RoleSpec(
        "battery_soc",
        ("sensor",),
        "%",
        "battery",
        "measurement",
        "Battery state of charge",
        "Akku-Ladestand",
    ),
    RoleSpec(
        "battery_soh",
        ("sensor",),
        "%",
        None,
        "measurement",
        "Battery state of health",
        "Akku-Gesundheit",
    ),
    RoleSpec(
        "power_battery",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Battery power",
        "Akkuleistung",
        note="positive while charging",
    ),
    RoleSpec(
        "power_battery_charge",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Battery charge power",
        "Akku-Ladeleistung",
    ),
    RoleSpec(
        "power_battery_discharge",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Battery discharge power",
        "Akku-Entladeleistung",
    ),
    RoleSpec(
        "power_solar_to_battery",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Solar to battery",
        "Solar zum Akku",
    ),
    RoleSpec(
        "power_grid_to_battery",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Grid to battery",
        "Netz zum Akku",
    ),
    RoleSpec(
        "power_battery_to_house",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Battery to house",
        "Akku zum Haus",
    ),
    RoleSpec(
        "energy_battery_charge_total",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "Battery charged total",
        "Akku geladen gesamt",
    ),
    RoleSpec(
        "energy_battery_discharge_total",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "Battery discharged total",
        "Akku entladen gesamt",
    ),
    RoleSpec(
        "capacity_battery",
        ("sensor",),
        "kWh",
        "energy_storage",
        "measurement",
        "Battery capacity",
        "Akkukapazität",
    ),
    RoleSpec(
        "temperature_battery",
        ("sensor",),
        "°C",
        "temperature",
        "measurement",
        "Battery temperature",
        "Akkutemperatur",
    ),
    RoleSpec(
        "battery_pack_soc",
        ("sensor",),
        "%",
        "battery",
        "measurement",
        "Battery pack {nn} state of charge",
        "Akkupack {nn} Ladestand",
        True,
    ),
    RoleSpec(
        "battery_pack_soh",
        ("sensor",),
        "%",
        None,
        "measurement",
        "Battery pack {nn} state of health",
        "Akkupack {nn} Gesundheit",
        True,
    ),
    RoleSpec(
        "temperature_battery_pack",
        ("sensor",),
        "°C",
        "temperature",
        "measurement",
        "Battery pack {nn} temperature",
        "Akkupack {nn} Temperatur",
        True,
    ),
    # Grid meter and house
    RoleSpec(
        "power_grid",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Grid power",
        "Netzleistung",
        note="positive while importing",
    ),
    RoleSpec(
        "power_grid_import",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Grid import",
        "Netzbezug",
    ),
    RoleSpec(
        "power_grid_export",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Grid export",
        "Netzeinspeisung",
    ),
    RoleSpec(
        "energy_grid_import_total",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "Grid import total",
        "Netzbezug gesamt",
    ),
    RoleSpec(
        "energy_grid_export_total",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "Grid export total",
        "Netzeinspeisung gesamt",
    ),
    RoleSpec(
        "power_house",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "House consumption",
        "Hausverbrauch",
    ),
    RoleSpec(
        "power_solar_to_house",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Solar to house",
        "Solar zum Haus",
    ),
    RoleSpec(
        "power_grid_to_house",
        ("sensor",),
        "W",
        "power",
        "measurement",
        "Grid to house",
        "Netz zum Haus",
    ),
    RoleSpec(
        "energy_house_today",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "House energy today",
        "Hausverbrauch heute",
    ),
    RoleSpec(
        "energy_house_total",
        ("sensor",),
        "kWh",
        "energy",
        "total_increasing",
        "House energy total",
        "Hausverbrauch gesamt",
    ),
)

ROLE_SPEC_BY_BASE: dict[str, RoleSpec] = {spec.base: spec for spec in ROLE_SPECS}


def indexed_role(base: str, channel: int) -> str:
    """Return the role key of an indexed family, e.g. ``power_solar_mppt_01``. @zara"""
    spec = ROLE_SPEC_BY_BASE[base]
    if not spec.indexed:
        raise ValueError(f"{base} is not an indexed role")
    if not 1 <= channel <= MAX_CHANNELS:
        raise ValueError(f"channel {channel} out of range")
    return f"{base}_{channel:02d}"


def split_role(role: str) -> tuple[RoleSpec, int | None] | None:
    """Return the spec and channel for a role key, or None if it is not a contract role. @zara"""
    if (spec := ROLE_SPEC_BY_BASE.get(role)) is not None and not spec.indexed:
        return spec, None
    base, sep, digits = role.rpartition("_")
    if not sep or len(digits) != 2 or not digits.isdigit():
        return None
    spec = ROLE_SPEC_BY_BASE.get(base)
    if spec is None or not spec.indexed:
        return None
    channel = int(digits)
    if not 1 <= channel <= MAX_CHANNELS:
        return None
    return spec, channel


def is_role(role: str) -> bool:
    """Return True for every valid contract role key. @zara"""
    return split_role(role) is not None


def slug(text: str) -> str:
    """Lowercase ASCII slug used for serials and vendor keys. @zara"""
    return _SLUG.sub("_", str(text).lower()).strip("_")


def role_unique_id(serial: str, role: str) -> str:
    """unique_id of a contract entity. @zara"""
    if not is_role(role):
        raise ValueError(f"unknown contract role {role}")
    return f"{UNIQUE_ID_PREFIX}{str(serial).lower()}:{role}"


def vendor_unique_id(serial: str, vendor: str, key: str) -> str:
    """unique_id of a vendor-specific entity. @zara"""
    return f"{UNIQUE_ID_PREFIX}{str(serial).lower()}:{slug(vendor)}:{key.lower()}"


def parse_unique_id(unique_id: str) -> dict[str, str] | None:
    """Split an S-INV unique_id; returns None for foreign ids. @zara"""
    if not isinstance(unique_id, str) or not unique_id.startswith(UNIQUE_ID_PREFIX):
        return None
    parts = unique_id[len(UNIQUE_ID_PREFIX) :].split(":")
    if len(parts) == 2 and is_role(parts[1]):
        return {"serial": parts[0], "role": parts[1]}
    if len(parts) == 3:
        return {"serial": parts[0], "vendor": parts[1], "key": parts[2]}
    return None


SITE_SERIAL = "site"

# Device class prefix per role family (entity ids sinv_<class><nn>_<role>)
CLASS_INVERTER = "iv"
CLASS_BATTERY = "bt"
CLASS_GRID_METER = "gm"
DEVICE_CLASSES = (CLASS_INVERTER, CLASS_BATTERY, CLASS_GRID_METER)

# Aggregation of device values into the system entity sinv_<role>
AGG_SUM = "sum"
AGG_SOC = "capacity_weighted"
AGG_SINGLE = "single"
AGG_ANY = "any"
AGG_ALL = "all"
AGG_DEVICE = "device_only"

_ROLE_RULES: dict[str, tuple[str, str]] = {
    # base: (device class, aggregation)
    "power_solar": (CLASS_INVERTER, AGG_SUM),
    "power_solar_mppt": (CLASS_INVERTER, AGG_DEVICE),
    "voltage_solar_mppt": (CLASS_INVERTER, AGG_DEVICE),
    "current_solar_mppt": (CLASS_INVERTER, AGG_DEVICE),
    "energy_solar_total": (CLASS_INVERTER, AGG_SUM),
    "energy_solar_today": (CLASS_INVERTER, AGG_SUM),
    "power_inverter_ac_output": (CLASS_INVERTER, AGG_SUM),
    "power_ac_net": (CLASS_INVERTER, AGG_DEVICE),
    "voltage_grid": (CLASS_INVERTER, AGG_DEVICE),
    "frequency_grid": (CLASS_INVERTER, AGG_DEVICE),
    "temperature_inverter": (CLASS_INVERTER, AGG_DEVICE),
    "state_grid_export_allowed": (CLASS_INVERTER, AGG_ALL),
    "state_curtailment": (CLASS_INVERTER, AGG_ANY),
    "battery_soc": (CLASS_BATTERY, AGG_SOC),
    "battery_soh": (CLASS_BATTERY, AGG_DEVICE),
    "power_battery": (CLASS_BATTERY, AGG_SUM),
    "power_battery_charge": (CLASS_BATTERY, AGG_SUM),
    "power_battery_discharge": (CLASS_BATTERY, AGG_SUM),
    "energy_battery_charge_total": (CLASS_BATTERY, AGG_SUM),
    "energy_battery_discharge_total": (CLASS_BATTERY, AGG_SUM),
    "capacity_battery": (CLASS_BATTERY, AGG_SUM),
    "temperature_battery": (CLASS_BATTERY, AGG_DEVICE),
    "battery_pack_soc": (CLASS_BATTERY, AGG_DEVICE),
    "battery_pack_soh": (CLASS_BATTERY, AGG_DEVICE),
    "temperature_battery_pack": (CLASS_BATTERY, AGG_DEVICE),
    "power_grid": (CLASS_GRID_METER, AGG_SINGLE),
    "power_grid_import": (CLASS_GRID_METER, AGG_SINGLE),
    "power_grid_export": (CLASS_GRID_METER, AGG_SINGLE),
    "energy_grid_import_total": (CLASS_GRID_METER, AGG_SINGLE),
    "energy_grid_export_total": (CLASS_GRID_METER, AGG_SINGLE),
    # house balance and energy flows describe the whole installation only;
    # the providing device keeps a hidden source entity
    "power_house": (CLASS_INVERTER, AGG_SINGLE),
    "energy_house_today": (CLASS_INVERTER, AGG_SINGLE),
    "energy_house_total": (CLASS_INVERTER, AGG_SINGLE),
    "power_solar_to_battery": (CLASS_INVERTER, AGG_SINGLE),
    "power_grid_to_battery": (CLASS_INVERTER, AGG_SINGLE),
    "power_battery_to_house": (CLASS_INVERTER, AGG_SINGLE),
    "power_solar_to_house": (CLASS_INVERTER, AGG_SINGLE),
    "power_grid_to_house": (CLASS_INVERTER, AGG_SINGLE),
}
SITE_ONLY_BASES = frozenset(
    {
        "power_house",
        "energy_house_today",
        "energy_house_total",
        "power_solar_to_battery",
        "power_grid_to_battery",
        "power_battery_to_house",
        "power_solar_to_house",
        "power_grid_to_house",
    }
)


def _base(role: str) -> str:
    split = split_role(role)
    if split is None:
        raise ValueError(f"unknown contract role {role}")
    return split[0].base


def role_class(role: str) -> str:
    """Return the device class prefix (iv, bt, gm) of a role. @zara"""
    return _ROLE_RULES[_base(role)][0]


def aggregation(role: str) -> str:
    """Return how device values of a role combine into the system entity. @zara"""
    return _ROLE_RULES[_base(role)][1]


# site rule of power_house when generators outside the meter owner's system are added
AGG_HOUSE_BALANCE = "house_plus_foreign_ac"
# vendors whose power_house is grid + their own net AC (an energy balance), so that
# generators of other entries can be added; flow sums (KOSTAL) or cloud values do not
BALANCE_HOUSE_VENDORS = frozenset({"fronius", "huawei", "solax", "sungrow", "solakon"})
# device roles the installation reads without publishing a system entity for them
BALANCE_SOURCE_BASES = frozenset({"power_ac_net"})
# a device with any of these roles produces or stores energy on the AC side
GENERATOR_BASES = frozenset(
    {"power_solar", "power_inverter_ac_output", "power_battery"}
)
_BATTERY_PREFIXES = ("power_battery", "battery_soc", "capacity_battery")


def ac_net_without_battery(roles: dict[str, Any]) -> float | None:
    """Net AC power of a device without battery: its AC output, else None. @zara

    Without a battery an inverter can only deliver AC power, so its output is the
    net value; with a battery the sign while charging from the grid is vendor
    specific and the value stays unpublished.
    """
    if any(role.startswith(_BATTERY_PREFIXES) for role in roles):
        return None
    value = roles.get("power_inverter_ac_output")
    return value if isinstance(value, int | float) else None


def has_system_entity(role: str) -> bool:
    """Return True when the installation publishes sinv_<role> for this role. @zara"""
    return aggregation(role) != AGG_DEVICE


SYSTEM_BINARY_BASES = frozenset({"state_curtailment", "state_grid_export_allowed"})


def system_domain(role: str) -> str:
    """Return the platform of the system entity of a role. @zara"""
    return "binary_sensor" if _base(role) in SYSTEM_BINARY_BASES else "sensor"


def is_site_only(role: str) -> bool:
    """Return True for roles shown only for the whole installation. @zara"""
    return _base(role) in SITE_ONLY_BASES


def device_object_id(role: str, index: int) -> str:
    """Object id of a device entity: sinv_<class><nn>_<role>. @zara"""
    return f"{OBJECT_ID_PREFIX}_{role_class(role)}{index:02d}_{role}"


def system_object_id(role: str) -> str:
    """Object id of the system entity of a role: sinv_<role>. @zara"""
    if not is_role(role):
        raise ValueError(f"unknown contract role {role}")
    return f"{OBJECT_ID_PREFIX}_{role}"


def system_unique_id(role: str) -> str:
    """unique_id of the system entity of a role. @zara"""
    return role_unique_id(SITE_SERIAL, role)


def vendor_object_id(vendor: str, key: str, index: int = 1) -> str:
    """Object id of the index-th vendor entity with the same key. @zara"""
    if index <= 1:
        return f"{OBJECT_ID_PREFIX}_{slug(vendor)}_{slug(key)}"
    return f"{OBJECT_ID_PREFIX}_{slug(vendor)}_{index}_{slug(key)}"


def role_names(role: str) -> dict[str, str]:
    """English and German display names of a role. @zara"""
    split = split_role(role)
    if split is None:
        raise ValueError(f"unknown contract role {role}")
    spec, channel = split
    nn = f"{channel:02d}" if channel is not None else ""
    return {"en": spec.name_en.format(nn=nn), "de": spec.name_de.format(nn=nn)}
