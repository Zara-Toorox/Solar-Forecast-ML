"""License-first EAI configuration and reauthentication flows."""

from __future__ import annotations

from math import isfinite
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from . import get_license_validator
from .assignment_policy import is_allowed_shared_assignment
from .const import (
    ADVANCED_SENSORS,
    CONF_BUILDING_REF,
    CONF_CAPABILITY_LEVEL,
    CONF_CIRCULATION_PUMP_ENTITY,
    CONF_COMPRESSOR_ENTITY,
    CONF_COP_RATED,
    CONF_STORAGE_VOLUME_L,
    CONF_ELECTRICITY_PRICE_ENTITY,
    CONF_ELECTRICITY_PRICE_UNIT,
    CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY,
    CONF_EV_BATTERY_CAPACITY_KWH,
    CONF_EV_CHARGING_EFFICIENCY_PERCENT,
    CONF_EV_CONSUMPTION_KWH_PER_100KM,
    CONF_EV_DEMAND_MODE,
    CONF_EV_DEPARTURE_TIME,
    CONF_EV_PLANNED_DISTANCE_ENTITY,
    CONF_EV_REQUIRED_ENERGY_ENTITY,
    CONF_EV_SOC_ENTITY,
    CONF_EV_TARGET_SOC,
    CONF_FEED_IN_TARIFF_ENTITY,
    CONF_FEED_IN_TARIFF_UNIT,
    CONF_HAS_DHW,
    CONF_HAS_HEATING_ELEMENT,
    CONF_HEAT_PUMP_ENABLED,
    CONF_HEATING_CAPACITY_KW,
    CONF_HEATING_ELEMENT_ENTITY,
    CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
    CONF_HEATING_ELEMENT_POWER_ENTITY,
    CONF_INDOOR_TEMP_ENTITY,
    CONF_LICENSE_ID,
    CONF_LICENSE_KEY,
    CONF_LICENSE_STATUS,
    CONF_LOW_PRICE_THRESHOLD_CT,
    CONF_MANUFACTURER,
    CONF_MODEL,
    CONF_ONBOARDING_STATE,
    CONF_OPERATION_MODE_ENTITY,
    CONF_RUNTIME_COUNTER_SCOPE,
    CONF_STARTS_COUNTER_SCOPE,
    CONF_TARGET_TEMP_ENTITY,
    CONF_WP_TYPE,
    CONF_WALLBOX_CHARGING_ENTITY,
    CONF_WALLBOX_CONNECTED_ENTITY,
    CONF_WALLBOX_ENABLED,
    CONF_WALLBOX_ENERGY_TODAY_ENTITY,
    CONF_WALLBOX_MAX_POWER_KW,
    CONF_WALLBOX_NAME,
    CONF_WALLBOX_POWER_ENTITY,
    CONF_WEATHER_FUSION_ENTRY_ID,
    CONF_WEATHER_HISTORY_DAYS,
    CONF_WEATHER_INTELLIGENCE_ENABLED,
    DEFAULT_EV_BATTERY_CAPACITY_KWH,
    DEFAULT_EV_CHARGING_EFFICIENCY_PERCENT,
    DEFAULT_EV_CONSUMPTION_KWH_PER_100KM,
    DEFAULT_EV_DEMAND_MODE,
    DEFAULT_EV_DEPARTURE_TIME,
    DEFAULT_EV_TARGET_SOC,
    DEFAULT_COP_RATED,
    DEFAULT_ELECTRICAL_MEASUREMENT_TOPOLOGY,
    DEFAULT_HEATING_CAPACITY_KW,
    DEFAULT_WP_TYPE,
    DOMAIN,
    DEFAULT_LOW_PRICE_THRESHOLD_CT,
    DEFAULT_PRICE_UNIT,
    DEFAULT_WALLBOX_MAX_POWER_KW,
    ELECTRICAL_TOPOLOGY_LEGACY_AGGREGATE,
    ELECTRICAL_TOPOLOGY_SEPARATE,
    DEFAULT_WEATHER_HISTORY_DAYS,
    COUNTER_SCOPE_UNKNOWN,
    REQUIRED_SENSORS,
    STANDARD_SENSORS,
    SUPPORTED_WP_TYPES,
    SUPPORTED_COUNTER_SCOPES,
    WALLBOX_SENSORS,
)
from .sensor_mapping import (
    SensorMappingCandidate,
    discover_sensor_mapping_candidates,
)
from .weather_station_adapter import SFMLWeatherStationAdapter

WEATHER_FUSION_DOMAIN = "weather_fusion_ai"
SFML_DOMAIN = "solar_forecast_ml"
STATS_DOMAIN = "sfml_stats"
CONF_USE_DISCOVERED_MAPPINGS = "use_discovered_sensor_mappings"
SENSOR_SOURCE_FIELDS = {
    "environment": "environment_sensor_source",
    "heat_pump": "heat_pump_sensor_source",
    "wallbox": "wallbox_sensor_source",
}
SENSOR_SOURCE_LABELS = {
    "solar_forecast_ml": "SFML",
    "sfml_stats": "STATS",
    "weather_fusion_ai": "Weather Fusion AI",
}

WALLBOX_OPTION_KEYS = (
    CONF_WALLBOX_NAME,
    *WALLBOX_SENSORS,
    CONF_EV_DEMAND_MODE,
    CONF_EV_BATTERY_CAPACITY_KWH,
    CONF_EV_TARGET_SOC,
    CONF_EV_CONSUMPTION_KWH_PER_100KM,
    CONF_EV_CHARGING_EFFICIENCY_PERCENT,
    CONF_EV_DEPARTURE_TIME,
    CONF_WALLBOX_MAX_POWER_KW,
)


