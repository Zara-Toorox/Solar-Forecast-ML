# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

"""Assign heat-pump sensors from one device instead of 25 entity pickers.

Two producers feed the existing ``sensor_sources`` confirmation step:

``discover_device_profile_candidates``
    Recognises a known gateway and maps its entities exactly.  EMS-ESP is the
    first profile: its entities are matched on the registry ``unique_id``,
    never on the entity id, because EMS-ESP builds entity ids in five
    different formats and customers rename them afterwards.

``device_mapping_candidate``
    Vendor independent fallback for a device the customer picks themselves.
    Names, units and device classes are scored, so Daikin, ViCare, Nibe,
    Stiebel/ISG or a Modbus bridge get the same one-click treatment at a lower
    confidence.

Nothing here writes configuration.  Both producers only propose values that the
flow shows for explicit confirmation, and every proposal is validated against
the live state first.

@zara
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any

from .assignment_policy import is_allowed_shared_assignment
from .const import (
    ADVANCED_SENSORS,
    CONF_CIRCULATION_PUMP_ENTITY,
    CONF_CIRCULATION_RETURN_TEMP_ENTITY,
    CONF_COMPRESSOR_ENTITY,
    CONF_DHW_TEMP_ENTITY,
    CONF_FLOW_TEMP_ENTITY,
    CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
    CONF_HEATING_ELEMENT_ENTITY,
    CONF_HEATING_ELEMENT_POWER_ENTITY,
    CONF_INDOOR_TEMP_ENTITY,
    CONF_JAZ_ENTITY,
    CONF_MANUFACTURER,
    CONF_MODEL,
    CONF_OPERATION_MODE_ENTITY,
    CONF_OUTDOOR_TEMP_ENTITY,
    CONF_RETURN_TEMP_ENTITY,
    CONF_RUNTIME_DHW_ENTITY,
    CONF_RUNTIME_ENTITY,
    CONF_RUNTIME_HEATING_ENTITY,
    CONF_SOURCE_TEMP_ENTITY,
    CONF_STARTS_ENTITY,
    CONF_STORAGE_AMBIENT_TEMP_ENTITY,
    CONF_STORAGE_TEMP_ENTITY,
    CONF_TARGET_TEMP_ENTITY,
    CONF_THERMAL_ENERGY_ENTITY,
    CONF_VOLUME_FLOW_ENTITY,
    CONF_WP_ENERGY_TODAY,
    CONF_WP_POWER_ENTITY,
    REQUIRED_SENSORS,
    STANDARD_SENSORS,
)

CONTRACT_VERSION = 1
PROFILE_EMS_ESP = "ems_esp"
PROFILE_DEVICE = "device"

MAX_CANDIDATES = 8
MAX_ENTITIES_PER_DEVICE = 512

_ENTITY_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*\.[a-z0-9_]+$")
_TOKEN_SPLIT = re.compile(r"[^a-z0-9]+")

HEAT_PUMP_MAPPING_KEYS = tuple(
    key
    for key in REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS
    if key != CONF_OUTDOOR_TEMP_ENTITY
)


# ---------------------------------------------------------------------------
# Accepted shapes per configuration key
# ---------------------------------------------------------------------------

_TEMPERATURE_UNITS = frozenset({"°c", "c", "°f", "f", "k"})
_POWER_UNITS = frozenset({"w", "kw", "mw"})
_ENERGY_UNITS = frozenset({"wh", "kwh", "mwh"})
_FLOW_UNITS = frozenset(
    {"l/h", "l/min", "l/s", "m³/h", "m3/h", "m³/min", "m3/min", "gal/min"}
)
_DURATION_UNITS = frozenset(
    {"min", "minutes", "h", "hours", "hrs", "d", "days", "s", "seconds"}
)

_NUMERIC_DOMAINS = frozenset({"sensor", "number", "input_number"})
_BINARY_DOMAINS = frozenset({"binary_sensor", "switch", "input_boolean"})
_MODE_DOMAINS = frozenset({"sensor", "select", "input_select"})
_CLIMATE_DOMAINS = frozenset({"sensor", "number", "input_number", "climate"})

# A thermostat is the most common source for these two, and EAI reads it from
# the climate attributes instead of the state. Mirrors the reading path in
# ``insights._reading``.
_CLIMATE_ATTRIBUTES = {
    CONF_INDOOR_TEMP_ENTITY: "current_temperature",
    CONF_TARGET_TEMP_ENTITY: "temperature",
}


@dataclass(frozen=True, slots=True)
class _Accepts:
    """Hard gate a proposal has to pass before it is ever offered.

    ``units`` of ``None`` means the value carries no unit at all, which is how
    counters, modes and status entities look.  ``allow_unitless`` widens a
    united key for sources that publish the number without a unit.
    """

    domains: frozenset[str]
    units: frozenset[str] | None = None
    allow_unitless: bool = False


_ACCEPTS: dict[str, _Accepts] = {
    CONF_WP_POWER_ENTITY: _Accepts(_NUMERIC_DOMAINS, _POWER_UNITS),
    CONF_HEATING_ELEMENT_POWER_ENTITY: _Accepts(_NUMERIC_DOMAINS, _POWER_UNITS),
    CONF_WP_ENERGY_TODAY: _Accepts(_NUMERIC_DOMAINS, _ENERGY_UNITS),
    CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY: _Accepts(
        _NUMERIC_DOMAINS, _ENERGY_UNITS
    ),
    CONF_THERMAL_ENERGY_ENTITY: _Accepts(_NUMERIC_DOMAINS, _ENERGY_UNITS),
    CONF_OUTDOOR_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_INDOOR_TEMP_ENTITY: _Accepts(_CLIMATE_DOMAINS, _TEMPERATURE_UNITS),
    CONF_TARGET_TEMP_ENTITY: _Accepts(_CLIMATE_DOMAINS, _TEMPERATURE_UNITS),
    CONF_DHW_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_FLOW_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_RETURN_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_SOURCE_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_STORAGE_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_STORAGE_AMBIENT_TEMP_ENTITY: _Accepts(_NUMERIC_DOMAINS, _TEMPERATURE_UNITS),
    CONF_CIRCULATION_RETURN_TEMP_ENTITY: _Accepts(
        _NUMERIC_DOMAINS, _TEMPERATURE_UNITS
    ),
    CONF_COMPRESSOR_ENTITY: _Accepts(_BINARY_DOMAINS),
    CONF_HEATING_ELEMENT_ENTITY: _Accepts(_BINARY_DOMAINS | {"sensor"}),
    CONF_CIRCULATION_PUMP_ENTITY: _Accepts(_BINARY_DOMAINS),
    CONF_OPERATION_MODE_ENTITY: _Accepts(_MODE_DOMAINS),
    CONF_VOLUME_FLOW_ENTITY: _Accepts(_NUMERIC_DOMAINS, _FLOW_UNITS),
    CONF_STARTS_ENTITY: _Accepts(_NUMERIC_DOMAINS),
    CONF_RUNTIME_ENTITY: _Accepts(
        _NUMERIC_DOMAINS, _DURATION_UNITS, allow_unitless=True
    ),
    CONF_RUNTIME_HEATING_ENTITY: _Accepts(
        _NUMERIC_DOMAINS, _DURATION_UNITS, allow_unitless=True
    ),
    CONF_RUNTIME_DHW_ENTITY: _Accepts(
        _NUMERIC_DOMAINS, _DURATION_UNITS, allow_unitless=True
    ),
    CONF_JAZ_ENTITY: _Accepts(_NUMERIC_DOMAINS),
}


# ---------------------------------------------------------------------------
# EMS-ESP profile
# ---------------------------------------------------------------------------

EMS_ESP_MANUFACTURER = "ems-esp"

# EMS-ESP names its Home Assistant devices after the EMS device type. The
# unique id is "[<basename>_]<device type>_<entity>", so the device type marks
# where the stable part of the id begins.
_EMS_DEVICE_TYPES = (
    "boiler",
    "heatpump",
    "thermostat",
    "water",
    "solar",
    "mixer",
    "heatsource",
    "ventilation",
    "extension",
    "connect",
    "controller",
    "switch",
    "pool",
    "alert",
)

# Generated from the official EMS-ESP entity dump (docs.emsesp.org). Each key
# lists its signatures in preference order and covers both the short entity
# format and the v3.4 long format, plus the "ww" remap of the older DHW tag.
_EMS_ESP_SIGNATURES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        CONF_WP_POWER_ENTITY,
        (
            "boiler_hpcurrpower",
            "boiler_compressor_current_power",
            "heatpump_hpcurrpower",
            "heatpump_compressor_current_power",
        ),
    ),
    (
        # Electrical input. The compressor-only meter comes first because EAI
        # defaults to the separate-measurement topology, where the backup
        # heater is accounted for on its own key.
        CONF_WP_ENERGY_TODAY,
        (
            "boiler_nrgconscomptotal",
            "boiler_total_energy_consumption_compressor",
            "boiler_nrgconstotal",
            "boiler_total_energy_consumption",
            "boiler_metertotal",
            "boiler_meter_total",
            "heatpump_metertotal",
            "heatpump_meter_total",
        ),
    ),
    (
        CONF_OUTDOOR_TEMP_ENTITY,
        (
            "boiler_outdoortemp",
            "boiler_outside_temperature",
            "thermostat_dampedoutdoortemp",
            "thermostat_damped_outdoor_temperature",
            "connect_outdoortemp",
            "connect_outside_temperature",
        ),
    ),
    (
        CONF_FLOW_TEMP_ENTITY,
        (
            "boiler_curflowtemp",
            "boiler_current_flow_temperature",
            "heatpump_curflowtemp",
            "heatpump_current_flow_temperature",
        ),
    ),
    (
        CONF_RETURN_TEMP_ENTITY,
        (
            "boiler_rettemp",
            "boiler_return_temperature",
            "heatpump_rettemp",
            "heatpump_return_temperature",
        ),
    ),
    (
        CONF_DHW_TEMP_ENTITY,
        (
            "boiler_dhw_curtemp",
            "boiler_dhw_current_intern_temperature",
            "boiler_wwcurtemp",
            "boiler_dhw_curtemp2",
            "boiler_dhw_current_extern_temperature",
            "boiler_wwcurtemp2",
            "water_dhw_temp",
            "water_dhw_current_temperature",
        ),
    ),
    (
        CONF_STORAGE_TEMP_ENTITY,
        (
            "boiler_dhw_storagetemp1",
            "boiler_dhw_storage_intern_temperature",
            "boiler_wwstoragetemp1",
            "boiler_dhw_storagetemp2",
            "boiler_dhw_storage_extern_temperature",
            "boiler_wwstoragetemp2",
        ),
    ),
    (
        CONF_COMPRESSOR_ENTITY,
        (
            "boiler_hpcompon",
            "boiler_hp_compressor",
        ),
    ),
    (
        CONF_OPERATION_MODE_ENTITY,
        (
            "boiler_hpactivity",
            "boiler_compressor_activity",
            "heatpump_hpactivity",
            "heatpump_compressor_activity",
        ),
    ),
    (
        CONF_HEATING_ELEMENT_ENTITY,
        (
            "boiler_auxheaterstatus",
            "boiler_aux_heater_status",
        ),
    ),
    (
        CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
        (
            "boiler_auxelecheatnrgconstotal",
            "boiler_total_aux_elec._heater_energy_consumption",
        ),
    ),
    (
        CONF_STARTS_ENTITY,
        (
            "boiler_totalcompstarts",
            "boiler_total_compressor_control_starts",
            "boiler_burnstarts",
            "boiler_burner_starts",
        ),
    ),
    (
        CONF_RUNTIME_HEATING_ENTITY,
        (
            "boiler_uptimecompheating",
            "boiler_operating_time_compressor_heating",
        ),
    ),
    (
        CONF_RUNTIME_DHW_ENTITY,
        (
            "boiler_dhw_uptimecomp",
            "boiler_dhw_operating_time_compressor",
            "boiler_wwuptimecomp",
        ),
    ),
    (
        CONF_RUNTIME_ENTITY,
        (
            "boiler_uptimetotal",
            "boiler_heatpump_total_uptime",
            "boiler_uptimecontrol",
            "boiler_total_operating_time_heat",
        ),
    ),
    (
        # Thermal output, which EAI divides by the electrical input to obtain a
        # measured work factor. EMS-ESP publishes no COP entity itself.
        CONF_THERMAL_ENERGY_ENTITY,
        (
            "boiler_nrgtotal",
            "boiler_total_energy",
            "boiler_nrgheat",
            "boiler_energy_heating",
            "heatpump_nrgtotal",
            "heatpump_total_energy",
        ),
    ),
    (
        CONF_VOLUME_FLOW_ENTITY,
        (
            "boiler_pc0flow",
            "boiler_flow_pc0",
        ),
    ),
    (
        CONF_INDOOR_TEMP_ENTITY,
        (
            "thermostat_hc1_currtemp",
            "thermostat_hc1_current_room_temperature",
        ),
    ),
    (
        CONF_TARGET_TEMP_ENTITY,
        (
            "thermostat_hc1_seltemp",
            "thermostat_hc1_selected_room_temperature",
        ),
    ),
    (
        CONF_SOURCE_TEMP_ENTITY,
        (
            "boiler_hptl2",
            "boiler_air_inlet_temperature_(tl2)",
        ),
    ),
)

# The device type that identifies the heat pump itself, used for the label and
# the manufacturer/model prefill.
_EMS_IDENTITY_KEYS = (CONF_WP_POWER_ENTITY, CONF_WP_ENERGY_TODAY, CONF_FLOW_TEMP_ENTITY)


# ---------------------------------------------------------------------------
# Vendor independent heuristic
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class _Heuristic:
    """Name tokens that identify one measurement across vendors."""

    include: tuple[tuple[str, ...], ...]
    exclude: tuple[str, ...] = ()


# Ordered: an earlier key claims an entity before a later one can. Include
# groups are ordered by confidence, and every group has to match completely.
_HEURISTICS: tuple[tuple[str, _Heuristic], ...] = (
    (
        CONF_OUTDOOR_TEMP_ENTITY,
        _Heuristic(
            include=(
                ("outdoor",),
                ("outside",),
                ("ambient",),
                ("aussen",),
                ("draussen",),
            ),
            exclude=("forecast", "min", "max", "average", "storage", "speicher"),
        ),
    ),
    (
        CONF_WP_POWER_ENTITY,
        _Heuristic(
            include=(
                ("compressor", "power"),
                ("kompressor", "leistung"),
                ("power", "consumption"),
                ("leistungsaufnahme",),
                ("electrical", "power"),
                ("power", "input"),
                ("power",),
            ),
            exclude=(
                "limit",
                "max",
                "min",
                "output",
                "thermal",
                "heat",
                "aux",
                "element",
                "heizstab",
                "backup",
                "reactive",
                "apparent",
                "factor",
                "voltage",
                "solar",
                "pv",
                "grid",
                "battery",
                "wallbox",
            ),
        ),
    ),
    (
        CONF_WP_ENERGY_TODAY,
        _Heuristic(
            include=(
                ("compressor", "consumption"),
                ("energy", "consumption"),
                ("consumption", "total"),
                ("stromverbrauch",),
                ("energieverbrauch",),
                ("meter", "total"),
                ("energy", "total"),
            ),
            exclude=(
                "thermal",
                "heat",
                "output",
                "aux",
                "element",
                "heizstab",
                "backup",
                "solar",
                "pv",
                "grid",
                "battery",
                "wallbox",
                "cooling",
                "pool",
            ),
        ),
    ),
    (
        CONF_FLOW_TEMP_ENTITY,
        _Heuristic(
            include=(("flow", "temperature"), ("vorlauf",), ("supply", "temperature")),
            exclude=("return", "ruecklauf", "offset", "target", "soll", "volume"),
        ),
    ),
    (
        CONF_RETURN_TEMP_ENTITY,
        _Heuristic(
            include=(("return", "temperature"), ("ruecklauf",)),
            exclude=("circulation", "zirkulation", "offset", "target", "soll"),
        ),
    ),
    (
        CONF_DHW_TEMP_ENTITY,
        _Heuristic(
            include=(
                ("dhw", "temperature"),
                ("hot", "water", "temperature"),
                ("warmwasser",),
                ("ww", "temp"),
            ),
            exclude=("target", "set", "soll", "max", "min", "offset", "hysteresis"),
        ),
    ),
    (
        CONF_INDOOR_TEMP_ENTITY,
        _Heuristic(
            include=(("room", "temperature"), ("indoor",), ("raumtemperatur",)),
            exclude=("target", "set", "soll", "selected", "offset"),
        ),
    ),
    (
        CONF_TARGET_TEMP_ENTITY,
        _Heuristic(
            include=(
                ("selected", "room", "temperature"),
                ("target", "room", "temperature"),
                ("raum", "soll"),
                ("solltemperatur",),
            ),
            exclude=("flow", "vorlauf", "dhw", "warmwasser"),
        ),
    ),
    (
        CONF_STORAGE_TEMP_ENTITY,
        _Heuristic(
            include=(
                ("storage", "temperature"),
                ("speicher", "temperatur"),
                ("cylinder", "temperature"),
            ),
            exclude=("target", "set", "soll", "ambient", "umgebung"),
        ),
    ),
    (
        CONF_SOURCE_TEMP_ENTITY,
        _Heuristic(
            include=(
                ("source", "temperature"),
                ("brine", "temperature"),
                ("quellentemperatur",),
                ("air", "inlet", "temperature"),
            ),
        ),
    ),
    (
        CONF_COMPRESSOR_ENTITY,
        _Heuristic(
            include=(("compressor",), ("kompressor",)),
            exclude=("speed", "power", "starts", "activity", "modulation", "runtime"),
        ),
    ),
    (
        CONF_HEATING_ELEMENT_ENTITY,
        _Heuristic(
            include=(
                ("aux", "heater"),
                ("backup", "heater"),
                ("heating", "element"),
                ("heizstab",),
                ("zusatzheizer",),
            ),
            exclude=("energy", "consumption", "delay", "source", "only", "level"),
        ),
    ),
    (
        CONF_CIRCULATION_PUMP_ENTITY,
        _Heuristic(
            include=(("circulation", "pump"), ("zirkulationspumpe",)),
            exclude=("speed", "power", "modulation"),
        ),
    ),
    (
        CONF_OPERATION_MODE_ENTITY,
        _Heuristic(
            include=(
                ("compressor", "activity"),
                ("operating", "mode"),
                ("operation", "mode"),
                ("betriebsmodus",),
                ("betriebsart",),
            ),
        ),
    ),
    (
        CONF_VOLUME_FLOW_ENTITY,
        _Heuristic(
            include=(
                ("volume", "flow"),
                ("volumenstrom",),
                ("durchfluss",),
                ("flow", "rate"),
            ),
        ),
    ),
    (
        CONF_STARTS_ENTITY,
        _Heuristic(
            include=(("compressor", "starts"), ("burner", "starts"), ("starts",)),
        ),
    ),
    (
        CONF_RUNTIME_HEATING_ENTITY,
        _Heuristic(
            include=(
                ("operating", "time", "compressor", "heating"),
                ("runtime", "heating"),
                ("betriebszeit", "heizen"),
            ),
        ),
    ),
    (
        CONF_RUNTIME_DHW_ENTITY,
        _Heuristic(
            include=(
                ("operating", "time", "compressor", "dhw"),
                ("runtime", "dhw"),
                ("betriebszeit", "warmwasser"),
            ),
        ),
    ),
    (
        CONF_RUNTIME_ENTITY,
        _Heuristic(
            include=(
                ("total", "operating", "time"),
                ("total", "uptime"),
                ("betriebsstunden",),
            ),
            exclude=("heating", "dhw", "cooling", "pool", "heizen", "warmwasser"),
        ),
    ),
    (
        CONF_THERMAL_ENERGY_ENTITY,
        _Heuristic(
            include=(
                ("thermal", "energy"),
                ("heat", "energy"),
                ("energy", "heating"),
                ("waermemenge",),
                ("thermische",),
            ),
            exclude=("consumption", "verbrauch", "electrical", "aux", "element"),
        ),
    ),
)


# ---------------------------------------------------------------------------
# Candidate
# ---------------------------------------------------------------------------

_CATEGORY_KEYS: dict[str, frozenset[str]] = {
    "environment": frozenset({CONF_OUTDOOR_TEMP_ENTITY}),
    "heat_pump": frozenset(HEAT_PUMP_MAPPING_KEYS),
    "wallbox": frozenset(),
}


@dataclass(frozen=True, slots=True)
class DeviceMappingCandidate:
    """Validated proposals derived from one device, offered for confirmation."""

    profile_id: str
    reference: str
    label: str
    mappings: MappingProxyType
    attributes: MappingProxyType

    @property
    def source_id(self) -> str:
        """Return a stable, non-secret selector value."""
        return f"{self.profile_id}|{self.reference}"

    def values_for(self, category: str) -> dict[str, str]:
        """Return destination config values for one product category."""
        keys = _CATEGORY_KEYS.get(category, frozenset())
        return {
            key: entity_id
            for key, entity_id in self.mappings.items()
            if key in keys
        }


# ---------------------------------------------------------------------------
# Public producers
# ---------------------------------------------------------------------------


def discover_device_profile_candidates(
    hass: Any,
    *,
    config: dict[str, Any] | None = None,
    registries: tuple[Any, Any] | None = None,
) -> tuple[DeviceMappingCandidate, ...]:
    """Return proposals for every recognised gateway installation."""
    device_registry, entity_registry = registries or _registries(hass)
    if device_registry is None or entity_registry is None:
        return ()
    candidates = [
        candidate
        for candidate in _ems_esp_candidates(
            hass, device_registry, entity_registry, config
        )
        if candidate is not None
    ]
    return tuple(sorted(candidates, key=lambda item: item.source_id))[:MAX_CANDIDATES]


def device_mapping_candidate(
    hass: Any,
    device_id: Any,
    *,
    config: dict[str, Any] | None = None,
    registries: tuple[Any, Any] | None = None,
) -> DeviceMappingCandidate | None:
    """Return proposals for one device the customer selected themselves."""
    if not isinstance(device_id, str) or not device_id:
        return None
    device_registry, entity_registry = registries or _registries(hass)
    if device_registry is None or entity_registry is None:
        return None
    device = _device(device_registry, device_id)
    if device is None:
        return None
    entities = _device_entities(entity_registry, (device_id,))
    profile = _profile_mappings(hass, entities, config)
    mappings = profile or _heuristic_mappings(hass, entities, config)
    if not mappings:
        return None
    return DeviceMappingCandidate(
        profile_id=PROFILE_DEVICE,
        reference=device_id,
        label=_device_label(device),
        mappings=MappingProxyType(mappings),
        attributes=MappingProxyType(_identity_attributes(device)),
    )


def profile_attribute_updates(
    candidate: DeviceMappingCandidate, existing: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Return manufacturer/model prefills that do not overwrite user input."""
    baseline = existing or {}
    return {
        key: value
        for key, value in candidate.attributes.items()
        if value and not baseline.get(key)
    }


