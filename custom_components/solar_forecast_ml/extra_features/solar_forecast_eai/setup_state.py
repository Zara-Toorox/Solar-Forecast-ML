"""Tri-state configuration access and hydraulics completeness."""

from __future__ import annotations

from enum import Enum
from typing import Any, NamedTuple

from .const import (
    CONF_COP_RATED,
    CONF_COP_RATED_CONFIRMED,
    CONF_DATA_QUALITY_TIER,
    CONF_DESIGN_FLOW_TEMP_C,
    CONF_DHW_DAILY_DRAW_L,
    CONF_DHW_STORAGE_MAX_C,
    CONF_DHW_TAP_MAX_C,
    CONF_DHW_TARGET_C,
    CONF_DHW_TEMP_ENTITY,
    CONF_DHW_TOPOLOGY,
    CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY,
    CONF_HAS_CIRCULATION,
    CONF_HAS_DHW,
    CONF_HAS_HEATING_BUFFER,
    CONF_HAS_HEATING_ELEMENT,
    CONF_HEAT_PUMP_ENABLED,
    CONF_HEATING_CAPACITY_CONFIRMED,
    CONF_HEATING_CAPACITY_KW,
    CONF_HEATING_CIRCUIT_CONTROL,
    CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
    CONF_HYDRAULICS_ANSWERED,
    CONF_STORAGE_TEMP_ENTITY,
    CONF_STORAGE_VOLUME_L,
    CONF_WALLBOX_ENERGY_TODAY_ENTITY,
    CONF_WP_ENERGY_TODAY,
    COP_MODE_DHW,
    COP_MODE_HEATING,
    DEFAULT_COP_RATED,
    DEFAULT_HEATING_CAPACITY_KW,
    DHW_DAILY_DRAW_L_MAX,
    DHW_DAILY_DRAW_L_MIN,
    DHW_QUANTITY_STORAGE,
    DHW_QUANTITY_TAP,
    DHW_TOPOLOGY_FRESH_WATER,
    DHW_TOPOLOGY_NONE,
    ENERGY_TODAY_STATE_CLASS_FORBIDDEN,
    ISSUE_HYDRAULICS_SETUP_INCOMPLETE,
    SUPPORTED_DATA_QUALITY_TIERS,
    SUPPORTED_DHW_TOPOLOGIES,
    SUPPORTED_ELECTRICAL_TOPOLOGIES,
    SUPPORTED_HEATING_CIRCUIT_CONTROLS,
)

TRUE_VALUES = {True, "true", "1", "yes", "on"}
FALSE_VALUES = {False, "false", "0", "no", "off"}
ENERGY_TODAY_KEYS = frozenset(
    {
        CONF_WP_ENERGY_TODAY,
        CONF_HEATING_ELEMENT_ENERGY_TODAY_ENTITY,
        CONF_WALLBOX_ENERGY_TODAY_ENTITY,
    }
)
POWER_UNITS = {"w", "kw", "mw"}
ENERGY_UNITS = {"wh", "kwh", "mwh"}
TEMPERATURE_UNITS = {"°c", "c", "°f", "f", "k"}


class TriState(Enum):
    TRUE = "true"
    FALSE = "false"
    UNANSWERED = "unanswered"


class DhwLimit(NamedTuple):
    limit_c: float
    quantity: str


def tri_state(config: dict[str, Any], key: str) -> TriState:
    """Read a boolean config key without collapsing a missing answer."""
    if key not in config:
        return TriState.UNANSWERED
    value = config[key]
    if value is None or value == "":
        return TriState.UNANSWERED
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in TRUE_VALUES:
            return TriState.TRUE
        if normalized in FALSE_VALUES:
            return TriState.FALSE
        return TriState.UNANSWERED
    if isinstance(value, bool):
        return TriState.TRUE if value else TriState.FALSE
    if isinstance(value, (int, float)) and value in {0, 1}:
        return TriState.TRUE if value else TriState.FALSE
    return TriState.UNANSWERED


def is_true(config: dict[str, Any], key: str) -> bool:
    return tri_state(config, key) is TriState.TRUE


def is_false(config: dict[str, Any], key: str) -> bool:
    return tri_state(config, key) is TriState.FALSE


