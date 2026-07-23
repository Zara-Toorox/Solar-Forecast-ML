"""License-first EAI configuration and reauthentication flows."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from . import get_license_validator
from .const import (
    ADVANCED_SENSORS,
    CONF_BUILDING_REF,
    CONF_CAPABILITY_LEVEL,
    CONF_COP_RATED,
    CONF_ELECTRICITY_PRICE_ENTITY,
    CONF_FEED_IN_TARIFF_ENTITY,
    CONF_HAS_DHW,
    CONF_HAS_HEATING_ELEMENT,
    CONF_HEATING_CAPACITY_KW,
    CONF_LICENSE_ID,
    CONF_LICENSE_KEY,
    CONF_LICENSE_STATUS,
    CONF_LOW_PRICE_THRESHOLD_CT,
    CONF_MANUFACTURER,
    CONF_MODEL,
    CONF_ONBOARDING_STATE,
    CONF_WP_TYPE,
    DOMAIN,
    DEFAULT_LOW_PRICE_THRESHOLD_CT,
    REQUIRED_SENSORS,
    STANDARD_SENSORS,
)


def _entity_schema(keys: tuple[str, ...], *, required: bool) -> vol.Schema:
    fields: dict[Any, Any] = {}
    for key in keys:
        marker = vol.Required(key) if required else vol.Optional(key)
        fields[marker] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain=["sensor", "binary_sensor"])
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


def _automation_schema() -> vol.Schema:
    return vol.Schema(
        {
            vol.Optional(CONF_ELECTRICITY_PRICE_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(CONF_FEED_IN_TARIFF_ENTITY): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(
                CONF_LOW_PRICE_THRESHOLD_CT,
                default=DEFAULT_LOW_PRICE_THRESHOLD_CT,
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


def _capability(data: dict[str, Any]) -> str:
    standard = sum(bool(data.get(key)) for key in STANDARD_SENSORS)
    advanced = sum(bool(data.get(key)) for key in ADVANCED_SENSORS)
    if advanced >= 2 and standard >= 5:
        return "advanced"
    if standard >= 2:
        return "standard"
    return "essential"


@config_entries.HANDLERS.register(DOMAIN)
class SolarForecastEAIConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> config_entries.OptionsFlow:
        return SolarForecastEAIOptionsFlow(config_entry)

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        return await self.async_step_license(user_input)

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
                return await self.async_step_heat_pump()
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="license", data_schema=_license_schema(), errors=errors
        )

    async def async_step_heat_pump(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_required_sensors()
        return self.async_show_form(
            step_id="heat_pump",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_WP_TYPE, default="air_water"
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=["air_water", "brine_water", "water_water"],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                            translation_key="wp_type",
                        )
                    ),
                    vol.Optional(CONF_MANUFACTURER): str,
                    vol.Optional(CONF_MODEL): str,
                    vol.Required(CONF_HEATING_CAPACITY_KW, default=10.0): vol.All(
                        vol.Coerce(float), vol.Range(min=1, max=100)
                    ),
                    vol.Required(CONF_COP_RATED, default=4.0): vol.All(
                        vol.Coerce(float), vol.Range(min=1, max=10)
                    ),
                    vol.Required(CONF_HAS_HEATING_ELEMENT, default=True): bool,
                    vol.Required(CONF_HAS_DHW, default=True): bool,
                    vol.Optional(CONF_BUILDING_REF): str,
                }
            ),
        )

    async def async_step_required_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_standard_sensors()
        return self.async_show_form(
            step_id="required_sensors",
            data_schema=_entity_schema(REQUIRED_SENSORS, required=True),
        )

    async def async_step_standard_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(
                {key: value for key, value in user_input.items() if value}
            )
            return await self.async_step_advanced_sensors()
        return self.async_show_form(
            step_id="standard_sensors",
            data_schema=_entity_schema(STANDARD_SENSORS, required=False),
        )

    async def async_step_advanced_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._data.update(
                {key: value for key, value in user_input.items() if value}
            )
            return await self.async_step_automation_inputs()
        return self.async_show_form(
            step_id="advanced_sensors",
            data_schema=_entity_schema(ADVANCED_SENSORS, required=False),
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
        missing = [
            entity_id
            for key in REQUIRED_SENSORS
            if not (entity_id := self._data.get(key))
            or self.hass.states.get(entity_id) is None
        ]
        duplicates = len(
            [
                self._data.get(key)
                for key in REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS
                if self._data.get(key)
            ]
        ) != len(
            set(
                self._data.get(key)
                for key in REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS
                if self._data.get(key)
            )
        )
        if user_input is None and (missing or duplicates):
            return self.async_show_form(
                step_id="validation",
                data_schema=vol.Schema(
                    {vol.Required("acknowledge_warnings", default=False): bool}
                ),
                description_placeholders={
                    "missing": ", ".join(missing) or "none",
                    "duplicates": str(duplicates).lower(),
                },
            )
        if (
            user_input is not None
            and not user_input.get("acknowledge_warnings")
            and (missing or duplicates)
        ):
            return self.async_show_form(
                step_id="validation",
                data_schema=vol.Schema(
                    {vol.Required("acknowledge_warnings", default=False): bool}
                ),
                errors={"base": "validation_required"},
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
                self.hass.config_entries.async_update_entry(
                    self._reauth_entry, data=data
                )
                await self.hass.config_entries.async_reload(self._reauth_entry.entry_id)
                return self.async_abort(reason="reauth_successful")
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="reauth_confirm", data_schema=_license_schema(), errors=errors
        )


class SolarForecastEAIOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._entry = config_entry
        self._options = dict(config_entry.options)

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            choice = user_input["section"]
            return await getattr(self, f"async_step_{choice}")()
        return self.async_show_menu(
            step_id="init",
            menu_options=["license", "heat_pump", "sensors", "automation"],
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
                data = dict(self._entry.data)
                data.update(
                    {
                        CONF_LICENSE_KEY: user_input[CONF_LICENSE_KEY],
                        CONF_LICENSE_STATUS: "valid",
                        CONF_LICENSE_ID: result.payload.license_id,
                    }
                )
                self.hass.config_entries.async_update_entry(self._entry, data=data)
                return self.async_create_entry(title="", data=self._options)
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="license", data_schema=_license_schema(), errors=errors
        )

    async def async_step_heat_pump(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._options.update(user_input)
            return self.async_create_entry(title="", data=self._options)
        return self.async_show_form(
            step_id="heat_pump",
            data_schema=vol.Schema(
                {
                    vol.Optional(CONF_MANUFACTURER): str,
                    vol.Optional(CONF_MODEL): str,
                    vol.Optional(CONF_HEATING_CAPACITY_KW): vol.Coerce(float),
                    vol.Optional(CONF_COP_RATED): vol.Coerce(float),
                }
            ),
        )

    async def async_step_sensors(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._options.update(
                {key: value for key, value in user_input.items() if value}
            )
            self._options[CONF_CAPABILITY_LEVEL] = _capability(
                {**self._entry.data, **self._options}
            )
            return self.async_create_entry(title="", data=self._options)
        return self.async_show_form(
            step_id="sensors",
            data_schema=_entity_schema(
                REQUIRED_SENSORS + STANDARD_SENSORS + ADVANCED_SENSORS, required=False
            ),
        )

    async def async_step_automation(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            for key in (
                CONF_ELECTRICITY_PRICE_ENTITY,
                CONF_FEED_IN_TARIFF_ENTITY,
                CONF_LOW_PRICE_THRESHOLD_CT,
            ):
                if key in user_input:
                    self._options[key] = user_input[key]
            return self.async_create_entry(title="", data=self._options)
        return self.async_show_form(
            step_id="automation", data_schema=_automation_schema()
        )