# ---------------------------------------------------------------------------
# EMS-ESP detection
# ---------------------------------------------------------------------------


def _ems_esp_candidates(
    hass: Any,
    device_registry: Any,
    entity_registry: Any,
    config: dict[str, Any] | None,
) -> tuple[DeviceMappingCandidate | None, ...]:
    devices = _devices(device_registry)
    gateways = tuple(
        device
        for device in devices
        if str(getattr(device, "manufacturer", "") or "").strip().lower()
        == EMS_ESP_MANUFACTURER
    )
    candidates: list[DeviceMappingCandidate | None] = []
    for gateway in gateways[:MAX_CANDIDATES]:
        gateway_id = getattr(gateway, "id", None)
        if not isinstance(gateway_id, str) or not gateway_id:
            continue
        member_ids = tuple(
            device_id
            for device in devices
            if (device_id := getattr(device, "id", None))
            and (
                device_id == gateway_id
                or getattr(device, "via_device_id", None) == gateway_id
            )
        )
        entities = _device_entities(entity_registry, member_ids)
        mappings = _profile_mappings(hass, entities, config)
        if not mappings:
            continue
        identity = _identity_device(device_registry, entities, mappings)
        candidates.append(
            DeviceMappingCandidate(
                profile_id=PROFILE_EMS_ESP,
                reference=gateway_id,
                label=_ems_esp_label(identity),
                mappings=MappingProxyType(mappings),
                attributes=MappingProxyType(_identity_attributes(identity)),
            )
        )
    return tuple(candidates)