def is_unanswered(config: dict[str, Any], key: str) -> bool:
    return tri_state(config, key) is TriState.UNANSWERED


def looks_like_shipping_default(value: Any, default: float) -> bool:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return False
    return abs(parsed - float(default)) < 1e-9


def _choice(config: dict[str, Any], key: str, allowed: frozenset[str]) -> str | None:
    value = config.get(key)
    return value if isinstance(value, str) and value in allowed else None


def dhw_topology(config: dict[str, Any]) -> str | None:
    if is_false(config, CONF_HAS_DHW):
        return DHW_TOPOLOGY_NONE
    return _choice(config, CONF_DHW_TOPOLOGY, SUPPORTED_DHW_TOPOLOGIES)


def active_dhw_limit_c(config: dict[str, Any]) -> DhwLimit | None:
    """Return the DHW ceiling and the quantity it applies to."""
    topology = dhw_topology(config)
    if topology in {None, DHW_TOPOLOGY_NONE}:
        return None
    tap = _finite_temperature(config.get(CONF_DHW_TAP_MAX_C))
    storage = _finite_temperature(config.get(CONF_DHW_STORAGE_MAX_C))
    if topology == DHW_TOPOLOGY_FRESH_WATER:
        return DhwLimit(tap, DHW_QUANTITY_TAP) if tap is not None else None
    if storage is not None:
        return DhwLimit(storage, DHW_QUANTITY_STORAGE)
    if tap is not None:
        return DhwLimit(tap, DHW_QUANTITY_STORAGE)
    return None


def _dhw_storage_entities_aliased(config: dict[str, Any]) -> bool:
    dhw_entity = config.get(CONF_DHW_TEMP_ENTITY)
    storage_entity = config.get(CONF_STORAGE_TEMP_ENTITY)
    return bool(dhw_entity) and dhw_entity == storage_entity


def _tap_limit_is_enforceable(config: dict[str, Any]) -> bool:
    """Whether a tap ceiling can actually be compared against a measurement.

    A fresh-water station rarely exposes its outlet temperature, and the store
    sensor may legitimately be assigned to both temperature keys. Without either
    a dedicated tap sensor or a storage ceiling to fall back on, every
    recommendation would be blocked as dhw_limit_quantity_mismatch with no way
    for the user to find out what is missing.
    """
    has_tap_sensor = bool(
        config.get(CONF_DHW_TEMP_ENTITY)
    ) and not _dhw_storage_entities_aliased(config)
    if has_tap_sensor:
        return True
    return _finite_temperature(config.get(CONF_DHW_STORAGE_MAX_C)) is not None


def _measured_for_quantity(
    quantity: str,
    dhw_temp_c: float | None,
    storage_temp_c: float | None,
    *,
    aliased: bool,
) -> float | None:
    if quantity == DHW_QUANTITY_TAP:
        return None if aliased else dhw_temp_c
    if storage_temp_c is not None:
        return storage_temp_c
    return dhw_temp_c


def _finite_temperature(value: Any) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not 20.0 <= parsed <= 95.0:
        return None
    return parsed


def design_flow_temp_c(config: dict[str, Any]) -> float | None:
    """Return a configured heating design-flow temperature, or None if missing."""
    value = _finite_temperature(config.get(CONF_DESIGN_FLOW_TEMP_C))
    if value is None or not 25.0 <= value <= 75.0:
        return None
    return value


def normalize_operation_mode(value: Any) -> str | None:
    """Map a live operating-mode reading onto the COP heating/DHW cascade."""
    if value in {COP_MODE_HEATING, COP_MODE_DHW}:
        return str(value)
    text = str(value or "").strip().lower()
    if not text:
        return None
    if any(
        token in text
        for token in (
            "dhw",
            "domestic",
            "warmwasser",
            "warm water",
            "hot_water",
            "hot water",
        )
    ):
        return COP_MODE_DHW
    if any(token in text for token in ("heat", "heiz")):
        return COP_MODE_HEATING
    return None


def cop_sink_kwargs(
    config: dict[str, Any],
    *,
    flow_temp: float | None = None,
    operation_mode: Any = None,
) -> dict[str, Any]:
    """Build evaluate_cop kwargs from config plus live flow/mode readings."""
    return {
        "flow_temp": _finite_temperature(flow_temp),
        "mode": normalize_operation_mode(operation_mode),
        "dhw_setpoint": _finite_temperature(config.get(CONF_DHW_TARGET_C)),
        "design_flow_temp": design_flow_temp_c(config),
    }