def _sensor_source_schema(
    candidates: tuple[SensorMappingCandidate, ...],
    enabled: dict[str, bool],
) -> vol.Schema:
    fields: dict[Any, Any] = {
        vol.Required(CONF_USE_DISCOVERED_MAPPINGS, default=False): bool
    }
    ordinals: dict[str, int] = {}
    labels: dict[str, str] = {}
    for candidate in candidates:
        ordinals[candidate.source_domain] = ordinals.get(candidate.source_domain, 0) + 1
        labels[candidate.source_id] = (
            f"{SENSOR_SOURCE_LABELS[candidate.source_domain]} "
            f"{ordinals[candidate.source_domain]}"
        )
    for category, field in SENSOR_SOURCE_FIELDS.items():
        if not enabled.get(category):
            continue
        available = [
            candidate
            for candidate in candidates
            if candidate.values_for(category)
        ]
        if not available:
            continue
        marker: Any = vol.Optional(field)
        if len(available) == 1:
            marker = vol.Optional(field, default=available[0].source_id)
        fields[marker] = selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=[
                    {"value": candidate.source_id, "label": labels[candidate.source_id]}
                    for candidate in available
                ],
                mode=selector.SelectSelectorMode.DROPDOWN,
            )
        )
    return vol.Schema(fields)


def _source_enabled(data: dict[str, Any]) -> dict[str, bool]:
    return {
        "environment": bool(data.get(CONF_HEAT_PUMP_ENABLED)),
        "heat_pump": bool(data.get(CONF_HEAT_PUMP_ENABLED)),
        "wallbox": bool(data.get(CONF_WALLBOX_ENABLED)),
    }


def _mapping_suggestions(
    candidates: tuple[SensorMappingCandidate, ...],
    user_input: dict[str, Any],
    enabled: dict[str, bool],
) -> tuple[dict[str, str], set[str]]:
    if not user_input.get(CONF_USE_DISCOVERED_MAPPINGS):
        return {}, set()
    by_id = {candidate.source_id: candidate for candidate in candidates}
    suggestions: dict[str, str] = {}
    selected_categories: set[str] = set()
    for category, field in SENSOR_SOURCE_FIELDS.items():
        source_id = user_input.get(field)
        if not enabled.get(category) or not source_id:
            continue
        candidate = by_id.get(source_id)
        if candidate is None:
            raise vol.Invalid("sensor mapping source is no longer available")
        values = candidate.values_for(category)
        if not values:
            raise vol.Invalid("sensor mapping source has no compatible values")
        selected_categories.add(category)
        for target, entity_id in values.items():
            existing = suggestions.get(target)
            if existing is not None and existing != entity_id:
                raise vol.Invalid("sensor mapping sources conflict")
            suggestions[target] = entity_id
    if not selected_categories:
        raise vol.Invalid("select at least one sensor mapping source")
    return suggestions, selected_categories


def _apply_mapping_suggestions(
    target: dict[str, Any],
    suggestions: dict[str, str],
    selected_categories: set[str],
    *,
    existing: dict[str, Any] | None = None,
) -> None:
    baseline = existing if existing is not None else target
    heater_disabled = baseline.get(CONF_HAS_HEATING_ELEMENT) is False
    for key, entity_id in suggestions.items():
        if heater_disabled and key in {
            CONF_HEATING_ELEMENT_POWER_ENTITY,
            CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
        }:
            continue
        if baseline.get(key) in (None, "") and target.get(key) in (None, ""):
            target[key] = entity_id
    if "heat_pump" in selected_categories:
        if baseline.get(CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY) in (None, ""):
            target.setdefault(
                CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY,
                ELECTRICAL_TOPOLOGY_SEPARATE,
            )
        if not heater_disabled and any(
            key in suggestions
            for key in (
                CONF_HEATING_ELEMENT_POWER_ENTITY,
                CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
            )
        ):
            target.setdefault(CONF_HAS_HEATING_ELEMENT, True)

HEAT_PUMP_OPTION_KEYS = (
    CONF_WP_TYPE,
    CONF_MANUFACTURER,
    CONF_MODEL,
    CONF_HEATING_CAPACITY_KW,
    CONF_COP_RATED,
    CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY,
    CONF_HAS_HEATING_ELEMENT,
    CONF_HAS_DHW,
    CONF_STORAGE_VOLUME_L,
    CONF_BUILDING_REF,
)

NUMERIC_HEAT_PUMP_ENTITY_KEYS = frozenset(
    REQUIRED_SENSORS
    + tuple(
        key
        for key in STANDARD_SENSORS + ADVANCED_SENSORS
        if key
        not in {
            CONF_OPERATION_MODE_ENTITY,
            CONF_COMPRESSOR_ENTITY,
            CONF_CIRCULATION_PUMP_ENTITY,
        }
    )
)


def _finite_range(minimum: float, maximum: float):
    def validate(value: Any) -> float:
        if isinstance(value, bool):
            raise vol.Invalid("boolean values are not valid numbers")
        try:
            parsed = float(value)
        except (TypeError, ValueError) as err:
            raise vol.Invalid("value must be a number") from err
        if not isfinite(parsed) or not minimum <= parsed <= maximum:
            raise vol.Invalid(
                f"value must be finite and between {minimum} and {maximum}"
            )
        return parsed

    return validate


def _safe_number_default(
    value: Any,
    fallback: float,
    minimum: float,
    maximum: float,
) -> float:
    try:
        return _finite_range(minimum, maximum)(value)
    except vol.Invalid:
        return fallback


def _validated_heat_pump_input(user_input: dict[str, Any]) -> dict[str, Any]:
    validated = dict(user_input)
    validated[CONF_HEATING_CAPACITY_KW] = _finite_range(1.0, 100.0)(
        user_input.get(CONF_HEATING_CAPACITY_KW)
    )
    validated[CONF_COP_RATED] = _finite_range(1.0, 10.0)(
        user_input.get(CONF_COP_RATED)
    )
    return validated


def _safe_bool_default(value: Any, fallback: bool) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    if isinstance(value, (int, float)) and value in {0, 1}:
        return bool(value)
    return fallback


def _safe_choice_default(value: Any, choices: set[str] | frozenset[str], fallback: str) -> str:
    return value if isinstance(value, str) and value in choices else fallback


def _optional_text_marker(key: str, defaults: dict[str, Any]) -> vol.Optional:
    value = defaults.get(key)
    return (
        vol.Optional(key, default=value)
        if isinstance(value, str) and value
        else vol.Optional(key)
    )