def _profile_mappings(
    hass: Any, entities: tuple[Any, ...], config: dict[str, Any] | None = None
) -> dict[str, str]:
    """Map EMS-ESP entities by registry unique id, in preference order."""
    by_signature: dict[str, str] = {}
    for entity in entities:
        signature = _ems_signature(getattr(entity, "unique_id", None))
        entity_id = getattr(entity, "entity_id", None)
        if signature is None or not _valid_entity_id(entity_id):
            continue
        by_signature.setdefault(signature, entity_id)
    mappings: dict[str, str] = {}
    claimed: dict[str, set[str]] = {}
    for key, signatures in _EMS_ESP_SIGNATURES:
        for signature in signatures:
            entity_id = by_signature.get(signature)
            if (
                entity_id is None
                or not _shareable(config, entity_id, claimed, key)
                or not _accepted(hass, key, entity_id)
            ):
                continue
            mappings[key] = entity_id
            claimed.setdefault(entity_id, set()).add(key)
            break
    return mappings


def _ems_signature(unique_id: Any) -> str | None:
    """Return "<ems device type>_<entity>" from an EMS-ESP unique id.

    The optional basename prefix is stripped, so the same signature matches
    whether the customer runs EMS-ESP with single- or multi-instance entity
    ids.  Matching the unique id rather than the entity id also survives both
    the v3.4 long format and any later rename in Home Assistant.
    """
    if not isinstance(unique_id, str) or not unique_id:
        return None
    value = unique_id.strip().lower()
    for device_type in _EMS_DEVICE_TYPES:
        marker = f"{device_type}_"
        index = value.find(marker)
        if index == 0 or (index > 0 and value[index - 1] in {"_", "-"}):
            return value[index:]
    return None