def storage_volume_l(config: dict[str, Any]) -> float | None:
    """Return a configured DHW storage volume, or None if missing."""
    try:
        parsed = float(config.get(CONF_STORAGE_VOLUME_L))
    except (TypeError, ValueError):
        return None
    if not 20.0 <= parsed <= 5000.0:
        return None
    return parsed


def dhw_daily_draw_l(config: dict[str, Any]) -> float | None:
    """Return the household daily DHW tap volume, or None if missing."""
    try:
        parsed = float(config.get(CONF_DHW_DAILY_DRAW_L))
    except (TypeError, ValueError):
        return None
    if not DHW_DAILY_DRAW_L_MIN <= parsed <= DHW_DAILY_DRAW_L_MAX:
        return None
    return parsed


def dhw_forecast_kwargs(config: dict[str, Any]) -> dict[str, Any]:
    """Build DHW demand kwargs for the thermodynamics hourly model."""
    return {
        "has_dhw": is_true(config, CONF_HAS_DHW),
        "storage_volume_l": storage_volume_l(config),
        "dhw_daily_draw_l": dhw_daily_draw_l(config),
        "has_circulation": is_true(config, CONF_HAS_CIRCULATION),
    }


def hydraulics_setup_incomplete(config: dict[str, Any]) -> bool:
    """Return whether heat-pump hydraulics still need an explicit answer."""
    if is_false(config, CONF_HEAT_PUMP_ENABLED):
        return False
    if config.get(CONF_HYDRAULICS_ANSWERED) is not True:
        return True
    if is_unanswered(config, CONF_HAS_DHW):
        return True
    if is_unanswered(config, CONF_HAS_HEATING_ELEMENT):
        return True
    if _choice(
        config, CONF_ELECTRICAL_MEASUREMENT_TOPOLOGY, SUPPORTED_ELECTRICAL_TOPOLOGIES
    ) is None:
        return True
    if _choice(
        config, CONF_HEATING_CIRCUIT_CONTROL, SUPPORTED_HEATING_CIRCUIT_CONTROLS
    ) is None:
        return True
    if is_unanswered(config, CONF_HAS_HEATING_BUFFER):
        return True
    if is_true(config, CONF_HAS_DHW):
        topology = dhw_topology(config)
        if topology in {None, DHW_TOPOLOGY_NONE}:
            return True
        limit = active_dhw_limit_c(config)
        if limit is None:
            return True
        if limit.quantity == DHW_QUANTITY_TAP and not _tap_limit_is_enforceable(config):
            return True
        if dhw_daily_draw_l(config) is None:
            return True
        if is_unanswered(config, CONF_HAS_CIRCULATION):
            return True
    if _choice(config, CONF_DATA_QUALITY_TIER, SUPPORTED_DATA_QUALITY_TIERS) is None:
        return True
    if design_flow_temp_c(config) is None:
        return True
    if config.get(CONF_COP_RATED_CONFIRMED) is False:
        return True
    if config.get(CONF_HEATING_CAPACITY_CONFIRMED) is False:
        return True
    return False


def mark_shipping_defaults_unconfirmed(config: dict[str, Any]) -> dict[str, Any]:
    """Flag 44.0.6 placeholder COP/capacity values as unconfirmed."""
    updated = dict(config)
    cop = updated.get(CONF_COP_RATED)
    if cop is None or cop == "":
        updated.pop(CONF_COP_RATED_CONFIRMED, None)
    elif looks_like_shipping_default(cop, DEFAULT_COP_RATED):
        updated[CONF_COP_RATED_CONFIRMED] = False
    else:
        updated[CONF_COP_RATED_CONFIRMED] = True
    capacity = updated.get(CONF_HEATING_CAPACITY_KW)
    if capacity is None or capacity == "":
        updated.pop(CONF_HEATING_CAPACITY_CONFIRMED, None)
    elif looks_like_shipping_default(capacity, DEFAULT_HEATING_CAPACITY_KW):
        updated[CONF_HEATING_CAPACITY_CONFIRMED] = False
    else:
        updated[CONF_HEATING_CAPACITY_CONFIRMED] = True
    return updated