def _heat_pump_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    defaults = defaults or {}
    storage_value = defaults.get(CONF_STORAGE_VOLUME_L)
    storage_marker = vol.Optional(CONF_STORAGE_VOLUME_L)
    if storage_value not in (None, ""):
        normalized_storage = _safe_number_default(storage_value, 0.0, 20.0, 5000.0)
        if normalized_storage:
            storage_marker = vol.Optional(
                CONF_STORAGE_VOLUME_L,
                default=normalized_storage,
            )
    return vol.Schema(
        {
            vol.Required(
                CONF_WP_TYPE,
                default=_safe_choice_default(
                    defaults.get(CONF_WP_TYPE),
                    SUPPORTED_WP_TYPES,
                    DEFAULT_WP_TYPE,
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=sorted(SUPPORTED_WP_TYPES),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="wp_type",
                )
            ),
            _optional_text_marker(CONF_MANUFACTURER, defaults): str,
            _optional_text_marker(CONF_MODEL, defaults): str,
            vol.Required(
                CONF_HEATING_CAPACITY_KW,
                default=_safe_number_default(
                    defaults.get(CONF_HEATING_CAPACITY_KW),
                    DEFAULT_HEATING_CAPACITY_KW,
                    1.0,
                    100.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=100,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kW",
                )
            ),
            vol.Required(
                CONF_COP_RATED,
                default=_safe_number_default(
                    defaults.get(CONF_COP_RATED),
                    DEFAULT_COP_RATED,
                    1.0,
                    10.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=10,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
            vol.Required(
                CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY,
                default=_safe_choice_default(
                    defaults.get(CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY),
                    {
                        ELECTRICAL_TOPOLOGY_LEGACY_AGGREGATE,
                        ELECTRICAL_TOPOLOGY_SEPARATE,
                    },
                    DEFAULT_ELECTRICAL_MEASUREMENT_TOPOLOGY,
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        ELECTRICAL_TOPOLOGY_LEGACY_AGGREGATE,
                        ELECTRICAL_TOPOLOGY_SEPARATE,
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="electrical_measurement_topology",
                )
            ),
            vol.Required(
                CONF_HAS_HEATING_ELEMENT,
                default=_safe_bool_default(
                    defaults.get(CONF_HAS_HEATING_ELEMENT), False
                ),
            ): bool,
            vol.Required(
                CONF_HAS_DHW,
                default=_safe_bool_default(defaults.get(CONF_HAS_DHW), True),
            ): bool,
            storage_marker: selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=20,
                    max=5000,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="L",
                )
            ),
            _optional_text_marker(CONF_BUILDING_REF, defaults): str,
        }
    )


def _replace_options(
    options: dict[str, Any], user_input: dict[str, Any], keys: tuple[str, ...]
) -> None:
    for key in keys:
        if key not in user_input:
            continue
        value = user_input[key]
        if value in (None, ""):
            # None deliberately masks values stored during onboarding in entry.data.
            options[key] = None
        else:
            options[key] = value


def _mask_disabled_heating_element(
    options: dict[str, Any], data: dict[str, Any]
) -> None:
    if data.get(CONF_HAS_HEATING_ELEMENT) is False:
        for key in (
            CONF_HEATING_ELEMENT_ENTITY,
            CONF_HEATING_ELEMENT_POWER_ENTITY,
            CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
        ):
            options[key] = None


def _features_schema(defaults: dict[str, Any]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(
                CONF_HEAT_PUMP_ENABLED,
                default=_safe_bool_default(
                    defaults.get(CONF_HEAT_PUMP_ENABLED), True
                ),
            ): bool,
            vol.Required(
                CONF_WALLBOX_ENABLED,
                default=_safe_bool_default(
                    defaults.get(CONF_WALLBOX_ENABLED), False
                ),
            ): bool,
            vol.Required(
                CONF_WEATHER_INTELLIGENCE_ENABLED,
                default=_safe_bool_default(
                    defaults.get(CONF_WEATHER_INTELLIGENCE_ENABLED), False
                ),
            ): bool,
        }
    )


def _weather_schema(hass: Any, defaults: dict[str, Any]) -> vol.Schema:
    entries = hass.config_entries.async_entries(WEATHER_FUSION_DOMAIN)
    options = [
        {"value": entry.entry_id, "label": entry.title or entry.entry_id}
        for entry in entries
    ]
    fields: dict[Any, Any] = {
        vol.Required(
            CONF_WEATHER_HISTORY_DAYS,
            default=int(
                _safe_number_default(
                    defaults.get(CONF_WEATHER_HISTORY_DAYS),
                    float(DEFAULT_WEATHER_HISTORY_DAYS),
                    7.0,
                    365.0,
                )
            ),
        ): selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=7,
                max=365,
                step=1,
                mode=selector.NumberSelectorMode.BOX,
                unit_of_measurement="d",
            )
        )
    }
    if options:
        current = defaults.get(CONF_WEATHER_FUSION_ENTRY_ID)
        marker = (
            vol.Required(CONF_WEATHER_FUSION_ENTRY_ID, default=current)
            if current in {option["value"] for option in options}
            else vol.Required(CONF_WEATHER_FUSION_ENTRY_ID)
        )
        fields[marker] = selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=options,
                mode=selector.SelectSelectorMode.DROPDOWN,
            )
        )
    return vol.Schema(fields)


def _weather_dependency_error(hass: Any) -> str | None:
    """Return the first unmet prerequisite for Weather Intelligence."""
    if not hass.config_entries.async_entries(SFML_DOMAIN):
        return "sfml_required"
    if not hass.config_entries.async_entries(STATS_DOMAIN):
        return "stats_required"
    station_status = SFMLWeatherStationAdapter(hass).dependency_status()[
        "station_status"
    ]
    if station_status == "sfml_sensor_provider_ambiguous":
        return "weather_station_ambiguous"
    if station_status != "available":
        return "weather_station_required"
    if not hass.config_entries.async_entries(WEATHER_FUSION_DOMAIN):
        return "weather_fusion_required"
    return None