def _identity_device(
    device_registry: Any, entities: tuple[Any, ...], mappings: dict[str, str]
) -> Any | None:
    """Return the device that carries the heat pump itself."""
    owners = {
        getattr(entity, "entity_id", None): getattr(entity, "device_id", None)
        for entity in entities
    }
    for key in _EMS_IDENTITY_KEYS:
        device_id = owners.get(mappings.get(key))
        device = _device(device_registry, device_id) if device_id else None
        if device is not None:
            return device
    return None


def _ems_esp_label(device: Any | None) -> str:
    identity = _device_label(device) if device is not None else ""
    return f"EMS-ESP · {identity}" if identity else "EMS-ESP"


# ---------------------------------------------------------------------------
# Heuristic mapping
# ---------------------------------------------------------------------------


def _heuristic_mappings(
    hass: Any, entities: tuple[Any, ...], config: dict[str, Any] | None = None
) -> dict[str, str]:
    """Score a device's entities by name tokens, unit and domain."""
    scored: list[tuple[str, frozenset[str]]] = []
    for entity in entities:
        entity_id = getattr(entity, "entity_id", None)
        if not _valid_entity_id(entity_id):
            continue
        scored.append((entity_id, _tokens(hass, entity)))
    mappings: dict[str, str] = {}
    claimed: dict[str, set[str]] = {}
    for key, heuristic in _HEURISTICS:
        best: tuple[int, int, str] | None = None
        for entity_id, tokens in scored:
            if not _shareable(config, entity_id, claimed, key) or not _accepted(
                hass, key, entity_id
            ):
                continue
            confidence = _entity_confidence(entity_id, tokens, heuristic)
            if confidence is None:
                continue
            ranking = (confidence, -len(entity_id), entity_id)
            if best is None or ranking > best:
                best = ranking
        if best is not None:
            mappings[key] = best[2]
            claimed.setdefault(best[2], set()).add(key)
    return mappings