def mark_heat_pump_values_confirmed(config: dict[str, Any]) -> dict[str, Any]:
    """Record that the user submitted the heat-pump form."""
    updated = dict(config)
    if updated.get(CONF_COP_RATED) not in (None, ""):
        updated[CONF_COP_RATED_CONFIRMED] = True
    if updated.get(CONF_HEATING_CAPACITY_KW) not in (None, ""):
        updated[CONF_HEATING_CAPACITY_CONFIRMED] = True
    return updated


def apply_recommendation_choke(
    config: dict[str, Any],
    action: str,
    reason: str,
    *,
    dhw_temp_c: float | None = None,
    storage_temp_c: float | None = None,
) -> tuple[str, str]:
    """Hard stop for every DHW/storage recommendation."""
    if action not in {"dhw", "thermal_storage"}:
        return action, reason
    dhw = tri_state(config, CONF_HAS_DHW)
    if dhw is TriState.UNANSWERED:
        return "none", "dhw_unanswered"
    if dhw is TriState.FALSE:
        return "none", "dhw_disabled"
    if hydraulics_setup_incomplete(config):
        return "none", "hydraulics_setup_incomplete"
    limit = active_dhw_limit_c(config)
    if limit is None:
        return "none", "dhw_limit_unanswered"
    aliased = _dhw_storage_entities_aliased(config)
    measured = _measured_for_quantity(
        limit.quantity, dhw_temp_c, storage_temp_c, aliased=aliased
    )
    if measured is None and limit.quantity == DHW_QUANTITY_TAP:
        storage_limit = _finite_temperature(config.get(CONF_DHW_STORAGE_MAX_C))
        storage_measured = _measured_for_quantity(
            DHW_QUANTITY_STORAGE, dhw_temp_c, storage_temp_c, aliased=aliased
        )
        if storage_limit is None or storage_measured is None:
            return "none", "dhw_limit_quantity_mismatch"
        if storage_measured >= storage_limit:
            return "none", "dhw_max_reached"
        return action, reason
    if measured is None:
        return "none", "dhw_limit_quantity_mismatch"
    if measured >= limit.limit_c:
        return "none", "dhw_max_reached"
    return action, reason


def entity_assignment_error(
    state: Any | None, key: str, *, required: bool = False
) -> str | None:
    """Return a translation key when an assigned entity is the wrong kind of data."""
    if state is None:
        return "required" if required else None
    status = str(getattr(state, "state", "")).strip().lower()
    if status in {"unknown", "unavailable", "none", ""}:
        return None
    attributes = getattr(state, "attributes", None) or {}
    unit = str(attributes.get("unit_of_measurement") or "").strip().lower()
    state_class = str(attributes.get("state_class") or "").strip().lower()
    if key in ENERGY_TODAY_KEYS:
        if unit and unit not in ENERGY_UNITS:
            return "invalid_energy_unit"
        if state_class == ENERGY_TODAY_STATE_CLASS_FORBIDDEN:
            return "energy_today_not_daily"
        return None
    if key.endswith("_power_entity") or key == "wp_power_entity":
        if unit and unit not in POWER_UNITS:
            return "invalid_power_unit"
        return None
    if "temp" in key:
        if unit and unit not in TEMPERATURE_UNITS:
            return "invalid_temperature_unit"
    return None


def issue_id_for_entry(entry_id: str) -> str:
    return f"{ISSUE_HYDRAULICS_SETUP_INCOMPLETE}_{entry_id}"


def recommendation_temperature(
    hass: Any, config: dict[str, Any], key: str
) -> float | None:
    entity_id = config.get(key)
    if not entity_id or hass is None:
        return None
    state = hass.states.get(entity_id)
    if state is None:
        return None
    try:
        return float(state.state)
    except (TypeError, ValueError):
        return None


def current_dhw_temperatures(
    hass: Any, config: dict[str, Any]
) -> tuple[float | None, float | None]:
    return (
        recommendation_temperature(hass, config, CONF_DHW_TEMP_ENTITY),
        recommendation_temperature(hass, config, CONF_STORAGE_TEMP_ENTITY),
    )