def _required_sensor_errors(hass: Any, data: dict[str, Any]) -> list[str]:
    if not data.get(CONF_HEAT_PUMP_ENABLED, True):
        return []
    compatible_units = {
        "wp_power_entity": {"w", "kw", "mw"},
        "wp_energy_today": {"wh", "kwh", "mwh"},
        "outdoor_temp_entity": {"°c", "c", "°f", "f"},
    }
    errors = []
    for key in REQUIRED_SENSORS:
        entity_id = data.get(key)
        state = hass.states.get(entity_id) if entity_id else None
        if state is None:
            errors.append(key)
            continue
        if str(state.state).lower() in {"unknown", "unavailable", "none", ""}:
            continue
        unit = str((state.attributes or {}).get("unit_of_measurement") or "").lower()
        if unit not in compatible_units[key]:
            errors.append(key)
    return errors


def _has_disallowed_duplicate_assignments(
    data: dict[str, Any], keys: tuple[str, ...]
) -> bool:
    assignments: dict[str, set[str]] = {}
    for key in keys:
        entity_id = data.get(key)
        if entity_id:
            assignments.setdefault(entity_id, set()).add(key)
    return any(
        len(assigned_keys) > 1
        and not is_allowed_shared_assignment(data, entity_id, assigned_keys)
        for entity_id, assigned_keys in assignments.items()
    )


def _entity_schema(
    keys: tuple[str, ...],
    *,
    required: bool,
    defaults: dict[str, Any] | None = None,
) -> vol.Schema:
    defaults = defaults or {}
    fields: dict[Any, Any] = {}
    for key in keys:
        if required:
            marker = (
                vol.Required(key, default=defaults[key])
                if isinstance(defaults.get(key), str) and defaults.get(key)
                else vol.Required(key)
            )
        else:
            marker = (
                vol.Optional(key, default=defaults[key])
                if defaults.get(key) is not None
                else vol.Optional(key)
            )
        domains = ["sensor", "binary_sensor"]
        if key in {
            CONF_CIRCULATION_PUMP_ENTITY,
            CONF_COMPRESSOR_ENTITY,
            CONF_HEATING_ELEMENT_ENTITY,
        }:
            domains.append("switch")
        if key in NUMERIC_HEAT_PUMP_ENTITY_KEYS:
            domains.append("input_number")
            domains.append("number")
        if key in {CONF_INDOOR_TEMP_ENTITY, CONF_TARGET_TEMP_ENTITY}:
            domains.append("climate")
        fields[marker] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain=domains)
        )
    return vol.Schema(fields)


def _license_schema() -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_LICENSE_KEY): selector.TextSelector(
                selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
            )
        }
    )


def _sensor_options_schema(defaults: dict[str, Any]) -> vol.Schema:
    required = _entity_schema(REQUIRED_SENSORS, required=True, defaults=defaults)
    optional = _entity_schema(
        STANDARD_SENSORS + ADVANCED_SENSORS,
        required=False,
        defaults=defaults,
    )
    scopes = _counter_scope_schema(defaults)
    return vol.Schema(
        {**required.schema, **optional.schema, **scopes.schema}
    )


def _counter_scope_schema(defaults: dict[str, Any]) -> vol.Schema:
    fields: dict[Any, Any] = {}
    for key in (CONF_RUNTIME_COUNTER_SCOPE, CONF_STARTS_COUNTER_SCOPE):
        value = defaults.get(key, COUNTER_SCOPE_UNKNOWN)
        if value not in SUPPORTED_COUNTER_SCOPES:
            value = COUNTER_SCOPE_UNKNOWN
        fields[vol.Required(key, default=value)] = selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=list(SUPPORTED_COUNTER_SCOPES),
                mode=selector.SelectSelectorMode.DROPDOWN,
                translation_key="counter_scope",
            )
        )
    return vol.Schema(fields)


def _automation_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    defaults = defaults or {}
    electricity_price = (
        vol.Optional(
            CONF_ELECTRICITY_PRICE_ENTITY,
            default=defaults[CONF_ELECTRICITY_PRICE_ENTITY],
        )
        if defaults.get(CONF_ELECTRICITY_PRICE_ENTITY) is not None
        else vol.Optional(CONF_ELECTRICITY_PRICE_ENTITY)
    )
    feed_in_tariff = (
        vol.Optional(
            CONF_FEED_IN_TARIFF_ENTITY,
            default=defaults[CONF_FEED_IN_TARIFF_ENTITY],
        )
        if defaults.get(CONF_FEED_IN_TARIFF_ENTITY) is not None
        else vol.Optional(CONF_FEED_IN_TARIFF_ENTITY)
    )
    return vol.Schema(
        {
            electricity_price: selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            vol.Optional(
                CONF_ELECTRICITY_PRICE_UNIT,
                default=_safe_choice_default(
                    defaults.get(CONF_ELECTRICITY_PRICE_UNIT),
                    {"auto", "ct_per_kwh", "eur_per_kwh"},
                    DEFAULT_PRICE_UNIT,
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["auto", "ct_per_kwh", "eur_per_kwh"],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="price_unit",
                )
            ),
            feed_in_tariff: selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            vol.Optional(
                CONF_FEED_IN_TARIFF_UNIT,
                default=_safe_choice_default(
                    defaults.get(CONF_FEED_IN_TARIFF_UNIT),
                    {"auto", "ct_per_kwh", "eur_per_kwh"},
                    DEFAULT_PRICE_UNIT,
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["auto", "ct_per_kwh", "eur_per_kwh"],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="price_unit",
                )
            ),
            vol.Optional(
                CONF_LOW_PRICE_THRESHOLD_CT,
                default=_safe_number_default(
                    defaults.get(CONF_LOW_PRICE_THRESHOLD_CT),
                    DEFAULT_LOW_PRICE_THRESHOLD_CT,
                    0.0,
                    200.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=200,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="ct/kWh",
                )
            ),
        }
    )


def _wallbox_choice_schema(*, default: bool = False) -> vol.Schema:
    return vol.Schema({vol.Required(CONF_WALLBOX_ENABLED, default=default): bool})