def _shareable(
    config: dict[str, Any] | None,
    entity_id: str,
    claimed: dict[str, set[str]],
    key: str,
) -> bool:
    """Return whether one entity may still take another configuration key.

    One source normally stands for exactly one measurement, but EAI knowingly
    shares some: a thermostat carries both the room temperature and its target.
    Deferring to the assignment policy keeps a proposal from being offered that
    the flow would then reject as a duplicate.
    """
    assigned = claimed.get(entity_id)
    if not assigned:
        return True
    return is_allowed_shared_assignment(config or {}, entity_id, assigned | {key})


def _entity_confidence(
    entity_id: str, tokens: frozenset[str], heuristic: _Heuristic
) -> int | None:
    """Return how strongly one entity matches a configuration key."""
    if entity_id.startswith("climate."):
        # A thermostat only reaches this point for the two keys EAI reads from
        # its attributes. The meaning is in the domain, so the name of the room
        # does not have to spell it out - and outranks any name match.
        return len(heuristic.include) + 1
    if tokens & frozenset(heuristic.exclude):
        return None
    return _confidence(tokens, heuristic.include)


def _confidence(
    tokens: frozenset[str], groups: tuple[tuple[str, ...], ...]
) -> int | None:
    """Return the strength of the first fully matching include group."""
    for index, group in enumerate(groups):
        if frozenset(group) <= tokens:
            return len(groups) - index
    return None


