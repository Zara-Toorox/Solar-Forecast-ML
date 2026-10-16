# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""External grid meter: an existing Home Assistant meter published as S-INV grid roles. @zara

Offered per S-INV instance when the system has no grid meter of its own, and for
one instance only (the grid meter belongs to the whole installation). The source
entities stay owned by their integration (Shelly, Tibber, ESPHome, ...); S-INV
normalizes unit and sign and publishes ``power_grid``, ``power_grid_import``,
``power_grid_export`` and the energy counters.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_state_change_event

from . import contract
from .const import DOMAIN
from .entity import assign_role_identity

CONF_EXT_POWER = "ext_grid_power"
CONF_EXT_SIGN = "ext_grid_power_sign"
CONF_EXT_IMPORT = "ext_grid_import_power"
CONF_EXT_EXPORT = "ext_grid_export_power"
CONF_EXT_IMPORT_ENERGY = "ext_grid_import_energy"
CONF_EXT_EXPORT_ENERGY = "ext_grid_export_energy"
EXT_KEYS = (
    CONF_EXT_POWER,
    CONF_EXT_SIGN,
    CONF_EXT_IMPORT,
    CONF_EXT_EXPORT,
    CONF_EXT_IMPORT_ENERGY,
    CONF_EXT_EXPORT_ENERGY,
)
SIGN_IMPORT = "positive_import"
SIGN_EXPORT = "positive_export"
GRID_ROLES = frozenset({"power_grid", "power_grid_import", "power_grid_export"})
SOURCE_ATTR = "sinv_source"

_POWER_FACTOR = {"w": 1.0, "kw": 1000.0, "mw": 1_000_000.0}
_ENERGY_FACTOR = {"wh": 0.001, "kwh": 1.0, "mwh": 1000.0}

# Options snapshot applied at setup, per config entry, to decide reloads on option changes.
_APPLIED: dict[str, dict[str, Any] | None] = {}


def meter_config(options: Mapping[str, Any]) -> dict[str, Any] | None:
    """Return the external meter configuration of an entry, or None when unused. @zara"""
    config = {key: options.get(key) for key in EXT_KEYS if options.get(key)}
    if not any(
        config.get(key) for key in (CONF_EXT_POWER, CONF_EXT_IMPORT, CONF_EXT_EXPORT)
    ):
        return None
    if config.get(CONF_EXT_POWER):
        config.setdefault(CONF_EXT_SIGN, SIGN_IMPORT)
    return config


def validate_config(user_input: Mapping[str, Any]) -> str | None:
    """Return an error key for an inconsistent selection, None when valid. @zara"""
    signed = bool(user_input.get(CONF_EXT_POWER))
    split = bool(user_input.get(CONF_EXT_IMPORT) or user_input.get(CONF_EXT_EXPORT))
    if signed and split:
        return "ext_meter_both_modes"
    if user_input.get(CONF_EXT_SIGN) not in (None, "", SIGN_IMPORT, SIGN_EXPORT):
        return "ext_meter_sign"
    return None


def _number(state: Any) -> float | None:
    if state is None:
        return None
    try:
        return float(getattr(state, "state", None))
    except (TypeError, ValueError):
        return None


def _unit(state: Any) -> str:
    attributes = getattr(state, "attributes", None)
    if not isinstance(attributes, Mapping):
        return ""
    return str(attributes.get("unit_of_measurement") or "").replace(" ", "").lower()


def power_w(state: Any) -> float | None:
    """Return the power of a state in W; None for unknown values or non-power units. @zara"""
    value = _number(state)
    factor = _POWER_FACTOR.get(_unit(state))
    return None if value is None or factor is None else value * factor


def energy_kwh(state: Any) -> float | None:
    """Return the energy of a state in kWh; None for unknown values or non-energy units. @zara"""
    value = _number(state)
    factor = _ENERGY_FACTOR.get(_unit(state))
    return None if value is None or factor is None else value * factor


def grid_values(get_state, config: Mapping[str, Any]) -> dict[str, float | None]:
    """Return the normalized grid roles from the configured source states. @zara

    ``get_state`` maps an entity_id to a state object (``hass.states.get``).
    """
    values: dict[str, float | None] = {}
    if source := config.get(CONF_EXT_POWER):
        raw = power_w(get_state(source))
        signed = (
            None
            if raw is None
            else (raw if config.get(CONF_EXT_SIGN) != SIGN_EXPORT else -raw)
        )
        values["power_grid"] = signed
        values["power_grid_import"] = None if signed is None else max(0.0, signed)
        values["power_grid_export"] = None if signed is None else max(0.0, -signed)
    else:
        imported = (
            power_w(get_state(config[CONF_EXT_IMPORT]))
            if config.get(CONF_EXT_IMPORT)
            else None
        )
        exported = (
            power_w(get_state(config[CONF_EXT_EXPORT]))
            if config.get(CONF_EXT_EXPORT)
            else None
        )
        if config.get(CONF_EXT_IMPORT):
            values["power_grid_import"] = None if imported is None else abs(imported)
        if config.get(CONF_EXT_EXPORT):
            values["power_grid_export"] = None if exported is None else abs(exported)
        if config.get(CONF_EXT_IMPORT) and config.get(CONF_EXT_EXPORT):
            values["power_grid"] = (
                None
                if imported is None or exported is None
                else abs(imported) - abs(exported)
            )
    if source := config.get(CONF_EXT_IMPORT_ENERGY):
        values["energy_grid_import_total"] = energy_kwh(get_state(source))
    if source := config.get(CONF_EXT_EXPORT_ENERGY):
        values["energy_grid_export_total"] = energy_kwh(get_state(source))
    return values


