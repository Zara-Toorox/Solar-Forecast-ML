# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Config flow for the SFML Stats integration. @zara"""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import SOURCE_RECONFIGURE
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    NAME,
    CONF_COUNTRY,
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_INVERTER_AC_OUTPUT,
    CONF_SENSOR_SOLAR_TO_HOUSE,
    CONF_WEATHER_ENTITY,
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_BATTERY_POWER,
    CONF_SENSOR_GRID_IMPORT_EXTRA,
    CONF_BILLING_PRICE_MODE,
    CONF_BILLING_FIXED_PRICE,
    CONF_BILLING_WORK_PRICE,
    CONF_BILLING_GRID_FEES,
    CONF_BILLING_BASE_FEE,
    CONF_FEED_IN_TARIFF,
    CONF_AMORTIZATION_INVESTMENT_EUR,
    CONF_AMORTIZATION_SUBSIDY_EUR,
    CONF_AMORTIZATION_COMMISSIONING_DATE,
    CONF_AMORTIZATION_ANNUAL_RUNNING_COSTS_EUR,
    CONF_AMORTIZATION_PRICE_INCREASE_PERCENT,
    CONF_AMORTIZATION_DEGRADATION_PERCENT,
    CONF_PANEL_GROUP_NAMES,
    CONF_SHOW_PANEL_GROUPS,
    CONF_SMART_CHARGING_ENABLED,
    CONF_SMART_CHARGING_SWITCH,
    CONF_BATTERY_CAPACITY,
    CONF_MIN_SOC,
    CONF_MAX_SOC,
    CONF_BATTERY_SOC_SENSOR,
    CONF_MAX_PRICE,
    CONF_FORCE_CHARGE_PRICE,
    DEFAULT_BATTERY_CAPACITY,
    DEFAULT_MIN_SOC,
    DEFAULT_MAX_SOC,
    DEFAULT_MAX_PRICE,
    DEFAULT_FORCE_CHARGE_PRICE,
    CONF_FORECAST_ENTITY_1,
    CONF_FORECAST_ENTITY_2,
    CONF_FORECAST_ENTITY_1_NAME,
    CONF_FORECAST_ENTITY_2_NAME,
    DEFAULT_COUNTRY,
    DEFAULT_BILLING_PRICE_MODE,
    DEFAULT_BILLING_WORK_PRICE,
    DEFAULT_BILLING_GRID_FEES,
    DEFAULT_BILLING_BASE_FEE,
    DEFAULT_FEED_IN_TARIFF,
    DEFAULT_AMORTIZATION_INVESTMENT_EUR,
    DEFAULT_AMORTIZATION_SUBSIDY_EUR,
    DEFAULT_AMORTIZATION_ANNUAL_RUNNING_COSTS_EUR,
    DEFAULT_AMORTIZATION_PRICE_INCREASE_PERCENT,
    DEFAULT_AMORTIZATION_DEGRADATION_PERCENT,
    DEFAULT_FORECAST_ENTITY_1_NAME,
    DEFAULT_FORECAST_ENTITY_2_NAME,
    PRICE_MODE_DYNAMIC,
    PRICE_MODE_FIXED,
    PRICE_MODE_NONE,
    CONF_BILLING_START_DAY,
    CONF_BILLING_START_MONTH,
    DEFAULT_BILLING_START_DAY,
    DEFAULT_BILLING_START_MONTH,
    CONF_SENSOR_SOLAR_TO_BATTERY,
    CONF_SENSOR_BATTERY_TO_HOUSE,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_PRICE_TOTAL,
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_SMARTMETER_EXPORT,
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_WALLBOX_POWER,
    CONF_SENSOR_WALLBOX_STATE,
    CONF_SENSOR_HP_HEATING_MODE,
    CONF_SENSOR_HP_DHW_MODE,
    CONF_SENSOR_HP_DHW_CHARGING,
    CONF_SENSOR_HP_PV_ACTIVE,
    CONF_SENSOR_HP_ELECTRIC_POWER,
    CONF_SENSOR_HP_THERMAL_POWER,
    CONF_SENSOR_HP_GRID_ENERGY_DAILY,
    CONF_SENSOR_HP_PV_ENERGY_DAILY,
    CONF_SENSOR_HP_JAZ,
    CONF_SENSOR_HP_COMPRESSOR_STARTS,
    CONF_SENSOR_HP_STORAGE_TEMP,
    CONF_SENSOR_WB_CHARGE_MODE,
    CONF_SENSOR_WB_ENERGY_SESSION,
    HP_DETAIL_SENSORS,
    WB_DETAIL_SENSORS,
    CONF_VAT_RATE,
    CONF_GPM_GRID_FEE,
    CONF_TAXES_FEES,
    CONF_PROVIDER_MARKUP,
    DEFAULT_GPM_GRID_FEE,
    DEFAULT_TAXES_FEES,
    DEFAULT_PROVIDER_MARKUP,
    LEGACY_POWER_ENERGY_SENSOR_KEYS,
)

_LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MONTHS_EN = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}


def _entity(*, domain: str = "sensor", device_class: str | None = None) -> selector.EntitySelector:
    """Build an EntitySelector with optional device_class filter. @zara"""
    cfg: dict[str, Any] = {"domain": domain, "multiple": False}
    if device_class:
        cfg["device_class"] = device_class
    return selector.EntitySelector(selector.EntitySelectorConfig(**cfg))