def _tokens(hass: Any, entity: Any) -> frozenset[str]:
    entity_id = str(getattr(entity, "entity_id", "") or "")
    parts = [entity_id.split(".", 1)[-1]]
    for attribute in ("original_name", "name", "translation_key", "unique_id"):
        value = getattr(entity, attribute, None)
        if isinstance(value, str) and value:
            parts.append(value)
    state = hass.states.get(entity_id) if entity_id else None
    friendly_name = (getattr(state, "attributes", None) or {}).get("friendly_name")
    if isinstance(friendly_name, str) and friendly_name:
        parts.append(friendly_name)
    tokens: set[str] = set()
    for part in parts:
        normalized = (
            part.lower()
            .replace("ä", "ae")
            .replace("ö", "oe")
            .replace("ü", "ue")
            .replace("ß", "ss")
        )
        tokens.update(token for token in _TOKEN_SPLIT.split(normalized) if token)
    return frozenset(tokens)


# ---------------------------------------------------------------------------
# Registry and state access
# ---------------------------------------------------------------------------


def _registries(hass: Any) -> tuple[Any, Any]:
    try:
        from homeassistant.helpers import device_registry, entity_registry
    except ImportError:  # pragma: no cover - Home Assistant is always present
        return None, None
    try:
        return device_registry.async_get(hass), entity_registry.async_get(hass)
    except Exception:  # noqa: BLE001 - a missing registry must not break setup
        return None, None