def _wallbox_schema(
    *, required: bool, defaults: dict[str, Any] | None = None
) -> vol.Schema:
    defaults = defaults or {}
    marker = vol.Required if required else vol.Optional

    def entity_marker(key: str, *, is_required: bool = False):
        field_marker = marker if is_required else vol.Optional
        if key in defaults and defaults[key] is not None:
            return field_marker(key, default=defaults[key])
        return field_marker(key)

    return vol.Schema(
        {
            marker(
                CONF_WALLBOX_NAME,
                default=defaults.get(CONF_WALLBOX_NAME, "Wallbox"),
            ): str,
            entity_marker(
                CONF_WALLBOX_POWER_ENTITY, is_required=required
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            entity_marker(
                CONF_WALLBOX_ENERGY_TODAY_ENTITY
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            entity_marker(CONF_WALLBOX_CONNECTED_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "binary_sensor"])
            ),
            entity_marker(CONF_WALLBOX_CHARGING_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "binary_sensor"])
            ),
            vol.Optional(
                CONF_EV_DEMAND_MODE,
                default=_safe_choice_default(
                    defaults.get(CONF_EV_DEMAND_MODE),
                    {"soc", "energy", "distance"},
                    DEFAULT_EV_DEMAND_MODE,
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["soc", "energy", "distance"],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="ev_demand_mode",
                )
            ),
            entity_marker(CONF_EV_SOC_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            entity_marker(CONF_EV_REQUIRED_ENERGY_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            entity_marker(CONF_EV_PLANNED_DISTANCE_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor", "input_number"])
            ),
            vol.Optional(
                CONF_EV_BATTERY_CAPACITY_KWH,
                default=_safe_number_default(
                    defaults.get(CONF_EV_BATTERY_CAPACITY_KWH),
                    DEFAULT_EV_BATTERY_CAPACITY_KWH,
                    5.0,
                    250.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=5,
                    max=250,
                    step=0.5,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kWh",
                )
            ),
            vol.Optional(
                CONF_EV_TARGET_SOC,
                default=_safe_number_default(
                    defaults.get(CONF_EV_TARGET_SOC),
                    DEFAULT_EV_TARGET_SOC,
                    10.0,
                    100.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=10,
                    max=100,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="%",
                )
            ),
            vol.Optional(
                CONF_EV_CONSUMPTION_KWH_PER_100KM,
                default=_safe_number_default(
                    defaults.get(CONF_EV_CONSUMPTION_KWH_PER_100KM),
                    DEFAULT_EV_CONSUMPTION_KWH_PER_100KM,
                    5.0,
                    60.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=5,
                    max=60,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kWh/100 km",
                )
            ),
            vol.Optional(
                CONF_EV_CHARGING_EFFICIENCY_PERCENT,
                default=_safe_number_default(
                    defaults.get(CONF_EV_CHARGING_EFFICIENCY_PERCENT),
                    DEFAULT_EV_CHARGING_EFFICIENCY_PERCENT,
                    50.0,
                    100.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=50,
                    max=100,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="%",
                )
            ),
            marker(
                CONF_EV_DEPARTURE_TIME,
                default=defaults.get(
                    CONF_EV_DEPARTURE_TIME, DEFAULT_EV_DEPARTURE_TIME
                ),
            ): selector.TimeSelector(),
            marker(
                CONF_WALLBOX_MAX_POWER_KW,
                default=_safe_number_default(
                    defaults.get(CONF_WALLBOX_MAX_POWER_KW),
                    DEFAULT_WALLBOX_MAX_POWER_KW,
                    1.0,
                    50.0,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=50,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kW",
                )
            ),
        }
    )


def _has_wallbox_demand_source(data: dict[str, Any]) -> bool:
    sources = {
        "soc": CONF_EV_SOC_ENTITY,
        "energy": CONF_EV_REQUIRED_ENERGY_ENTITY,
        "distance": CONF_EV_PLANNED_DISTANCE_ENTITY,
    }
    mode = data.get(CONF_EV_DEMAND_MODE)
    return bool(data.get(sources.get(mode, "")))


def _capability(data: dict[str, Any]) -> str:
    if not data.get(CONF_HEAT_PUMP_ENABLED, True):
        if data.get(CONF_WEATHER_INTELLIGENCE_ENABLED):
            return "weather"
        if data.get(CONF_WALLBOX_ENABLED):
            return "mobility"
        return "premium"
    standard = sum(bool(data.get(key)) for key in STANDARD_SENSORS)
    advanced = sum(bool(data.get(key)) for key in ADVANCED_SENSORS)
    if advanced >= 2 and standard >= 5:
        return "advanced"
    if standard >= 2:
        return "standard"
    return "essential"


