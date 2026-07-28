"""Strict adapter for versioned ecosystem sensor-mapping providers."""

from __future__ import annotations

from dataclasses import dataclass
from types import MappingProxyType
from typing import Any

from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import valid_entity_id

from .const import (
    CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
    CONF_HEATING_ELEMENT_POWER_ENTITY,
    CONF_OUTDOOR_TEMP_ENTITY,
    CONF_WALLBOX_ENERGY_TODAY_ENTITY,
    CONF_WALLBOX_POWER_ENTITY,
    CONF_WP_ENERGY_TODAY,
    CONF_WP_POWER_ENTITY,
)

CONTRACT_VERSION = 1
REGISTRY_KEY = "sensor_mapping_providers"
SOURCE_DOMAINS = (
    "solar_forecast_ml",
    "sfml_stats",
    "weather_fusion_ai",
)
MAX_PROVIDERS_PER_DOMAIN = 8
MAX_MAPPINGS_PER_PROVIDER = 64

SEMANTIC_TARGETS: dict[str, str | None] = {
    "environment.outdoor_temperature": CONF_OUTDOOR_TEMP_ENTITY,
    "weather.humidity": None,
    "weather.pressure": None,
    "weather.wind_speed": None,
    "weather.precipitation": None,
    "weather.solar_radiation": None,
    "weather.illuminance": None,
    "heat_pump.compressor.power": CONF_WP_POWER_ENTITY,
    "heat_pump.compressor.energy.daily": CONF_WP_ENERGY_TODAY,
    "heat_pump.operation.heating": None,
    "heat_pump.operation.dhw": None,
    "heating_element.power": CONF_HEATING_ELEMENT_POWER_ENTITY,
    "heating_element.energy.daily": CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
    "wallbox.power": CONF_WALLBOX_POWER_ENTITY,
    "wallbox.energy.daily": CONF_WALLBOX_ENERGY_TODAY_ENTITY,
    "wallbox.energy.session": None,
    "wallbox.status": None,
}

_POWER_SEMANTICS = frozenset(
    {
        "heat_pump.compressor.power",
        "heating_element.power",
        "wallbox.power",
    }
)
_ENERGY_SEMANTICS = frozenset(
    {
        "heat_pump.compressor.energy.daily",
        "heating_element.energy.daily",
        "wallbox.energy.daily",
        "wallbox.energy.session",
    }
)
_TEMPERATURE_SEMANTICS = frozenset({"environment.outdoor_temperature"})
_WEATHER_UNITS = {
    "weather.humidity": {"%", "percent"},
    "weather.pressure": {"pa", "hpa", "kpa", "bar", "inhg", "in hg"},
    "weather.wind_speed": {
        "km/h",
        "kph",
        "m/s",
        "mps",
        "mph",
        "mi/h",
        "kn",
        "kt",
        "knot",
        "knots",
    },
    "weather.precipitation": {
        "mm",
        "mm/h",
        "cm",
        "cm/h",
        "in",
        "in/h",
    },
    "weather.solar_radiation": {"w/m²", "w/m2", "kw/m²", "kw/m2"},
    "weather.illuminance": {"lx", "klx"},
}
_STATUS_SEMANTICS = frozenset(
    {
        "heat_pump.operation.heating",
        "heat_pump.operation.dhw",
        "wallbox.status",
    }
)
_PAYLOAD_TYPES = (dict, MappingProxyType)


@dataclass(frozen=True, slots=True)
class SensorMappingCandidate:
    """Validated, entry-bound mappings offered for explicit user confirmation."""

    source_domain: str
    entry_id: str
    mappings: MappingProxyType

    @property
    def source_id(self) -> str:
        """Return a stable, non-secret selector value."""
        return f"{self.source_domain}|{self.entry_id}"

    def values_for(self, category: str) -> dict[str, str]:
        """Return destination config values for one product category."""
        prefixes = {
            "environment": ("environment.",),
            "heat_pump": ("heat_pump.", "heating_element."),
            "wallbox": ("wallbox.",),
        }[category]
        return {
            target: entity_id
            for semantic, entity_id in self.mappings.items()
            if semantic.startswith(prefixes)
            and (target := SEMANTIC_TARGETS[semantic]) is not None
        }