def _devices(device_registry: Any) -> tuple[Any, ...]:
    devices = getattr(device_registry, "devices", None)
    values = getattr(devices, "values", None)
    return tuple(values()) if callable(values) else ()


def _device(device_registry: Any, device_id: Any) -> Any | None:
    return device_registry.async_get(device_id)


def _device_entities(
    entity_registry: Any, device_ids: tuple[str, ...]
) -> tuple[Any, ...]:
    entities = getattr(entity_registry, "entities", None)
    values = getattr(entities, "values", None)
    if not callable(values):
        return ()
    wanted = frozenset(device_ids)
    matching = [
        entity
        for entity in values()
        if getattr(entity, "device_id", None) in wanted
        and not getattr(entity, "disabled_by", None)
    ]
    return tuple(matching[:MAX_ENTITIES_PER_DEVICE])


def _device_label(device: Any) -> str:
    parts = [
        str(getattr(device, attribute, "") or "").strip()
        for attribute in ("manufacturer", "model")
    ]
    identity = " ".join(part for part in parts if part)
    fallback = str(
        getattr(device, "name_by_user", None) or getattr(device, "name", "") or ""
    ).strip()
    return identity or fallback


def _identity_attributes(device: Any | None) -> dict[str, str]:
    if device is None:
        return {}
    attributes = {
        CONF_MANUFACTURER: str(getattr(device, "manufacturer", "") or "").strip(),
        CONF_MODEL: str(getattr(device, "model", "") or "").strip(),
    }
    return {key: value for key, value in attributes.items() if value}