def _number(
    min_val: float, max_val: float, step: float, unit: str = "ct/kWh",
) -> selector.NumberSelector:
    """Build a NumberSelector in BOX mode. @zara"""
    return selector.NumberSelector(
        selector.NumberSelectorConfig(
            min=min_val, max=max_val, step=step,
            unit_of_measurement=unit,
            mode=selector.NumberSelectorMode.BOX,
        )
    )


def _store(data: dict, user_input: dict, keys: list[str]) -> None:
    """Copy non-empty string values from user_input into data. @zara"""
    for key in keys:
        value = user_input.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            data.pop(key, None)
        else:
            data[key] = value


def _optional_entity_key(key: str, defaults: dict[str, Any]) -> vol.Marker:
    """Create an optional entity field that can be cleared during reconfigure."""
    value = defaults.get(key)
    if value:
        return vol.Optional(key, description={"suggested_value": value})
    return vol.Optional(key)


def _basic_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build the basic setup schema."""
    current = defaults or {}
    home_sensor = current.get(CONF_SENSOR_HOME_CONSUMPTION)
    home_key = (
        vol.Required(CONF_SENSOR_HOME_CONSUMPTION, default=home_sensor)
        if home_sensor
        else vol.Required(CONF_SENSOR_HOME_CONSUMPTION)
    )
    return vol.Schema({
        vol.Required(
            CONF_COUNTRY,
            default=current.get(CONF_COUNTRY, DEFAULT_COUNTRY),
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=[
                    selector.SelectOptionDict(value="DE", label="Deutschland"),
                    selector.SelectOptionDict(value="AT", label="Oesterreich"),
                ],
                mode=selector.SelectSelectorMode.DROPDOWN,
            )
        ),
        home_key: _entity(device_class="power"),
        _optional_entity_key(CONF_WEATHER_ENTITY, current): _entity(domain="weather"),
    })


def _energy_flow_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build the directional power-flow schema."""
    current = defaults or {}
    return vol.Schema({
        _optional_entity_key(CONF_SENSOR_SOLAR_TO_HOUSE, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_INVERTER_AC_OUTPUT, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_SOLAR_TO_BATTERY, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_BATTERY_TO_HOUSE, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_GRID_TO_HOUSE, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_GRID_TO_BATTERY, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_HOUSE_TO_GRID, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_SMARTMETER_IMPORT, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_SMARTMETER_EXPORT, current): _entity(device_class="power"),
    })


def _battery_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build the optional battery and special fallback schema."""
    current = defaults or {}
    return vol.Schema({
        _optional_entity_key(CONF_SENSOR_BATTERY_SOC, current): _entity(device_class="battery"),
        _optional_entity_key(CONF_SENSOR_BATTERY_POWER, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_GRID_IMPORT_EXTRA, current): _entity(device_class="energy"),
        _optional_entity_key(CONF_SENSOR_PRICE_TOTAL, current): _entity(device_class="monetary"),
    })


def _consumer_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build the main consumer sensor schema."""
    current = defaults or {}
    return vol.Schema({
        _optional_entity_key(CONF_SENSOR_HEATPUMP_POWER, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_HEATINGROD_POWER, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_WALLBOX_POWER, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_WALLBOX_STATE, current): _entity(domain="sensor"),
    })