def discover_sensor_mapping_candidates(hass: Any) -> tuple[SensorMappingCandidate, ...]:
    """Return bounded, strictly validated providers from known local domains."""
    candidates: list[SensorMappingCandidate] = []
    for source_domain in SOURCE_DOMAINS:
        domain_data = getattr(hass, "data", {}).get(source_domain)
        if type(domain_data) is not dict:
            continue
        registry = domain_data.get(REGISTRY_KEY)
        if type(registry) is not dict:
            continue
        if len(registry) > MAX_PROVIDERS_PER_DOMAIN:
            continue
        for entry_id, provider in tuple(registry.items()):
            candidate = _candidate(hass, source_domain, entry_id, provider)
            if candidate is not None:
                candidates.append(candidate)
    return tuple(
        sorted(
            candidates,
            key=lambda candidate: (candidate.source_domain, candidate.entry_id),
        )
    )


def _candidate(
    hass: Any,
    source_domain: str,
    registry_entry_id: Any,
    provider: Any,
) -> SensorMappingCandidate | None:
    if (
        not isinstance(registry_entry_id, str)
        or not registry_entry_id
        or len(registry_entry_id) > 255
    ):
        return None
    entry = hass.config_entries.async_get_entry(registry_entry_id)
    if (
        entry is None
        or entry.domain != source_domain
        or entry.state is not ConfigEntryState.LOADED
    ):
        return None
    snapshot = getattr(provider, "snapshot", None)
    if not callable(snapshot):
        return None
    try:
        payload = snapshot()
    except Exception:  # noqa: BLE001 - optional providers must be isolated
        return None
    if (
        type(payload) not in _PAYLOAD_TYPES
        or len(payload) != 4
        or set(payload)
        != {
        "contract_version",
        "provider_domain",
        "entry_id",
        "mappings",
        }
    ):
        return None
    if (
        type(payload["contract_version"]) is not int
        or payload["contract_version"] != CONTRACT_VERSION
        or payload["provider_domain"] != source_domain
        or payload["entry_id"] != registry_entry_id
    ):
        return None
    raw_mappings = payload["mappings"]
    if (
        type(raw_mappings) not in _PAYLOAD_TYPES
        or len(raw_mappings) > MAX_MAPPINGS_PER_PROVIDER
    ):
        return None
    mappings: dict[str, str] = {}
    for semantic, entity_id in raw_mappings.items():
        if (
            type(semantic) is not str
            or not semantic
            or len(semantic) > 64
            or semantic not in SEMANTIC_TARGETS
            or type(entity_id) is not str
            or len(entity_id) > 255
            or not valid_entity_id(entity_id)
        ):
            return None
        if _compatible_state(hass, semantic, entity_id):
            mappings[semantic] = entity_id
    if not mappings:
        return None
    return SensorMappingCandidate(
        source_domain=source_domain,
        entry_id=registry_entry_id,
        mappings=MappingProxyType(mappings),
    )


def _compatible_state(hass: Any, semantic: str, entity_id: str) -> bool:
    state = hass.states.get(entity_id)
    if state is None:
        return False
    domain = entity_id.split(".", 1)[0]
    attributes = getattr(state, "attributes", {}) or {}
    unit = str(attributes.get("unit_of_measurement") or "").strip().lower()
    device_class = str(attributes.get("device_class") or "").strip().lower()
    if semantic in _POWER_SEMANTICS:
        return (
            domain in {"sensor", "number", "input_number"}
            and unit in {"w", "kw", "mw"}
            and device_class in {"power", ""}
        )
    if semantic in _ENERGY_SEMANTICS:
        return (
            domain in {"sensor", "number", "input_number"}
            and unit in {"wh", "kwh", "mwh"}
            and device_class in {"energy", ""}
        )
    if semantic in _TEMPERATURE_SEMANTICS:
        return (
            domain in {"sensor", "number", "input_number"}
            and unit in {"°c", "c", "°f", "f"}
            and device_class in {"temperature", ""}
        )
    if semantic in _WEATHER_UNITS:
        return domain in {"sensor", "number", "input_number"} and unit in _WEATHER_UNITS[
            semantic
        ]
    if semantic in _STATUS_SEMANTICS:
        return domain in {"sensor", "binary_sensor", "select", "switch"}
    return False