def _valid_entity_id(entity_id: Any) -> bool:
    return (
        isinstance(entity_id, str)
        and len(entity_id) <= 255
        and bool(_ENTITY_ID_PATTERN.match(entity_id))
    )


def _accepted(hass: Any, key: str, entity_id: str) -> bool:
    """Reject a proposal whose live state cannot carry the requested value."""
    accepts = _ACCEPTS.get(key)
    if accepts is None:
        return False
    domain = entity_id.split(".", 1)[0]
    if domain not in accepts.domains:
        return False
    state = hass.states.get(entity_id)
    if state is None:
        return False
    attributes = getattr(state, "attributes", None) or {}
    if domain == "climate":
        return _climate_attribute_present(key, attributes)
    unit = str(attributes.get("unit_of_measurement") or "").strip().lower()
    if accepts.units is None:
        return not unit
    return unit in accepts.units or (not unit and accepts.allow_unitless)


def _climate_attribute_present(key: str, attributes: Any) -> bool:
    """Return whether a thermostat exposes the temperature EAI reads from it."""
    attribute = _CLIMATE_ATTRIBUTES.get(key)
    if attribute is None:
        return False
    value = attributes.get(attribute)
    return isinstance(value, (int, float)) and not isinstance(value, bool)


__all__ = [
    "CONTRACT_VERSION",
    "DeviceMappingCandidate",
    "HEAT_PUMP_MAPPING_KEYS",
    "PROFILE_DEVICE",
    "PROFILE_EMS_ESP",
    "device_mapping_candidate",
    "discover_device_profile_candidates",
    "profile_attribute_updates",
]