def _consumer_detail_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build the optional heat-pump and wallbox detail schema."""
    current = defaults or {}
    return vol.Schema({
        _optional_entity_key(CONF_SENSOR_HP_HEATING_MODE, current): _entity(domain="select"),
        _optional_entity_key(CONF_SENSOR_HP_DHW_MODE, current): _entity(domain="select"),
        _optional_entity_key(CONF_SENSOR_HP_DHW_CHARGING, current): _entity(domain="binary_sensor"),
        _optional_entity_key(CONF_SENSOR_HP_PV_ACTIVE, current): _entity(domain="binary_sensor"),
        _optional_entity_key(CONF_SENSOR_HP_ELECTRIC_POWER, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_HP_THERMAL_POWER, current): _entity(device_class="power"),
        _optional_entity_key(CONF_SENSOR_HP_GRID_ENERGY_DAILY, current): _entity(device_class="energy"),
        _optional_entity_key(CONF_SENSOR_HP_PV_ENERGY_DAILY, current): _entity(device_class="energy"),
        _optional_entity_key(CONF_SENSOR_HP_JAZ, current): _entity(domain="sensor"),
        _optional_entity_key(CONF_SENSOR_HP_COMPRESSOR_STARTS, current): _entity(domain="sensor"),
        _optional_entity_key(CONF_SENSOR_HP_STORAGE_TEMP, current): _entity(device_class="temperature"),
        _optional_entity_key(CONF_SENSOR_WB_CHARGE_MODE, current): _entity(domain="select"),
        _optional_entity_key(CONF_SENSOR_WB_ENERGY_SESSION, current): _entity(device_class="energy"),
    })


BASIC_KEYS = [
    CONF_COUNTRY,
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_WEATHER_ENTITY,
]
ENERGY_FLOW_KEYS = [
    CONF_SENSOR_SOLAR_TO_HOUSE,
    CONF_SENSOR_INVERTER_AC_OUTPUT,
    CONF_SENSOR_SOLAR_TO_BATTERY,
    CONF_SENSOR_BATTERY_TO_HOUSE,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_SMARTMETER_EXPORT,
]
BATTERY_KEYS = [
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_BATTERY_POWER,
    CONF_SENSOR_GRID_IMPORT_EXTRA,
    CONF_SENSOR_PRICE_TOTAL,
]
CONSUMER_KEYS = [
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_WALLBOX_POWER,
    CONF_SENSOR_WALLBOX_STATE,
]
CONSUMER_DETAIL_KEYS = HP_DETAIL_SENSORS + WB_DETAIL_SENSORS


# ---------------------------------------------------------------------------
# Config Flow
# ---------------------------------------------------------------------------

class SFMLStatsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle setup and reconfiguration for SFML Stats. @zara"""

    VERSION = 9

    def __init__(self) -> None:
        """Initialize the config flow. @zara"""
        self._data: dict[str, Any] = {}
        self._reconfigure_entry: config_entries.ConfigEntry | None = None

    # ----- Step 1: Basic setup -----

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure country, household power and weather. @zara"""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            _store(self._data, user_input, BASIC_KEYS)
            return await self.async_step_energy_flows()

        return self.async_show_form(
            step_id="user",
            data_schema=_basic_schema(),
        )

    async def async_step_energy_flows(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure directional power sensors used for daily totals. @zara"""
        if user_input is not None:
            _store(self._data, user_input, ENERGY_FLOW_KEYS)
            return await self.async_step_optional()

        return self.async_show_form(
            step_id="energy_flows",
            data_schema=_energy_flow_schema(),
        )

    # ----- Optional battery sensors -----

    async def async_step_optional(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure optional battery and fallback sensors. @zara"""
        if user_input is not None:
            _store(self._data, user_input, BATTERY_KEYS)
            return await self.async_step_consumers()

        return self.async_show_form(
            step_id="optional",
            data_schema=_battery_schema(),
        )

    async def async_step_consumers(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure the main heat-pump, heating-rod and wallbox sensors. @zara"""
        if user_input is not None:
            _store(self._data, user_input, CONSUMER_KEYS)
            return await self.async_step_consumer_details()
        return self.async_show_form(
            step_id="consumers",
            data_schema=_consumer_schema(),
        )

    async def async_step_consumer_details(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure optional heat-pump and wallbox details. @zara"""
        if user_input is not None:
            _store(self._data, user_input, CONSUMER_DETAIL_KEYS)
            return await self.async_step_pricing()
        return self.async_show_form(
            step_id="consumer_details",
            data_schema=_consumer_detail_schema(),
        )

    # ----- Step 3a: Pricing mode -----

    async def async_step_pricing(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Step 3a — Select price mode, then route to mode-specific step. @zara"""
        if user_input is not None:
            self._data[CONF_BILLING_PRICE_MODE] = user_input[CONF_BILLING_PRICE_MODE]
            mode = user_input[CONF_BILLING_PRICE_MODE]
            if mode == PRICE_MODE_FIXED:
                return await self.async_step_pricing_fixed()
            if mode == PRICE_MODE_DYNAMIC:
                return await self.async_step_pricing_dynamic()
            # PRICE_MODE_NONE — finish directly
            return self._finish_flow()

        return self.async_show_form(
            step_id="pricing",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_PRICE_MODE,
                    default=self._data.get(
                        CONF_BILLING_PRICE_MODE, DEFAULT_BILLING_PRICE_MODE
                    ),
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value=PRICE_MODE_DYNAMIC, label="Dynamic (GPM hourly prices from DB)"),
                            selector.SelectOptionDict(value=PRICE_MODE_FIXED, label="Fixed price"),
                            selector.SelectOptionDict(value=PRICE_MODE_NONE, label="No tariff"),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
            }),
        )

    # ----- Step 3b-fixed: Fixed pricing details -----

    async def async_step_pricing_fixed(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Step 3b — Fixed: work price + grid fees + base fee + feed-in. @zara"""
        if user_input is not None:
            self._data.update(user_input)
            return self._finish_flow()

        return self.async_show_form(
            step_id="pricing_fixed",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_WORK_PRICE,
                    default=self._data.get(
                        CONF_BILLING_WORK_PRICE,
                        self._data.get(
                            CONF_BILLING_FIXED_PRICE, DEFAULT_BILLING_WORK_PRICE
                        ),
                    ),
                ): _number(0, 80, 0.01),
                vol.Required(
                    CONF_BILLING_GRID_FEES,
                    default=self._data.get(
                        CONF_BILLING_GRID_FEES, DEFAULT_BILLING_GRID_FEES
                    ),
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_BILLING_BASE_FEE,
                    default=self._data.get(
                        CONF_BILLING_BASE_FEE, DEFAULT_BILLING_BASE_FEE
                    ),
                ): _number(0, 100, 0.01, unit="EUR/Monat"),
                vol.Required(
                    CONF_FEED_IN_TARIFF,
                    default=self._data.get(
                        CONF_FEED_IN_TARIFF, DEFAULT_FEED_IN_TARIFF
                    ),
                ): _number(0, 50, 0.01),
            }),
        )

    # ----- Step 3b-dynamic: Dynamic pricing details -----

    async def async_step_pricing_dynamic(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Step 3b — Dynamic: base fee + feed-in only (GPM delivers hourly rate) + VAT/fees. @zara"""
        if user_input is not None:
            self._data.update(user_input)
            return self._finish_flow()

        country = self._data.get(CONF_COUNTRY, DEFAULT_COUNTRY)
        default_vat = 20 if country == "AT" else 19

        return self.async_show_form(
            step_id="pricing_dynamic",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_BASE_FEE,
                    default=self._data.get(
                        CONF_BILLING_BASE_FEE, DEFAULT_BILLING_BASE_FEE
                    ),
                ): _number(0, 100, 0.01, unit="EUR/Monat"),
                vol.Required(
                    CONF_FEED_IN_TARIFF,
                    default=self._data.get(
                        CONF_FEED_IN_TARIFF, DEFAULT_FEED_IN_TARIFF
                    ),
                ): _number(0, 50, 0.01),
                vol.Required(
                    CONF_VAT_RATE,
                    default=self._data.get(CONF_VAT_RATE, default_vat),
                ): _number(0, 50, 1, unit="%"),
                vol.Required(
                    CONF_GPM_GRID_FEE,
                    default=self._data.get(CONF_GPM_GRID_FEE, DEFAULT_GPM_GRID_FEE),
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_TAXES_FEES,
                    default=self._data.get(CONF_TAXES_FEES, DEFAULT_TAXES_FEES),
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_PROVIDER_MARKUP,
                    default=self._data.get(
                        CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP
                    ),
                ): _number(0, 20, 0.01),
            }),
        )

    def _finish_flow(self) -> FlowResult:
        """Create or update the config entry after the shared setup steps."""
        self._data.setdefault(CONF_PANEL_GROUP_NAMES, {})
        for key in LEGACY_POWER_ENERGY_SENSOR_KEYS:
            self._data.pop(key, None)
        if self._reconfigure_entry is not None:
            return self.async_update_reload_and_abort(
                self._reconfigure_entry,
                data=self._data,
                reason="reconfigure_successful",
            )
        return self.async_create_entry(title=NAME, data=self._data)

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Update the complete customer-facing configuration. @zara"""
        if self.source != SOURCE_RECONFIGURE:
            return self.async_abort(reason="not_reconfigure")
        if self._reconfigure_entry is None:
            self._reconfigure_entry = self.hass.config_entries.async_get_entry(
                self.context["entry_id"]
            )
            if self._reconfigure_entry is None:
                return self.async_abort(reason="entry_not_found")
            self._data = dict(self._reconfigure_entry.data)

        if user_input is not None:
            _store(self._data, user_input, BASIC_KEYS)
            return await self.async_step_reconfigure_energy_flows()

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=_basic_schema(self._data),
        )

    async def async_step_reconfigure_energy_flows(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Update directional power sensors. @zara"""
        if user_input is not None:
            _store(self._data, user_input, ENERGY_FLOW_KEYS)
            return await self.async_step_reconfigure_optional()
        return self.async_show_form(
            step_id="reconfigure_energy_flows",
            data_schema=_energy_flow_schema(self._data),
        )

    async def async_step_reconfigure_optional(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Update optional battery and fallback sensors. @zara"""
        if user_input is not None:
            _store(self._data, user_input, BATTERY_KEYS)
            return await self.async_step_reconfigure_consumers()
        return self.async_show_form(
            step_id="reconfigure_optional",
            data_schema=_battery_schema(self._data),
        )

    async def async_step_reconfigure_consumers(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Update the main consumer sensors. @zara"""
        if user_input is not None:
            _store(self._data, user_input, CONSUMER_KEYS)
            return await self.async_step_reconfigure_consumer_details()
        return self.async_show_form(
            step_id="reconfigure_consumers",
            data_schema=_consumer_schema(self._data),
        )

    async def async_step_reconfigure_consumer_details(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Update optional heat-pump and wallbox detail sensors. @zara"""
        if user_input is not None:
            _store(self._data, user_input, CONSUMER_DETAIL_KEYS)
            return await self.async_step_pricing()
        return self.async_show_form(
            step_id="reconfigure_consumer_details",
            data_schema=_consumer_detail_schema(self._data),
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> SFMLStatsOptionsFlow:
        """Get the options flow for this handler. @zara"""
        return SFMLStatsOptionsFlow(config_entry)


# ---------------------------------------------------------------------------
# Options Flow — Menu with 3 sub-steps
# ---------------------------------------------------------------------------

class SFMLStatsOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for SFML Stats. @zara"""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow. @zara"""
        self._config_entry = config_entry

    def _current(self, key: str, default: Any = None) -> Any:
        """Get current value from config entry data. @zara"""
        return self._config_entry.data.get(key, default)

    def _save(self, new_data: dict[str, Any]) -> FlowResult:
        """Persist updated data and close. @zara"""
        for key in LEGACY_POWER_ENERGY_SENSOR_KEYS:
            new_data.pop(key, None)
        self.hass.config_entries.async_update_entry(
            self._config_entry, data=new_data,
        )
        return self.async_create_entry(title="", data={})

    # ----- Menu -----

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Options menu — sensors, pricing, advanced. @zara"""
        if user_input is not None:
            choice = user_input.get("menu_choice")
            if choice == "sensors":
                return await self.async_step_sensors()
            if choice == "consumers":
                return await self.async_step_consumers()
            if choice == "pricing":
                return await self.async_step_pricing()
            if choice == "amortization":
                return await self.async_step_amortization()
            if choice == "smart_charging":
                return await self.async_step_smart_charging()
            if choice == "advanced":
                return await self.async_step_advanced()

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required("menu_choice", default="sensors"): vol.In({
                    "sensors": "Sensors",
                    "consumers": "Consumer Details (WP/Wallbox)",
                    "pricing": "Pricing",
                    "amortization": "Amortisation",
                    "smart_charging": "Smart Charging",
                    "advanced": "Advanced",
                }),
            }),
        )

    # ----- Sensors (merged Step 1 + 2) -----

    async def async_step_sensors(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Edit all sensor mappings. @zara"""
        all_keys = [
            CONF_COUNTRY,
            CONF_SENSOR_HOME_CONSUMPTION,
            CONF_SENSOR_SOLAR_TO_HOUSE, CONF_SENSOR_INVERTER_AC_OUTPUT,
            CONF_WEATHER_ENTITY,
            CONF_SENSOR_BATTERY_SOC, CONF_SENSOR_BATTERY_POWER,
            CONF_SENSOR_SOLAR_TO_BATTERY, CONF_SENSOR_BATTERY_TO_HOUSE,
            CONF_SENSOR_GRID_TO_HOUSE, CONF_SENSOR_GRID_TO_BATTERY,
            CONF_SENSOR_HOUSE_TO_GRID,
            CONF_SENSOR_SMARTMETER_IMPORT, CONF_SENSOR_SMARTMETER_EXPORT,
            CONF_SENSOR_GRID_IMPORT_EXTRA,
            CONF_SENSOR_PRICE_TOTAL,
            CONF_SENSOR_HEATPUMP_POWER,
            CONF_SENSOR_HEATINGROD_POWER,
            CONF_SENSOR_WALLBOX_POWER,
            CONF_SENSOR_WALLBOX_STATE,
        ]

        if user_input is not None:
            new_data = {**self._config_entry.data}
            # Country is always present
            new_data[CONF_COUNTRY] = user_input.get(CONF_COUNTRY, DEFAULT_COUNTRY)
            sensor_keys = [k for k in all_keys if k != CONF_COUNTRY]
            _store(new_data, user_input, sensor_keys)
            return self._save(new_data)

        def _sv(key: str) -> dict:
            return {"suggested_value": self._current(key) or None}

        return self.async_show_form(
            step_id="sensors",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_COUNTRY,
                    default=self._current(CONF_COUNTRY, DEFAULT_COUNTRY),
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value="DE", label="Deutschland"),
                            selector.SelectOptionDict(value="AT", label="Oesterreich"),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(CONF_SENSOR_HOME_CONSUMPTION, description=_sv(CONF_SENSOR_HOME_CONSUMPTION)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SOLAR_TO_HOUSE, description=_sv(CONF_SENSOR_SOLAR_TO_HOUSE)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_INVERTER_AC_OUTPUT, description=_sv(CONF_SENSOR_INVERTER_AC_OUTPUT)): _entity(device_class="power"),
                vol.Optional(CONF_WEATHER_ENTITY, description=_sv(CONF_WEATHER_ENTITY)): _entity(domain="weather"),
                vol.Optional(CONF_SENSOR_BATTERY_SOC, description=_sv(CONF_SENSOR_BATTERY_SOC)): _entity(device_class="battery"),
                vol.Optional(CONF_SENSOR_BATTERY_POWER, description=_sv(CONF_SENSOR_BATTERY_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SOLAR_TO_BATTERY, description=_sv(CONF_SENSOR_SOLAR_TO_BATTERY)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_BATTERY_TO_HOUSE, description=_sv(CONF_SENSOR_BATTERY_TO_HOUSE)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_GRID_TO_HOUSE, description=_sv(CONF_SENSOR_GRID_TO_HOUSE)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_GRID_TO_BATTERY, description=_sv(CONF_SENSOR_GRID_TO_BATTERY)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HOUSE_TO_GRID, description=_sv(CONF_SENSOR_HOUSE_TO_GRID)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SMARTMETER_IMPORT, description=_sv(CONF_SENSOR_SMARTMETER_IMPORT)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SMARTMETER_EXPORT, description=_sv(CONF_SENSOR_SMARTMETER_EXPORT)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_GRID_IMPORT_EXTRA, description=_sv(CONF_SENSOR_GRID_IMPORT_EXTRA)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_PRICE_TOTAL, description=_sv(CONF_SENSOR_PRICE_TOTAL)): _entity(device_class="monetary"),
                vol.Optional(CONF_SENSOR_HEATPUMP_POWER, description=_sv(CONF_SENSOR_HEATPUMP_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HEATINGROD_POWER, description=_sv(CONF_SENSOR_HEATINGROD_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_WALLBOX_POWER, description=_sv(CONF_SENSOR_WALLBOX_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_WALLBOX_STATE, description=_sv(CONF_SENSOR_WALLBOX_STATE)): _entity(domain="sensor"),
            }),
        )

    # ----- Consumer Detail Sensors -----

    async def async_step_consumers(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure consumer detail sensors (WP, Heizstab, Wallbox). @zara"""
        consumer_keys = HP_DETAIL_SENSORS + WB_DETAIL_SENSORS

        if user_input is not None:
            new_data = {**self._config_entry.data}
            for key in consumer_keys:
                val = user_input.get(key)
                if val:
                    new_data[key] = val
                elif key in new_data:
                    del new_data[key]
            return self._save(new_data)

        def _sv(key: str) -> dict:
            v = self._current(key)
            return {"suggested_value": v} if v else {}

        return self.async_show_form(
            step_id="consumers",
            data_schema=vol.Schema({
                # Heat Pump Detail
                vol.Optional(CONF_SENSOR_HP_HEATING_MODE, description=_sv(CONF_SENSOR_HP_HEATING_MODE)): _entity(domain="select"),
                vol.Optional(CONF_SENSOR_HP_DHW_MODE, description=_sv(CONF_SENSOR_HP_DHW_MODE)): _entity(domain="select"),
                vol.Optional(CONF_SENSOR_HP_DHW_CHARGING, description=_sv(CONF_SENSOR_HP_DHW_CHARGING)): _entity(domain="binary_sensor"),
                vol.Optional(CONF_SENSOR_HP_PV_ACTIVE, description=_sv(CONF_SENSOR_HP_PV_ACTIVE)): _entity(domain="binary_sensor"),
                vol.Optional(CONF_SENSOR_HP_ELECTRIC_POWER, description=_sv(CONF_SENSOR_HP_ELECTRIC_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HP_THERMAL_POWER, description=_sv(CONF_SENSOR_HP_THERMAL_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HP_GRID_ENERGY_DAILY, description=_sv(CONF_SENSOR_HP_GRID_ENERGY_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_HP_PV_ENERGY_DAILY, description=_sv(CONF_SENSOR_HP_PV_ENERGY_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_HP_JAZ, description=_sv(CONF_SENSOR_HP_JAZ)): _entity(domain="sensor"),
                vol.Optional(CONF_SENSOR_HP_COMPRESSOR_STARTS, description=_sv(CONF_SENSOR_HP_COMPRESSOR_STARTS)): _entity(domain="sensor"),
                vol.Optional(CONF_SENSOR_HP_STORAGE_TEMP, description=_sv(CONF_SENSOR_HP_STORAGE_TEMP)): _entity(device_class="temperature"),
                # Wallbox Detail
                vol.Optional(CONF_SENSOR_WB_CHARGE_MODE, description=_sv(CONF_SENSOR_WB_CHARGE_MODE)): _entity(domain="select"),
                vol.Optional(CONF_SENSOR_WB_ENERGY_SESSION, description=_sv(CONF_SENSOR_WB_ENERGY_SESSION)): _entity(device_class="energy"),
            }),
        )

    # ----- Smart Charging -----

    async def async_step_smart_charging(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Configure smart battery charging (enable, capacity, SOC, price threshold). @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data}
            new_data[CONF_SMART_CHARGING_ENABLED] = bool(user_input.get(CONF_SMART_CHARGING_ENABLED, False))

            for key in (CONF_BATTERY_CAPACITY, CONF_MIN_SOC, CONF_MAX_SOC, CONF_MAX_PRICE, CONF_FORCE_CHARGE_PRICE):
                if key in user_input and user_input[key] is not None:
                    new_data[key] = user_input[key]

            # SOC Sensor
            soc_sensor = user_input.get(CONF_BATTERY_SOC_SENSOR)
            if soc_sensor:
                new_data[CONF_BATTERY_SOC_SENSOR] = soc_sensor
            elif CONF_BATTERY_SOC_SENSOR in new_data:
                del new_data[CONF_BATTERY_SOC_SENSOR]

            # Switch controls
            sc_switch = user_input.get(CONF_SMART_CHARGING_SWITCH)
            if sc_switch:
                new_data[CONF_SMART_CHARGING_SWITCH] = sc_switch
            elif CONF_SMART_CHARGING_SWITCH in new_data:
                del new_data[CONF_SMART_CHARGING_SWITCH]

            # Price sensor
            price_sensor = user_input.get(CONF_SENSOR_PRICE_TOTAL)
            if price_sensor:
                new_data[CONF_SENSOR_PRICE_TOTAL] = price_sensor
            elif CONF_SENSOR_PRICE_TOTAL in new_data:
                del new_data[CONF_SENSOR_PRICE_TOTAL]

            return self._save(new_data)

        def _sv(key: str) -> dict:
            v = self._current(key)
            return {"suggested_value": v} if v else {}

        return self.async_show_form(
            step_id="smart_charging",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_SMART_CHARGING_ENABLED,
                    default=self._current(CONF_SMART_CHARGING_ENABLED, False),
                ): selector.BooleanSelector(),
                vol.Required(
                    CONF_BATTERY_CAPACITY,
                    default=self._current(CONF_BATTERY_CAPACITY, DEFAULT_BATTERY_CAPACITY),
                ): _number(1, 200, 0.1, unit="kWh"),
                vol.Required(
                    CONF_MIN_SOC,
                    default=self._current(CONF_MIN_SOC, DEFAULT_MIN_SOC),
                ): _number(0, 100, 1, unit="%"),
                vol.Required(
                    CONF_MAX_SOC,
                    default=self._current(CONF_MAX_SOC, DEFAULT_MAX_SOC),
                ): _number(0, 100, 1, unit="%"),
                vol.Required(
                    CONF_MAX_PRICE,
                    default=self._current(CONF_MAX_PRICE, DEFAULT_MAX_PRICE),
                ): _number(0, 100, 0.1, unit="ct/kWh"),
                vol.Required(
                    CONF_FORCE_CHARGE_PRICE,
                    default=self._current(CONF_FORCE_CHARGE_PRICE, DEFAULT_FORCE_CHARGE_PRICE),
                ): _number(0, 100, 0.1, unit="ct/kWh"),
                vol.Optional(
                    CONF_BATTERY_SOC_SENSOR,
                    description=_sv(CONF_BATTERY_SOC_SENSOR),
                ): _entity(device_class="battery"),
                vol.Optional(
                    CONF_SMART_CHARGING_SWITCH,
                    description=_sv(CONF_SMART_CHARGING_SWITCH),
                ): _entity(domain="switch"),
                vol.Optional(
                    CONF_SENSOR_PRICE_TOTAL,
                    description=_sv(CONF_SENSOR_PRICE_TOTAL),
                ): _entity(device_class="monetary"),
            }),
        )

    # ----- Pricing (2-step: mode selection + mode-specific fields) -----

    async def async_step_pricing(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Pricing Step 1 — select mode, route to mode-specific form. @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data}
            new_data[CONF_BILLING_PRICE_MODE] = user_input[CONF_BILLING_PRICE_MODE]
            mode = user_input[CONF_BILLING_PRICE_MODE]
            if mode == PRICE_MODE_FIXED:
                self.hass.config_entries.async_update_entry(self._config_entry, data=new_data)
                return await self.async_step_pricing_fixed()
            if mode == PRICE_MODE_DYNAMIC:
                self.hass.config_entries.async_update_entry(self._config_entry, data=new_data)
                return await self.async_step_pricing_dynamic()
            # PRICE_MODE_NONE — save and exit
            return self._save(new_data)

        return self.async_show_form(
            step_id="pricing",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_PRICE_MODE,
                    default=self._current(CONF_BILLING_PRICE_MODE, DEFAULT_BILLING_PRICE_MODE),
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value=PRICE_MODE_DYNAMIC, label="Dynamic (GPM hourly prices from DB)"),
                            selector.SelectOptionDict(value=PRICE_MODE_FIXED, label="Fixed price"),
                            selector.SelectOptionDict(value=PRICE_MODE_NONE, label="No tariff"),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
            }),
        )

    async def async_step_amortization(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Edit PV investment and amortization assumptions. @zara"""
        keys = [
            CONF_AMORTIZATION_INVESTMENT_EUR,
            CONF_AMORTIZATION_SUBSIDY_EUR,
            CONF_AMORTIZATION_COMMISSIONING_DATE,
            CONF_AMORTIZATION_ANNUAL_RUNNING_COSTS_EUR,
            CONF_AMORTIZATION_PRICE_INCREASE_PERCENT,
            CONF_AMORTIZATION_DEGRADATION_PERCENT,
        ]
        if user_input is not None:
            new_data = {**self._config_entry.data}
            for key in keys:
                value = user_input.get(key)
                if value is None or (isinstance(value, str) and not value.strip()):
                    new_data.pop(key, None)
                else:
                    new_data[key] = value
            return self._save(new_data)

        return self.async_show_form(
            step_id="amortization",
            data_schema=vol.Schema({
                vol.Optional(
                    CONF_AMORTIZATION_INVESTMENT_EUR,
                    default=self._current(CONF_AMORTIZATION_INVESTMENT_EUR, DEFAULT_AMORTIZATION_INVESTMENT_EUR),
                ): _number(0, 250000, 100, unit="EUR"),
                vol.Optional(
                    CONF_AMORTIZATION_SUBSIDY_EUR,
                    default=self._current(CONF_AMORTIZATION_SUBSIDY_EUR, DEFAULT_AMORTIZATION_SUBSIDY_EUR),
                ): _number(0, 250000, 100, unit="EUR"),
                vol.Optional(
                    CONF_AMORTIZATION_COMMISSIONING_DATE,
                    default=self._current(CONF_AMORTIZATION_COMMISSIONING_DATE, ""),
                ): str,
                vol.Optional(
                    CONF_AMORTIZATION_ANNUAL_RUNNING_COSTS_EUR,
                    default=self._current(
                        CONF_AMORTIZATION_ANNUAL_RUNNING_COSTS_EUR,
                        DEFAULT_AMORTIZATION_ANNUAL_RUNNING_COSTS_EUR,
                    ),
                ): _number(0, 20000, 10, unit="EUR/Jahr"),
                vol.Optional(
                    CONF_AMORTIZATION_PRICE_INCREASE_PERCENT,
                    default=self._current(
                        CONF_AMORTIZATION_PRICE_INCREASE_PERCENT,
                        DEFAULT_AMORTIZATION_PRICE_INCREASE_PERCENT,
                    ),
                ): _number(-10, 20, 0.1, unit="%/Jahr"),
                vol.Optional(
                    CONF_AMORTIZATION_DEGRADATION_PERCENT,
                    default=self._current(
                        CONF_AMORTIZATION_DEGRADATION_PERCENT,
                        DEFAULT_AMORTIZATION_DEGRADATION_PERCENT,
                    ),
                ): _number(0, 10, 0.1, unit="%/Jahr"),
            }),
        )

    async def async_step_pricing_fixed(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Pricing Step 2 — Fixed: work + grid fees + base + feed-in. @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data, **user_input}
            return self._save(new_data)

        return self.async_show_form(
            step_id="pricing_fixed",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_WORK_PRICE,
                    default=self._current(CONF_BILLING_WORK_PRICE,
                                          self._current(CONF_BILLING_FIXED_PRICE, DEFAULT_BILLING_WORK_PRICE)),
                ): _number(0, 80, 0.01),
                vol.Required(
                    CONF_BILLING_GRID_FEES,
                    default=self._current(CONF_BILLING_GRID_FEES, DEFAULT_BILLING_GRID_FEES),
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_BILLING_BASE_FEE,
                    default=self._current(CONF_BILLING_BASE_FEE, DEFAULT_BILLING_BASE_FEE),
                ): _number(0, 100, 0.01, unit="EUR/Monat"),
                vol.Required(
                    CONF_FEED_IN_TARIFF,
                    default=self._current(CONF_FEED_IN_TARIFF, DEFAULT_FEED_IN_TARIFF),
                ): _number(0, 50, 0.01),
            }),
        )

    async def async_step_pricing_dynamic(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Pricing Step 2 — Dynamic: base fee + feed-in (GPM delivers kWh rate) + VAT/fees. @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data, **user_input}
            return self._save(new_data)

        country = self._current(CONF_COUNTRY, DEFAULT_COUNTRY)
        default_vat = 20 if country == "AT" else 19

        return self.async_show_form(
            step_id="pricing_dynamic",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_BASE_FEE,
                    default=self._current(CONF_BILLING_BASE_FEE, DEFAULT_BILLING_BASE_FEE),
                ): _number(0, 100, 0.01, unit="EUR/Monat"),
                vol.Required(
                    CONF_FEED_IN_TARIFF,
                    default=self._current(CONF_FEED_IN_TARIFF, DEFAULT_FEED_IN_TARIFF),
                ): _number(0, 50, 0.01),
                vol.Required(
                    CONF_VAT_RATE,
                    default=self._current(CONF_VAT_RATE, default_vat),
                ): _number(0, 50, 1, unit="%"),
                vol.Required(
                    CONF_GPM_GRID_FEE,
                    default=self._current(CONF_GPM_GRID_FEE, DEFAULT_GPM_GRID_FEE),
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_TAXES_FEES,
                    default=self._current(CONF_TAXES_FEES, DEFAULT_TAXES_FEES),
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_PROVIDER_MARKUP,
                    default=self._current(CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP),
                ): _number(0, 20, 0.01),
            }),
        )

    # ----- Advanced -----

    async def async_step_advanced(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Advanced: panels, forecast comparison, display settings. @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data}

            # Settings
            if CONF_SHOW_PANEL_GROUPS in user_input:
                new_data[CONF_SHOW_PANEL_GROUPS] = user_input[CONF_SHOW_PANEL_GROUPS]
            # Billing start (convert string dropdown values back to int)
            for key in [CONF_BILLING_START_MONTH, CONF_BILLING_START_DAY]:
                if key in user_input:
                    try:
                        new_data[key] = int(user_input[key])
                    except (ValueError, TypeError):
                        new_data[key] = user_input[key]

            # Panel group names
            raw = user_input.get("panel_group_names_input", "").strip()
            mapping: dict[str, str] = {}
            if raw:
                for entry in raw.split(","):
                    if "=" in entry:
                        old, new = entry.split("=", 1)
                        old, new = old.strip(), new.strip()
                        if old and new:
                            mapping[old] = new
            new_data[CONF_PANEL_GROUP_NAMES] = mapping

            # Forecast comparison
            fc_keys = [
                CONF_FORECAST_ENTITY_1, CONF_FORECAST_ENTITY_1_NAME,
                CONF_FORECAST_ENTITY_2, CONF_FORECAST_ENTITY_2_NAME,
            ]
            _store(new_data, user_input, fc_keys)

            return self._save(new_data)

        def _sv(key: str) -> dict:
            return {"suggested_value": self._current(key) or None}

        existing_mapping = self._current(CONF_PANEL_GROUP_NAMES, {})
        if existing_mapping and isinstance(existing_mapping, dict):
            mapping_default = ", ".join(f"{k}={v}" for k, v in existing_mapping.items())
        else:
            mapping_default = ""

        return self.async_show_form(
            step_id="advanced",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_START_MONTH,
                    default=str(self._current(CONF_BILLING_START_MONTH, DEFAULT_BILLING_START_MONTH)),
                ): selector.SelectSelector(selector.SelectSelectorConfig(
                    options=[selector.SelectOptionDict(value=str(k), label=v) for k, v in MONTHS_EN.items()],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )),
                vol.Required(
                    CONF_BILLING_START_DAY,
                    default=str(self._current(CONF_BILLING_START_DAY, DEFAULT_BILLING_START_DAY)),
                ): selector.SelectSelector(selector.SelectSelectorConfig(
                    options=[selector.SelectOptionDict(value=str(i), label=str(i)) for i in range(1, 29)],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )),
                vol.Optional(
                    CONF_SHOW_PANEL_GROUPS,
                    default=self._current(CONF_SHOW_PANEL_GROUPS, False),
                ): selector.BooleanSelector(),

                # --- Panel Groups ---
                vol.Optional("panel_group_names_input", default=mapping_default): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT, multiline=True)
                ),

                # --- Forecast Comparison ---
                vol.Optional(CONF_FORECAST_ENTITY_1, description=_sv(CONF_FORECAST_ENTITY_1)): _entity(domain="sensor"),
                vol.Optional(CONF_FORECAST_ENTITY_1_NAME, default=self._current(CONF_FORECAST_ENTITY_1_NAME, DEFAULT_FORECAST_ENTITY_1_NAME)): str,
                vol.Optional(CONF_FORECAST_ENTITY_2, description=_sv(CONF_FORECAST_ENTITY_2)): _entity(domain="sensor"),
                vol.Optional(CONF_FORECAST_ENTITY_2_NAME, default=self._current(CONF_FORECAST_ENTITY_2_NAME, DEFAULT_FORECAST_ENTITY_2_NAME)): str,
            }),
        )
