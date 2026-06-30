# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""
Warp Core V16.2.0 - Containment Configuration Flow.

Configuration Flow and Options Flow for Holodeck Assistant integration setup.
Nacelle groups are required (min 1, max 4 warp nacelles per core).
Configures antimatter injection rates, cochrane field thresholds,
and subspace sensor array calibration parameters.

@starfleet-engineering
"""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import (
    OptionsFlowWithReload,
    SOURCE_RECONFIGURE,
)
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_ADAPTIVE_FORECAST_MODE,
    CONF_DIAGNOSTIC,
    CONF_ENABLE_TINY_LSTM,
    CONF_EVCC_FORECAST,
    CONF_HAS_BATTERY,
    CONF_HOURLY,
    CONF_HUMIDITY_SENSOR,
    CONF_INVERTER_MAX_POWER,
    CONF_LUX_SENSOR,
    CONF_MAX_GRID_EXPORT_W,
    CONF_ML_ALGORITHM,
    CONF_NOTIFY_FORECAST,
    CONF_NOTIFY_FOG,
    CONF_NOTIFY_FROST,
    CONF_NOTIFY_LEARNING,
    CONF_NOTIFY_SNOW_COVERED,
    CONF_NOTIFY_STARTUP,
    CONF_NOTIFY_SUCCESSFUL_LEARNING,
    CONF_NOTIFY_WEATHER_ALERT,
    CONF_PANEL_GROUP_AZIMUTH,
    CONF_PANEL_GROUP_NAME,
    CONF_PANEL_GROUP_POWER,
    CONF_PANEL_GROUP_POWER_SENSOR,
    CONF_PANEL_GROUP_TILT,
    CONF_PANEL_GROUPS,
    CONF_PIRATE_WEATHER_API_KEY,
    CONF_PRESSURE_SENSOR,
    CONF_RAIN_SENSOR,
    CONF_SOLAR_CAPACITY,
    CONF_SOLAR_RADIATION_SENSOR,
    CONF_SOLAR_TO_BATTERY_SENSOR,
    CONF_TEMP_SENSOR,
    CONF_TOTAL_CONSUMPTION_TODAY,
    CONF_UPDATE_INTERVAL,
    CONF_WIND_SENSOR,
    CONF_WINTER_MODE,
    CONF_ZERO_EXPORT_MODE,
    DEFAULT_ADAPTIVE_FORECAST_MODE,
    DEFAULT_ENABLE_TINY_LSTM,
    DEFAULT_HAS_BATTERY,
    DEFAULT_INVERTER_MAX_POWER,
    DEFAULT_MAX_GRID_EXPORT_W,
    DEFAULT_ML_ALGORITHM,
    DEFAULT_PANEL_AZIMUTH,
    DEFAULT_PANEL_TILT,
    DEFAULT_SOLAR_CAPACITY,
    DEFAULT_WINTER_MODE,
    DEFAULT_ZERO_EXPORT_MODE,
    DOMAIN,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)


def _get_default(data: dict | None, key: str, default: Any = vol.UNDEFINED):
    """Safely get default value for schema. @zara"""
    if data is None:
        return default
    value = data.get(key)
    return value if value is not None and value != "" else default


def _get_base_schema(defaults: dict | None, is_reconfigure: bool = False) -> vol.Schema:
    """Returns the base schema for user and reconfigure steps. @zara

    Args:
        defaults: Dictionary with default/suggested values
        is_reconfigure: If True, use suggested_value for optional entity selectors
    """
    if defaults is None:
        defaults = {}

    def optional_entity_key(key: str):
        """Create vol.Optional key with suggested_value for reconfigure mode. @zara"""
        value = defaults.get(key)
        if is_reconfigure and value:
            return vol.Optional(key, description={"suggested_value": value})
        elif value:
            return vol.Optional(key, default=value)
        else:
            return vol.Optional(key)

    return vol.Schema(
        {
            optional_entity_key(CONF_TOTAL_CONSUMPTION_TODAY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            vol.Optional(
                CONF_SOLAR_CAPACITY,
                default=_get_default(defaults, CONF_SOLAR_CAPACITY, DEFAULT_SOLAR_CAPACITY),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.1,
                    max=1000.0,
                    step=0.01,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kWp",
                )
            ),
            vol.Optional(
                CONF_INVERTER_MAX_POWER,
                default=_get_default(
                    defaults, CONF_INVERTER_MAX_POWER, DEFAULT_INVERTER_MAX_POWER
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.0,
                    max=1000.0,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kW",
                )
            ),
            optional_entity_key(CONF_RAIN_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            optional_entity_key(CONF_LUX_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            optional_entity_key(CONF_TEMP_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            optional_entity_key(CONF_WIND_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            optional_entity_key(CONF_HUMIDITY_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            optional_entity_key(CONF_PRESSURE_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
            optional_entity_key(CONF_SOLAR_RADIATION_SENSOR): selector.EntitySelector(
                selector.EntitySelectorConfig(domain=["sensor"])
            ),
        }
    )


def _parse_panel_groups(panel_groups_str: str) -> list[dict]:
    """Parse panel groups from string format to list of dicts. @zara

    Supported format:
    - "power_wp/azimuth/tilt/power_sensor"

    Power sensors are required for every configured panel group.
    """
    if not panel_groups_str or not panel_groups_str.strip():
        return []

    groups = []
    entries = [
        e.strip() for e in panel_groups_str.replace("\n", ",").split(",") if e.strip()
    ]

    for idx, entry in enumerate(entries):
        parts = [p.strip() for p in entry.split("/")]
        if len(parts) == 4:
            try:
                power_wp = float(parts[0])
                azimuth = float(parts[1])
                tilt = float(parts[2])

                # Validate ranges @zara
                if power_wp <= 0 or power_wp > 100000:
                    continue
                if azimuth < 0 or azimuth > 360:
                    continue
                if tilt < 0 or tilt > 90:
                    continue

                group_data = {
                    CONF_PANEL_GROUP_NAME: f"Gruppe {idx + 1}",
                    CONF_PANEL_GROUP_POWER: power_wp,
                    CONF_PANEL_GROUP_AZIMUTH: azimuth,
                    CONF_PANEL_GROUP_TILT: tilt,
                }

                power_sensor = parts[3].strip()
                if "." not in power_sensor or len(power_sensor) <= 3:
                    continue
                group_data[CONF_PANEL_GROUP_POWER_SENSOR] = power_sensor

                groups.append(group_data)
            except (ValueError, TypeError):
                continue

    return groups


def _format_panel_groups(panel_groups: list[dict]) -> str:
    """Format panel groups from list of dicts to string format. @zara

    Includes required power sensors.
    """
    if not panel_groups:
        return ""

    def fmt(v):
        return str(int(v)) if v == int(v) else str(v)

    lines = []
    for group in panel_groups:
        power = group.get(CONF_PANEL_GROUP_POWER, 0)
        azimuth = group.get(CONF_PANEL_GROUP_AZIMUTH, DEFAULT_PANEL_AZIMUTH)
        tilt = group.get(CONF_PANEL_GROUP_TILT, DEFAULT_PANEL_TILT)
        power_sensor = group.get(CONF_PANEL_GROUP_POWER_SENSOR)
        lines.append(f"{fmt(power)}/{fmt(azimuth)}/{fmt(tilt)}/{power_sensor or ''}")

    return ", ".join(lines)


def _calculate_total_capacity_from_groups(panel_groups: list[dict]) -> float:
    """Calculate total capacity in kWp from panel groups. @zara"""
    if not panel_groups:
        return DEFAULT_SOLAR_CAPACITY

    total_wp = sum(g.get(CONF_PANEL_GROUP_POWER, 0) for g in panel_groups)
    return round(total_wp / 1000.0, 2)


def _panel_group_field(index: int, field: str) -> str:
    return f"group_{index}_{field}"


def _existing_panel_group(existing_groups: list[dict], index: int) -> dict:
    if index - 1 < len(existing_groups):
        group = existing_groups[index - 1]
        if isinstance(group, dict):
            return group
    return {}


def _panel_group_sensor_schema_key(index: int, sensor_key: str, sensor: str | None) -> vol.Marker:
    if index == 1:
        return vol.Required(sensor_key, default=sensor or "")
    if sensor:
        return vol.Optional(sensor_key, description={"suggested_value": sensor})
    return vol.Optional(sensor_key)


def _structured_panel_groups_schema(existing_groups: list[dict]) -> vol.Schema:
    fields = {}

    for index in range(1, 5):
        group = _existing_panel_group(existing_groups, index)
        sensor = group.get(CONF_PANEL_GROUP_POWER_SENSOR)
        azimuth = group.get(CONF_PANEL_GROUP_AZIMUTH, DEFAULT_PANEL_AZIMUTH)
        power_wp = group.get(CONF_PANEL_GROUP_POWER)
        kwp_default = round(float(power_wp) / 1000.0, 3) if power_wp else None

        sensor_key = _panel_group_field(index, "sensor")
        azimuth_key = _panel_group_field(index, "azimuth")
        tilt_key = _panel_group_field(index, "tilt")
        kwp_key = _panel_group_field(index, "kwp")

        sensor_schema_key = _panel_group_sensor_schema_key(index, sensor_key, sensor)
        fields[sensor_schema_key] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain=["sensor"])
        )

        fields[vol.Optional(azimuth_key, default=azimuth)] = selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0.0,
                max=360.0,
                step=1.0,
                mode=selector.NumberSelectorMode.BOX,
                unit_of_measurement="°",
            )
        )

        tilt = group.get(CONF_PANEL_GROUP_TILT, DEFAULT_PANEL_TILT)
        fields[vol.Optional(tilt_key, default=tilt)] = selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0.0,
                max=90.0,
                step=1.0,
                mode=selector.NumberSelectorMode.BOX,
                unit_of_measurement="°",
            )
        )

        kwp_schema_key = (
            vol.Optional(kwp_key, default=kwp_default)
            if kwp_default is not None
            else vol.Optional(kwp_key)
        )
        fields[kwp_schema_key] = selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0.001,
                max=100.0,
                step=0.001,
                mode=selector.NumberSelectorMode.BOX,
                unit_of_measurement="kWp",
            )
        )

    return vol.Schema(fields)


def _build_structured_panel_groups(
    user_input: dict[str, Any],
    existing_groups: list[dict],
) -> tuple[list[dict], dict[str, str]]:
    groups = []
    errors = {}

    for index in range(1, 5):
        sensor_key = _panel_group_field(index, "sensor")
        azimuth_key = _panel_group_field(index, "azimuth")
        tilt_key = _panel_group_field(index, "tilt")
        kwp_key = _panel_group_field(index, "kwp")

        sensor = str(user_input.get(sensor_key) or "").strip()
        if not sensor:
            if index == 1:
                errors[sensor_key] = "required"
            elif user_input.get(kwp_key) not in (None, ""):
                errors[sensor_key] = "required"
            continue

        try:
            azimuth = float(user_input.get(azimuth_key))
        except (TypeError, ValueError):
            errors[azimuth_key] = "invalid_input"
            continue

        try:
            tilt = float(user_input.get(tilt_key))
        except (TypeError, ValueError):
            errors[tilt_key] = "invalid_input"
            continue

        try:
            kwp = float(user_input.get(kwp_key))
        except (TypeError, ValueError):
            errors[kwp_key] = "invalid_input"
            continue

        if not (0.0 <= azimuth <= 360.0):
            errors[azimuth_key] = "invalid_input"
            continue
        if not (0.0 <= tilt <= 90.0):
            errors[tilt_key] = "invalid_input"
            continue
        if not (0.001 <= kwp <= 100.0):
            errors[kwp_key] = "invalid_capacity"
            continue

        group_data = {
            CONF_PANEL_GROUP_NAME: f"Gruppe {index}",
            CONF_PANEL_GROUP_POWER: round(kwp * 1000.0, 3),
            CONF_PANEL_GROUP_AZIMUTH: azimuth,
            CONF_PANEL_GROUP_TILT: tilt,
            CONF_PANEL_GROUP_POWER_SENSOR: sensor,
        }

        groups.append(group_data)

    if not groups and "group_1_sensor" not in errors:
        errors["group_1_sensor"] = "panel_groups_required"

    return groups, errors


def _attr_value(value: Any) -> str:
    if value is None:
        return ""
    enum_value = getattr(value, "value", None)
    if enum_value is not None:
        value = enum_value
    return str(value).strip()


@config_entries.HANDLERS.register(DOMAIN)
class SolarForecastMLConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handles the configuration flow for Solar Forecast ML. @zara"""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow. @zara"""
        self._user_input: dict[str, Any] = {}
        self._reconfigure_entry: config_entries.ConfigEntry | None = None

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        """Redirect users to the options flow handler. @zara"""
        return SolarForecastMLOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial setup step. @zara"""
        errors = {}
        prefill_data = user_input if user_input is not None else {}

        if user_input is not None:
            try:
                capacity = user_input.get(CONF_SOLAR_CAPACITY)
                if capacity is not None:
                    float_cap = float(capacity)
                    if not (0.1 <= float_cap <= 1000.0):
                        errors[CONF_SOLAR_CAPACITY] = "invalid_capacity"
            except (ValueError, TypeError):
                errors[CONF_SOLAR_CAPACITY] = "invalid_input"

            if errors:
                return self.async_show_form(
                    step_id="user",
                    data_schema=_get_base_schema(prefill_data),
                    errors=errors,
                )

            if self._async_current_entries(include_ignore=False):
                return self.async_abort(reason="already_configured")

            unique_id = "solar_forecast_ml"
            await self.async_set_unique_id(unique_id)
            self._abort_if_unique_id_configured()

            # Clean data @zara
            cleaned_data = {}
            optional_sensor_keys = [
                                        CONF_TOTAL_CONSUMPTION_TODAY,
                CONF_RAIN_SENSOR,
                CONF_LUX_SENSOR,
                CONF_TEMP_SENSOR,
                CONF_WIND_SENSOR,
                CONF_HUMIDITY_SENSOR,
                CONF_PRESSURE_SENSOR,
                CONF_SOLAR_RADIATION_SENSOR,
            ]
            for key, value in user_input.items():
                if isinstance(value, str):
                    cleaned_value = value.strip()
                    if not cleaned_value and key in optional_sensor_keys:
                        continue
                    cleaned_data[key] = cleaned_value if cleaned_value else ""
                elif key in (CONF_SOLAR_CAPACITY, CONF_INVERTER_MAX_POWER):
                    try:
                        cleaned_data[key] = (
                            float(value)
                            if value is not None
                            else (
                                DEFAULT_SOLAR_CAPACITY
                                if key == CONF_SOLAR_CAPACITY
                                else DEFAULT_INVERTER_MAX_POWER
                            )
                        )
                    except (ValueError, TypeError):
                        cleaned_data[key] = (
                            DEFAULT_SOLAR_CAPACITY
                            if key == CONF_SOLAR_CAPACITY
                            else DEFAULT_INVERTER_MAX_POWER
                        )
                elif value is None:
                    if key in optional_sensor_keys:
                        continue
                    cleaned_data[key] = ""
                else:
                    cleaned_data[key] = value

            if (
                CONF_SOLAR_CAPACITY not in cleaned_data
                or cleaned_data[CONF_SOLAR_CAPACITY] == ""
            ):
                cleaned_data[CONF_SOLAR_CAPACITY] = DEFAULT_SOLAR_CAPACITY
            if CONF_INVERTER_MAX_POWER not in cleaned_data:
                cleaned_data[CONF_INVERTER_MAX_POWER] = DEFAULT_INVERTER_MAX_POWER

            self._user_input = cleaned_data
            return await self.async_step_panel_groups()

        return self.async_show_form(
            step_id="user",
            data_schema=_get_base_schema({CONF_SOLAR_CAPACITY: DEFAULT_SOLAR_CAPACITY}),
            errors={},
        )

    async def async_step_panel_groups(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the panel groups configuration step. @zara

        Panel groups are required (min 1, max 4).
        """
        errors = {}
        existing_groups = self._user_input.get(CONF_PANEL_GROUPS, [])

        if user_input is not None:
            panel_groups, errors = _build_structured_panel_groups(
                user_input,
                existing_groups,
            )

            if not errors:
                sensor_errors = await self._validate_panel_group_sensors(panel_groups)
                if sensor_errors:
                    errors["base"] = sensor_errors
                else:
                    self._user_input[CONF_PANEL_GROUPS] = panel_groups
                    total_capacity = _calculate_total_capacity_from_groups(panel_groups)
                    self._user_input[CONF_SOLAR_CAPACITY] = total_capacity

                    _LOGGER.info(
                        "Panel groups configured: %d groups, total %.2f kWp",
                        len(panel_groups),
                        total_capacity,
                    )

            if not errors:
                return self.async_create_entry(
                    title="Solar Forecast ML", data=self._user_input
                )

        return self.async_show_form(
            step_id="panel_groups",
            data_schema=_structured_panel_groups_schema(existing_groups),
            errors=errors,
        )

    async def _validate_panel_group_sensors(
        self, panel_groups: list[dict]
    ) -> str | None:
        """Validate sensors configured for panel groups. @zara

        Returns:
            Error string if validation fails, None if all sensors are valid
        """
        for group in panel_groups:
            power_entity_id = group.get(CONF_PANEL_GROUP_POWER_SENSOR)
            if not power_entity_id:
                return "power_sensor_required"
            if power_entity_id:
                power_error = self._validate_panel_group_power_sensor(power_entity_id)
                if power_error:
                    return power_error

        return None

    def _validate_panel_group_power_sensor(self, entity_id: str) -> str | None:
        state = self.hass.states.get(entity_id)

        if state is None:
            _LOGGER.warning("Power sensor not found: %s", entity_id)
            return "power_sensor_not_found"

        if state.state in ["unavailable", "unknown"]:
            _LOGGER.debug(
                "Power sensor %s is currently %s - will retry at runtime",
                entity_id,
                state.state,
            )
            return None

        try:
            float(state.state)
        except (ValueError, TypeError):
            _LOGGER.warning("Power sensor not numeric: %s (state=%s)", entity_id, state.state)
            return "power_sensor_not_numeric"

        unit = _attr_value(state.attributes.get("unit_of_measurement")).lower()
        if unit not in {"w", "kw"}:
            _LOGGER.warning(
                "Panel group power sensor %s is not accepted: expected unit W or kW",
                entity_id,
            )
            return "power_sensor_not_power_unit"

        device_class = _attr_value(state.attributes.get("device_class")).lower()
        if device_class and device_class != "power":
            _LOGGER.info(
                "Panel group power sensor %s uses device_class=%s with accepted power unit %s",
                entity_id,
                device_class,
                unit,
            )

        return None

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the reconfiguration step. @zara"""
        if self.source != SOURCE_RECONFIGURE:
            return self.async_abort(reason="not_reconfigure")
        entry = self.hass.config_entries.async_get_entry(self.context["entry_id"])
        if entry is None:
            return self.async_abort(reason="entry_not_found")

        errors = {}
        prefill_data = dict(entry.data)

        if user_input is not None:
            prefill_data.update(user_input)

            try:
                capacity = user_input.get(CONF_SOLAR_CAPACITY)
                if capacity is not None and capacity != "":
                    float_cap = float(capacity)
                    if not (0.1 <= float_cap <= 1000.0):
                        errors[CONF_SOLAR_CAPACITY] = "invalid_capacity"
            except (ValueError, TypeError):
                errors[CONF_SOLAR_CAPACITY] = "invalid_input"

            if errors:
                return self.async_show_form(
                    step_id="reconfigure",
                    data_schema=_get_base_schema(prefill_data, is_reconfigure=True),
                    errors=errors,
                )

            # Clean data @zara
            cleaned_data = {}
            optional_sensor_keys = [
                                        CONF_TOTAL_CONSUMPTION_TODAY,
                CONF_RAIN_SENSOR,
                CONF_LUX_SENSOR,
                CONF_TEMP_SENSOR,
                CONF_WIND_SENSOR,
                CONF_HUMIDITY_SENSOR,
                CONF_PRESSURE_SENSOR,
                CONF_SOLAR_RADIATION_SENSOR,
            ]
            for key, value in user_input.items():
                if isinstance(value, str):
                    cleaned_value = value.strip()
                    if not cleaned_value and key in optional_sensor_keys:
                        continue
                    cleaned_data[key] = cleaned_value
                elif key in (CONF_SOLAR_CAPACITY, CONF_INVERTER_MAX_POWER):
                    try:
                        if value is None or value == "":
                            cleaned_data[key] = (
                                DEFAULT_SOLAR_CAPACITY
                                if key == CONF_SOLAR_CAPACITY
                                else DEFAULT_INVERTER_MAX_POWER
                            )
                        else:
                            cleaned_data[key] = float(value)
                    except (ValueError, TypeError):
                        cleaned_data[key] = (
                            DEFAULT_SOLAR_CAPACITY
                            if key == CONF_SOLAR_CAPACITY
                            else DEFAULT_INVERTER_MAX_POWER
                        )
                elif value is None:
                    if key in optional_sensor_keys:
                        continue
                    cleaned_data[key] = ""
                else:
                    cleaned_data[key] = value

            if cleaned_data.get(CONF_SOLAR_CAPACITY) == "":
                cleaned_data[CONF_SOLAR_CAPACITY] = DEFAULT_SOLAR_CAPACITY
            if CONF_INVERTER_MAX_POWER not in cleaned_data:
                cleaned_data[CONF_INVERTER_MAX_POWER] = DEFAULT_INVERTER_MAX_POWER

            # Preserve existing panel groups @zara
            if CONF_PANEL_GROUPS in entry.data and CONF_PANEL_GROUPS not in cleaned_data:
                cleaned_data[CONF_PANEL_GROUPS] = entry.data[CONF_PANEL_GROUPS]
            self._user_input = cleaned_data
            self._reconfigure_entry = entry
            return await self.async_step_reconfigure_panel_groups()

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=_get_base_schema(prefill_data, is_reconfigure=True),
            errors=errors,
        )

    async def async_step_reconfigure_panel_groups(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle panel groups reconfiguration step. @zara"""
        errors = {}
        entry = getattr(self, "_reconfigure_entry", None)
        if entry is None:
            return self.async_abort(reason="entry_not_found")

        existing_groups = self._user_input.get(CONF_PANEL_GROUPS, [])

        if user_input is not None:
            panel_groups, errors = _build_structured_panel_groups(
                user_input,
                existing_groups,
            )

            if not errors:
                sensor_errors = await self._validate_panel_group_sensors(panel_groups)
                if sensor_errors:
                    errors["base"] = sensor_errors
                else:
                    self._user_input[CONF_PANEL_GROUPS] = panel_groups
                    total_capacity = _calculate_total_capacity_from_groups(panel_groups)
                    self._user_input[CONF_SOLAR_CAPACITY] = total_capacity

            if not errors:
                return self.async_update_reload_and_abort(
                    entry, data=self._user_input, reason="reconfigure_successful"
                )

        return self.async_show_form(
            step_id="reconfigure_panel_groups",
            data_schema=_structured_panel_groups_schema(existing_groups),
            errors=errors,
        )


class SolarForecastMLOptionsFlow(OptionsFlowWithReload):
    """Handles the options flow for Solar Forecast ML. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options. @zara"""
        errors = {}
        if user_input is not None:
            # Validate update_interval @zara
            interval = user_input.get(CONF_UPDATE_INTERVAL, 1800)
            try:
                interval_sec = int(float(interval))
                if not (300 <= interval_sec <= 86400):
                    errors[CONF_UPDATE_INTERVAL] = "invalid_interval"
                else:
                    user_input[CONF_UPDATE_INTERVAL] = interval_sec
            except (ValueError, TypeError):
                errors[CONF_UPDATE_INTERVAL] = "invalid_input"

            try:
                max_grid_export_w = float(
                    user_input.get(CONF_MAX_GRID_EXPORT_W, DEFAULT_MAX_GRID_EXPORT_W)
                )
                if not (0.0 <= max_grid_export_w <= 100000.0):
                    errors[CONF_MAX_GRID_EXPORT_W] = "invalid_input"
                elif user_input.get(CONF_ZERO_EXPORT_MODE, False):
                    user_input[CONF_MAX_GRID_EXPORT_W] = 0.0
                else:
                    user_input[CONF_MAX_GRID_EXPORT_W] = max_grid_export_w
            except (ValueError, TypeError):
                errors[CONF_MAX_GRID_EXPORT_W] = "invalid_input"

            if errors:
                return self.async_show_form(
                    step_id="init",
                    data_schema=self._get_options_schema(),
                    errors=errors,
                )

            # Build updated options @zara
            valid_keys = [
                CONF_UPDATE_INTERVAL,
                CONF_DIAGNOSTIC,
                CONF_HOURLY,
                CONF_EVCC_FORECAST,
                CONF_NOTIFY_STARTUP,
                CONF_NOTIFY_FORECAST,
                CONF_NOTIFY_LEARNING,
                CONF_NOTIFY_SUCCESSFUL_LEARNING,
                CONF_NOTIFY_FOG,
                CONF_NOTIFY_FROST,
                CONF_NOTIFY_WEATHER_ALERT,
                CONF_NOTIFY_SNOW_COVERED,
                CONF_ML_ALGORITHM,
                CONF_ENABLE_TINY_LSTM,
                CONF_PIRATE_WEATHER_API_KEY,
                CONF_ADAPTIVE_FORECAST_MODE,
                CONF_WINTER_MODE,
                CONF_ZERO_EXPORT_MODE,
                CONF_HAS_BATTERY,
                CONF_SOLAR_TO_BATTERY_SENSOR,
                CONF_MAX_GRID_EXPORT_W,
            ]
            updated_options = {
                **self.config_entry.options,
                **{k: v for k, v in user_input.items() if k in valid_keys},
            }
            # Remove empty API keys @zara
            if not updated_options.get(CONF_PIRATE_WEATHER_API_KEY):
                updated_options.pop(CONF_PIRATE_WEATHER_API_KEY, None)

            return self.async_create_entry(title="", data=updated_options)

        options_schema = self._get_options_schema()

        return self.async_show_form(
            step_id="init",
            data_schema=options_schema,
            errors=errors,
        )

    def _get_options_schema(self) -> vol.Schema:
        """Define the schema for the options form. @zara"""
        current_options = self.config_entry.options

        # Safely get update_interval @zara
        try:
            update_interval = int(current_options.get(CONF_UPDATE_INTERVAL, 1800))
            if not 300 <= update_interval <= 86400:
                update_interval = 1800
        except (ValueError, TypeError):
            update_interval = 1800

        zero_export_mode = current_options.get(CONF_ZERO_EXPORT_MODE, DEFAULT_ZERO_EXPORT_MODE)
        max_grid_export_w = current_options.get(
            CONF_MAX_GRID_EXPORT_W,
            0.0 if zero_export_mode else DEFAULT_MAX_GRID_EXPORT_W,
        )

        return vol.Schema(
            {
                vol.Optional(
                    CONF_UPDATE_INTERVAL, default=update_interval
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=300,
                        max=86400,
                        step=60,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="s",
                    )
                ),
                vol.Optional(
                    CONF_DIAGNOSTIC,
                    default=current_options.get(CONF_DIAGNOSTIC, True),
                ): bool,
                vol.Optional(
                    CONF_HOURLY, default=current_options.get(CONF_HOURLY, False)
                ): bool,
                vol.Optional(
                    CONF_EVCC_FORECAST,
                    default=current_options.get(CONF_EVCC_FORECAST, False),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_STARTUP,
                    default=current_options.get(CONF_NOTIFY_STARTUP, True),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_FORECAST,
                    default=current_options.get(CONF_NOTIFY_FORECAST, False),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_LEARNING,
                    default=current_options.get(CONF_NOTIFY_LEARNING, False),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_SUCCESSFUL_LEARNING,
                    default=current_options.get(CONF_NOTIFY_SUCCESSFUL_LEARNING, True),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_FOG,
                    default=current_options.get(CONF_NOTIFY_FOG, True),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_FROST,
                    default=current_options.get(CONF_NOTIFY_FROST, True),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_WEATHER_ALERT,
                    default=current_options.get(CONF_NOTIFY_WEATHER_ALERT, True),
                ): bool,
                vol.Optional(
                    CONF_NOTIFY_SNOW_COVERED,
                    default=current_options.get(CONF_NOTIFY_SNOW_COVERED, True),
                ): bool,
                vol.Optional(
                    CONF_ML_ALGORITHM,
                    default=current_options.get(CONF_ML_ALGORITHM, DEFAULT_ML_ALGORITHM),
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(
                                value="auto", label="Automatic (Recommended)"
                            ),
                            selector.SelectOptionDict(
                                value="ridge", label="Ridge Regression (Fast)"
                            ),
                            selector.SelectOptionDict(
                                value="tiny_lstm", label="Neural Network (Better Accuracy)"
                            ),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                        translation_key="ml_algorithm",
                    )
                ),
                vol.Optional(
                    CONF_ENABLE_TINY_LSTM,
                    default=current_options.get(
                        CONF_ENABLE_TINY_LSTM, DEFAULT_ENABLE_TINY_LSTM
                    ),
                ): bool,
                vol.Optional(
                    CONF_ADAPTIVE_FORECAST_MODE,
                    default=current_options.get(
                        CONF_ADAPTIVE_FORECAST_MODE, DEFAULT_ADAPTIVE_FORECAST_MODE
                    ),
                ): bool,
                vol.Optional(
                    CONF_WINTER_MODE,
                    default=current_options.get(CONF_WINTER_MODE, DEFAULT_WINTER_MODE),
                ): bool,
                vol.Optional(
                    CONF_ZERO_EXPORT_MODE,
                    default=current_options.get(
                        CONF_ZERO_EXPORT_MODE, DEFAULT_ZERO_EXPORT_MODE
                    ),
                ): bool,
                vol.Optional(
                    CONF_HAS_BATTERY,
                    default=current_options.get(CONF_HAS_BATTERY, DEFAULT_HAS_BATTERY),
                ): bool,
                vol.Optional(
                    CONF_SOLAR_TO_BATTERY_SENSOR,
                    description={
                        "suggested_value": current_options.get(
                            CONF_SOLAR_TO_BATTERY_SENSOR, ""
                        )
                    },
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain=["sensor"],
                        device_class=["power"],
                        multiple=False,
                    )
                ),
                vol.Optional(
                    CONF_MAX_GRID_EXPORT_W,
                    default=max_grid_export_w,
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0.0,
                        max=100000.0,
                        step=10.0,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="W",
                    )
                ),
                vol.Optional(
                    CONF_PIRATE_WEATHER_API_KEY,
                    description={
                        "suggested_value": current_options.get(
                            CONF_PIRATE_WEATHER_API_KEY, ""
                        )
                    },
                ): selector.TextSelector(
                    selector.TextSelectorConfig(
                        type=selector.TextSelectorType.PASSWORD,
                    )
                ),
            }
        )