def role_sources(config: Mapping[str, Any]) -> dict[str, list[str]]:
    """Return the source entity ids per published role. @zara"""
    sources: dict[str, list[str]] = {}
    if source := config.get(CONF_EXT_POWER):
        for role in GRID_ROLES:
            sources[role] = [source]
    else:
        if source := config.get(CONF_EXT_IMPORT):
            sources["power_grid_import"] = [source]
        if source := config.get(CONF_EXT_EXPORT):
            sources["power_grid_export"] = [source]
        if config.get(CONF_EXT_IMPORT) and config.get(CONF_EXT_EXPORT):
            sources["power_grid"] = [config[CONF_EXT_IMPORT], config[CONF_EXT_EXPORT]]
    if source := config.get(CONF_EXT_IMPORT_ENERGY):
        sources["energy_grid_import_total"] = [source]
    if source := config.get(CONF_EXT_EXPORT_ENERGY):
        sources["energy_grid_export_total"] = [source]
    return sources


def meter_serial(entry_id: str) -> str:
    """Return the pseudo serial of the external meter device of an entry. @zara"""
    return f"external_meter_{entry_id.lower()}"


@callback
def has_native_grid_meter(hass: HomeAssistant, entry_id: str) -> bool:
    """Return True when this entry already publishes grid roles from its own hardware. @zara"""
    own = meter_serial(entry_id)
    registry = er.async_get(hass)
    for entity in er.async_entries_for_config_entry(registry, entry_id):
        parsed = contract.parse_unique_id(entity.unique_id)
        if parsed and parsed.get("role") in GRID_ROLES and parsed["serial"] != own:
            return True
    return False


@callback
def used_by_other_entry(hass: HomeAssistant, entry_id: str) -> bool:
    """Return True when another S-INV instance already uses an external grid meter. @zara"""
    return any(
        meter_config(other.options) is not None
        for other in hass.config_entries.async_entries(DOMAIN)
        if other.entry_id != entry_id
    )


def remember_applied(entry: ConfigEntry) -> None:
    """Record the external meter options this setup applies (call first in setup). @zara"""
    _APPLIED[entry.entry_id] = meter_config(entry.options)


def config_changed(entry: ConfigEntry) -> bool:
    """Return True when the external meter options differ from those applied at setup. @zara"""
    return _APPLIED.get(entry.entry_id) != meter_config(entry.options)


async def async_setup_external_meter(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Create the external meter entities of an entry, if configured. @zara"""
    config = _APPLIED.get(entry.entry_id, meter_config(entry.options))
    if config is None:
        return
    async_add_entities(
        ExternalMeterSensor(entry, config, role, sources)
        for role, sources in role_sources(config).items()
    )


class ExternalMeterSensor(SensorEntity):
    """One grid role computed from a meter entity of another integration. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self,
        entry: ConfigEntry,
        config: Mapping[str, Any],
        role: str,
        sources: list[str],
    ) -> None:
        """Bind the role to its source entities. @zara"""
        spec, _channel = contract.split_role(role)
        self._config = dict(config)
        self._role = role
        self._sources = sources
        self._serial = meter_serial(entry.entry_id)
        self._attr_unique_id = contract.role_unique_id(self._serial, role)
        self._attr_translation_key = f"sinv_{spec.base}"
        self._attr_native_unit_of_measurement = spec.unit
        self._attr_device_class = SensorDeviceClass(spec.device_class)
        self._attr_state_class = SensorStateClass(spec.state_class)
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, self._serial)},
            translation_key="external_grid_meter",
            manufacturer="Home Assistant",
            model="External grid meter",
        )
        self._sinv_index = 1

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Suggest the normative entity_id before core registers the entity. @zara"""
        suggestion, self._sinv_index = assign_role_identity(
            hass, platform.domain, self._serial, self._role, self.unique_id
        )
        if suggestion is not None:
            self.entity_id = suggestion
        super().add_to_platform_start(hass, platform, parallel_updates)

    async def async_added_to_hass(self) -> None:
        """Follow the source entities. @zara"""

        @callback
        def changed(_event: Event) -> None:
            self.async_write_ha_state()

        self.async_on_remove(
            async_track_state_change_event(self.hass, self._sources, changed)
        )

    @property
    def native_value(self) -> float | None:
        """Normalized value of the role. @zara"""
        value = grid_values(self.hass.states.get, self._config).get(self._role)
        if value is None:
            return None
        return round(value, 3 if self._role.startswith("energy") else 0)

    @property
    def available(self) -> bool:
        """Available while the sources report a usable value. @zara"""
        return self.native_value is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract attributes plus the source entity ids. @zara"""
        attributes: dict[str, Any] = {
            contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
            contract.ATTR_ROLE: self._role,
            contract.ATTR_DEVICE_INDEX: self._sinv_index,
            contract.ATTR_VENDOR: "external",
            SOURCE_ATTR: self._sources if len(self._sources) > 1 else self._sources[0],
        }
        if self._role in (
            "power_grid_import",
            "power_grid_export",
        ) and self._config.get(CONF_EXT_POWER):
            attributes[contract.ATTR_DERIVED] = True
        if self._role == "power_grid" and not self._config.get(CONF_EXT_POWER):
            attributes[contract.ATTR_DERIVED] = True
        return attributes