@config_entries.HANDLERS.register(DOMAIN)
class SolarForecastEAIConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 3

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        return SolarForecastEAIOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        return await self.async_step_license(user_input)

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        entry = self._get_reconfigure_entry()
        current = {**entry.data, **entry.options}
        sensor_keys = REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS
        if user_input is not None:
            try:
                user_input = _validated_heat_pump_input(user_input)
            except vol.Invalid:
                return self.async_show_form(
                    step_id="reconfigure",
                    data_schema=self._reconfigure_schema(
                        {**current, **user_input}
                    ),
                    errors={"base": "invalid_heat_pump_values"},
                )
            updated = dict(entry.data)
            updated_options = dict(entry.options)
            _replace_options(
                updated_options,
                user_input,
                sensor_keys
                + (CONF_RUNTIME_COUNTER_SCOPE, CONF_STARTS_COUNTER_SCOPE),
            )
            _replace_options(updated_options, user_input, HEAT_PUMP_OPTION_KEYS)
            _mask_disabled_heating_element(updated_options, user_input)
            merged = {**updated, **updated_options}
            if _required_sensor_errors(self.hass, merged) or (
                merged.get(CONF_HEAT_PUMP_ENABLED, True)
                and _has_disallowed_duplicate_assignments(merged, sensor_keys)
            ):
                return self.async_show_form(
                    step_id="reconfigure",
                    data_schema=self._reconfigure_schema(current),
                    errors={"base": "validation_required"},
                )
            updated_options[CONF_CAPABILITY_LEVEL] = _capability(merged)
            return self.async_update_and_abort(
                entry,
                options=updated_options,
                reason="reconfigure_successful",
            )

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=self._reconfigure_schema(current),
        )

    @staticmethod
    def _reconfigure_schema(current: dict[str, Any]) -> vol.Schema:
        sensors = _sensor_options_schema(current)
        heat_pump = _heat_pump_schema(current)
        return vol.Schema({**heat_pump.schema, **sensors.schema})

    async def async_step_license(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            result = get_license_validator(self.hass).validate(
                user_input.get(CONF_LICENSE_KEY, "")
            )
            if result.status.value == "valid" and result.payload is not None:
                self._data.update(
                    {
                        CONF_LICENSE_KEY: user_input[CONF_LICENSE_KEY],
                        CONF_LICENSE_STATUS: result.status.value,
                        CONF_LICENSE_ID: result.payload.license_id,
                    }
                )
                return await self.async_step_features()
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="license", data_schema=_license_schema(), errors=errors
        )

    async def async_step_features(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if not any(
                user_input.get(key)
                for key in (
                    CONF_HEAT_PUMP_ENABLED,
                    CONF_WALLBOX_ENABLED,
                    CONF_WEATHER_INTELLIGENCE_ENABLED,
                )
            ):
                errors["base"] = "feature_required"
            elif user_input.get(
                CONF_WEATHER_INTELLIGENCE_ENABLED
            ) and not self.hass.config_entries.async_entries(WEATHER_FUSION_DOMAIN):
                errors["base"] = "weather_fusion_required"
            else:
                self._data.update(user_input)
                return await self.async_step_sensor_sources()
        defaults = dict(self._data)
        defaults.setdefault(
            CONF_WEATHER_INTELLIGENCE_ENABLED,
            bool(self.hass.config_entries.async_entries(WEATHER_FUSION_DOMAIN)),
        )
        return self.async_show_form(
            step_id="features",
            data_schema=_features_schema(defaults),
            errors=errors,
        )

    async def _async_step_after_sensor_sources(self) -> FlowResult:
        if self._data.get(CONF_HEAT_PUMP_ENABLED):
            return await self.async_step_heat_pump()
        if self._data.get(CONF_WALLBOX_ENABLED):
            return await self.async_step_wallbox()
        return await self.async_step_weather_intelligence()

    async def async_step_sensor_sources(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        candidates = discover_sensor_mapping_candidates(self.hass)
        if not candidates and user_input is None:
            return await self._async_step_after_sensor_sources()
        enabled = _source_enabled(self._data)
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                suggestions, selected = _mapping_suggestions(
                    candidates, user_input, enabled
                )
            except vol.Invalid:
                errors["base"] = "sensor_source_invalid"
            else:
                _apply_mapping_suggestions(self._data, suggestions, selected)
                return await self._async_step_after_sensor_sources()
        return self.async_show_form(
            step_id="sensor_sources",
            data_schema=_sensor_source_schema(candidates, enabled),
            errors=errors,
        )

    async def _async_step_after_optional_hardware(self) -> FlowResult:
        if self._data.get(CONF_WALLBOX_ENABLED) and (
            not self._data.get(CONF_WALLBOX_POWER_ENTITY)
            or not _has_wallbox_demand_source(self._data)
        ):
            return await self.async_step_wallbox()
        if self._data.get(CONF_WEATHER_INTELLIGENCE_ENABLED):
            return await self.async_step_weather_intelligence()
        return await self.async_step_automation_inputs()

    async def async_step_heat_pump(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                self._data.update(_validated_heat_pump_input(user_input))
            except vol.Invalid:
                errors["base"] = "invalid_heat_pump_values"
            else:
                return await self.async_step_required_sensors()
        return self.async_show_form(
            step_id="heat_pump",
            data_schema=_heat_pump_schema({**self._data, **(user_input or {})}),
            errors=errors,
        )

    async def async_step_required_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_standard_sensors()
        return self.async_show_form(
            step_id="required_sensors",
            data_schema=_entity_schema(
                REQUIRED_SENSORS, required=True, defaults=self._data
            ),
        )

    async def async_step_standard_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(
                {
                    key: value
                    for key, value in user_input.items()
                    if value not in (None, "")
                }
            )
            return await self.async_step_advanced_sensors()
        sensors = _entity_schema(
            STANDARD_SENSORS, required=False, defaults=self._data
        )
        scopes = _counter_scope_schema(self._data)
        return self.async_show_form(
            step_id="standard_sensors",
            data_schema=vol.Schema({**sensors.schema, **scopes.schema}),
        )

    async def async_step_advanced_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(
                {key: value for key, value in user_input.items() if value}
            )
            return await self._async_step_after_optional_hardware()
        return self.async_show_form(
            step_id="advanced_sensors",
            data_schema=_entity_schema(
                ADVANCED_SENSORS, required=False, defaults=self._data
            ),
        )

    async def async_step_wallbox_choice(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            enabled = bool(user_input[CONF_WALLBOX_ENABLED])
            self._data[CONF_WALLBOX_ENABLED] = enabled
            return (
                await self.async_step_wallbox()
                if enabled
                else await self.async_step_automation_inputs()
            )
        return self.async_show_form(
            step_id="wallbox_choice", data_schema=_wallbox_choice_schema()
        )

    async def async_step_wallbox(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            merged = {**self._data, **user_input}
            if merged.get(CONF_WALLBOX_POWER_ENTITY) and _has_wallbox_demand_source(
                merged
            ):
                self._data.update(user_input)
                if self._data.get(CONF_WEATHER_INTELLIGENCE_ENABLED):
                    return await self.async_step_weather_intelligence()
                return await self.async_step_automation_inputs()
            errors["base"] = "wallbox_demand_required"
        return self.async_show_form(
            step_id="wallbox",
            data_schema=_wallbox_schema(required=True, defaults=self._data),
            errors=errors,
        )

    async def async_step_weather_intelligence(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        dependency_error = _weather_dependency_error(self.hass)
        if user_input is not None:
            if dependency_error is not None:
                errors["base"] = dependency_error
            else:
                self._data.update(user_input)
                if not (
                    self._data.get(CONF_HEAT_PUMP_ENABLED)
                    or self._data.get(CONF_WALLBOX_ENABLED)
                ):
                    return await self.async_step_validation()
                return await self.async_step_automation_inputs()
        elif dependency_error is not None:
            errors["base"] = dependency_error
        return self.async_show_form(
            step_id="weather_intelligence",
            data_schema=_weather_schema(self.hass, self._data),
            errors=errors,
        )

    async def async_step_automation_inputs(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(
                {key: value for key, value in user_input.items() if value is not None}
            )
            return await self.async_step_validation()
        return self.async_show_form(
            step_id="automation_inputs", data_schema=_automation_schema()
        )

    async def async_step_validation(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        missing = _required_sensor_errors(self.hass, self._data)
        sensor_keys = (
            REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS
            if self._data.get(CONF_HEAT_PUMP_ENABLED, True)
            else ()
        )
        if self._data.get(CONF_WALLBOX_ENABLED):
            sensor_keys += WALLBOX_SENSORS
        duplicates = _has_disallowed_duplicate_assignments(self._data, sensor_keys)
        wallbox_invalid = self._data.get(CONF_WALLBOX_ENABLED) and (
            not self._data.get(CONF_WALLBOX_POWER_ENTITY)
            or not _has_wallbox_demand_source(self._data)
        )
        weather_error = (
            _weather_dependency_error(self.hass)
            if self._data.get(CONF_WEATHER_INTELLIGENCE_ENABLED)
            else None
        )
        if missing or duplicates or wallbox_invalid or weather_error:
            errors = (
                {"base": "wallbox_required"}
                if wallbox_invalid
                else {"base": "validation_required"}
            )
            if weather_error is not None:
                errors = {"base": weather_error}
            return self.async_show_form(
                step_id="validation",
                data_schema=vol.Schema({}),
                errors=errors,
                description_placeholders={
                    "missing": ", ".join(missing) or "none",
                    "duplicates": str(duplicates).lower(),
                },
            )
        self._data[CONF_CAPABILITY_LEVEL] = _capability(self._data)
        return await self.async_step_summary()

    async def async_step_summary(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is None:
            return self.async_show_form(
                step_id="summary",
                data_schema=vol.Schema({vol.Required("confirm", default=True): bool}),
                description_placeholders={
                    "license_id": self._data[CONF_LICENSE_ID],
                    "capability": self._data[CONF_CAPABILITY_LEVEL],
                },
            )
        if not user_input.get("confirm"):
            return self.async_abort(reason="not_confirmed")
        await self.async_set_unique_id("solar_forecast_eai")
        self._abort_if_unique_id_configured()
        self._data[CONF_ONBOARDING_STATE] = "configured_observation"
        return self.async_create_entry(
            title="Solar Forecast Energy AI", data=self._data
        )

    async def async_step_reauth(self, entry_data: dict[str, Any]) -> FlowResult:
        self._reauth_entry = self.hass.config_entries.async_get_entry(
            self.context["entry_id"]
        )
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            result = get_license_validator(self.hass).validate(
                user_input.get(CONF_LICENSE_KEY, "")
            )
            if result.status.value == "valid" and result.payload is not None:
                data = dict(self._reauth_entry.data)
                data.update(
                    {
                        CONF_LICENSE_KEY: user_input[CONF_LICENSE_KEY],
                        CONF_LICENSE_STATUS: "valid",
                        CONF_LICENSE_ID: result.payload.license_id,
                    }
                )
                return self.async_update_and_abort(
                    self._reauth_entry,
                    data=data,
                    reason="reauth_successful",
                )
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="reauth_confirm", data_schema=_license_schema(), errors=errors
        )


class SolarForecastEAIOptionsFlow(config_entries.OptionsFlow):
    async def _async_finish_feature_sequence(self) -> FlowResult:
        pending = getattr(self, "_pending_feature_steps", [])
        if pending:
            return await getattr(self, f"async_step_{pending.pop(0)}")()
        return self.async_create_entry(title="", data=self._options)

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        self._options = dict(self.config_entry.options)
        if user_input is not None:
            choice = user_input["section"]
            return await getattr(self, f"async_step_{choice}")()
        return self.async_show_menu(
            step_id="init",
            menu_options=[
                "license",
                "features",
                "sensor_sources",
                "heat_pump",
                "sensors",
                "wallbox",
                "weather_intelligence",
                "automation",
            ],
        )

    async def async_step_features(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            if not any(user_input.values()):
                errors["base"] = "feature_required"
            elif user_input.get(
                CONF_WEATHER_INTELLIGENCE_ENABLED
            ) and not self.hass.config_entries.async_entries(WEATHER_FUSION_DOMAIN):
                errors["base"] = "weather_fusion_required"
            else:
                previous = {**self.config_entry.data, **self._options}
                self._options.update(user_input)
                merged = {**self.config_entry.data, **self._options}
                self._pending_feature_steps = ["sensor_sources"]
                if merged.get(CONF_HEAT_PUMP_ENABLED):
                    if not previous.get(CONF_HEAT_PUMP_ENABLED):
                        self._pending_feature_steps.append("heat_pump")
                    if not previous.get(
                        CONF_HEAT_PUMP_ENABLED
                    ) or _required_sensor_errors(self.hass, merged):
                        self._pending_feature_steps.append("sensors")
                if merged.get(CONF_WALLBOX_ENABLED) and (
                    not merged.get(CONF_WALLBOX_POWER_ENTITY)
                    or not _has_wallbox_demand_source(merged)
                ):
                    self._pending_feature_steps.append("wallbox")
                weather_entry_ids = {
                    entry.entry_id
                    for entry in self.hass.config_entries.async_entries(
                        WEATHER_FUSION_DOMAIN
                    )
                }
                if (
                    merged.get(CONF_WEATHER_INTELLIGENCE_ENABLED)
                    and merged.get(CONF_WEATHER_FUSION_ENTRY_ID)
                    not in weather_entry_ids
                ):
                    self._pending_feature_steps.append("weather_intelligence")
                return await self._async_finish_feature_sequence()
        return self.async_show_form(
            step_id="features",
            data_schema=_features_schema({**self.config_entry.data, **self._options}),
            errors=errors,
        )

    async def async_step_sensor_sources(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        current = {**self.config_entry.data, **self._options}
        candidates = discover_sensor_mapping_candidates(self.hass)
        if not candidates and user_input is None:
            return await self._async_finish_feature_sequence()
        enabled = _source_enabled(current)
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                suggestions, selected = _mapping_suggestions(
                    candidates, user_input, enabled
                )
            except vol.Invalid:
                errors["base"] = "sensor_source_invalid"
            else:
                _apply_mapping_suggestions(
                    self._options,
                    suggestions,
                    selected,
                    existing=current,
                )
                pending = getattr(self, "_pending_feature_steps", [])
                review_steps: list[str] = []
                if selected & {"environment", "heat_pump"} and "sensors" not in pending:
                    review_steps.append("sensors")
                if "wallbox" in selected and "wallbox" not in pending:
                    review_steps.append("wallbox")
                self._pending_feature_steps = review_steps + pending
                return await self._async_finish_feature_sequence()
        return self.async_show_form(
            step_id="sensor_sources",
            data_schema=_sensor_source_schema(candidates, enabled),
            errors=errors,
        )

    async def async_step_license(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            result = get_license_validator(self.hass).validate(
                user_input.get(CONF_LICENSE_KEY, "")
            )
            if result.status.value == "valid" and result.payload is not None:
                data = dict(self.config_entry.data)
                data.update(
                    {
                        CONF_LICENSE_KEY: user_input[CONF_LICENSE_KEY],
                        CONF_LICENSE_STATUS: "valid",
                        CONF_LICENSE_ID: result.payload.license_id,
                    }
                )
                self.hass.config_entries.async_update_entry(
                    self.config_entry, data=data
                )
                return self.async_create_entry(title="", data=self._options)
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="license", data_schema=_license_schema(), errors=errors
        )

    async def async_step_heat_pump(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                validated = _validated_heat_pump_input(user_input)
            except vol.Invalid:
                errors["base"] = "invalid_heat_pump_values"
            else:
                _replace_options(
                    self._options, validated, HEAT_PUMP_OPTION_KEYS
                )
                _mask_disabled_heating_element(self._options, validated)
                return await self._async_finish_feature_sequence()
        return self.async_show_form(
            step_id="heat_pump",
            data_schema=_heat_pump_schema(
                {
                    **self.config_entry.data,
                    **self._options,
                    **(user_input or {}),
                }
            ),
            errors=errors,
        )

    async def async_step_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            proposed = dict(self._options)
            _replace_options(
                proposed,
                user_input,
                REQUIRED_SENSORS
                + STANDARD_SENSORS
                + ADVANCED_SENSORS
                + (CONF_RUNTIME_COUNTER_SCOPE, CONF_STARTS_COUNTER_SCOPE),
            )
            merged = {**self.config_entry.data, **proposed}
            sensor_keys = REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS
            if _required_sensor_errors(self.hass, merged) or (
                merged.get(CONF_HEAT_PUMP_ENABLED, True)
                and _has_disallowed_duplicate_assignments(merged, sensor_keys)
            ):
                errors["base"] = "validation_required"
            else:
                proposed[CONF_CAPABILITY_LEVEL] = _capability(merged)
                self._options = proposed
                return await self._async_finish_feature_sequence()
        return self.async_show_form(
            step_id="sensors",
            data_schema=_sensor_options_schema(
                {**self.config_entry.data, **self._options}
            ),
            errors=errors,
        )

    async def async_step_automation(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            _replace_options(
                self._options,
                user_input,
                (
                    CONF_ELECTRICITY_PRICE_ENTITY,
                    CONF_ELECTRICITY_PRICE_UNIT,
                    CONF_FEED_IN_TARIFF_ENTITY,
                    CONF_FEED_IN_TARIFF_UNIT,
                    CONF_LOW_PRICE_THRESHOLD_CT,
                ),
            )
            return self.async_create_entry(title="", data=self._options)
        return self.async_show_form(
            step_id="automation",
            data_schema=_automation_schema({**self.config_entry.data, **self._options}),
        )

    async def async_step_weather_intelligence(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        dependency_error = _weather_dependency_error(self.hass)
        if user_input is not None:
            if dependency_error is not None:
                errors["base"] = dependency_error
            else:
                _replace_options(
                    self._options,
                    user_input,
                    (CONF_WEATHER_FUSION_ENTRY_ID, CONF_WEATHER_HISTORY_DAYS),
                )
                return await self._async_finish_feature_sequence()
        elif dependency_error is not None:
            errors["base"] = dependency_error
        return self.async_show_form(
            step_id="weather_intelligence",
            data_schema=_weather_schema(
                self.hass, {**self.config_entry.data, **self._options}
            ),
            errors=errors,
        )

    async def async_step_wallbox(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            merged = {**self.config_entry.data, **self._options, **user_input}
            if user_input.get(CONF_WALLBOX_ENABLED) and (
                not merged.get(CONF_WALLBOX_POWER_ENTITY)
                or not _has_wallbox_demand_source(merged)
            ):
                errors["base"] = "wallbox_required"
            else:
                self._options[CONF_WALLBOX_ENABLED] = bool(
                    user_input.get(CONF_WALLBOX_ENABLED)
                )
                if self._options[CONF_WALLBOX_ENABLED]:
                    _replace_options(self._options, user_input, WALLBOX_OPTION_KEYS)
                else:
                    for key in WALLBOX_OPTION_KEYS:
                        # Explicitly mask legacy values from ConfigEntry.data.
                        self._options[key] = None
                return await self._async_finish_feature_sequence()
        return self.async_show_form(
            step_id="wallbox",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_WALLBOX_ENABLED,
                        default=bool(
                            self._options.get(
                                CONF_WALLBOX_ENABLED,
                                self.config_entry.data.get(CONF_WALLBOX_ENABLED, False),
                            )
                        ),
                    ): bool,
                    **_wallbox_schema(
                        required=False,
                        defaults={**self.config_entry.data, **self._options},
                    ).schema,
                }
            ),
            errors=errors,
        )
