# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Config flow for SFML Stats integration — V7 simplified 3-step setup. @zara"""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    NAME,
    CONF_COUNTRY,
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_HOME_CONSUMPTION_DAILY,
    CONF_SENSOR_SOLAR_TO_HOUSE,
    CONF_WEATHER_ENTITY,
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_BATTERY_POWER,
    CONF_SENSOR_GRID_IMPORT_DAILY,
    CONF_SENSOR_GRID_EXPORT_DAILY,
    CONF_SENSOR_GRID_IMPORT_EXTRA,
    CONF_BILLING_PRICE_MODE,
    CONF_BILLING_FIXED_PRICE,
    CONF_BILLING_WORK_PRICE,
    CONF_BILLING_GRID_FEES,
    CONF_BILLING_BASE_FEE,
    CONF_FEED_IN_TARIFF,
    CONF_PANEL_GROUP_NAMES,
    CONF_SHOW_PANEL_GROUPS,
    CONF_SMART_CHARGING_ENABLED,
    CONF_BATTERY_CAPACITY,
    CONF_MIN_SOC,
    CONF_MAX_SOC,
    CONF_BATTERY_SOC_SENSOR,
    CONF_MAX_PRICE,
    DEFAULT_BATTERY_CAPACITY,
    DEFAULT_MIN_SOC,
    DEFAULT_MAX_SOC,
    DEFAULT_MAX_PRICE,
    CONF_SENSOR_PANEL1_POWER,
    CONF_SENSOR_PANEL2_POWER,
    CONF_SENSOR_PANEL3_POWER,
    CONF_SENSOR_PANEL4_POWER,
    CONF_PANEL1_NAME,
    CONF_PANEL2_NAME,
    CONF_PANEL3_NAME,
    CONF_PANEL4_NAME,
    CONF_FORECAST_ENTITY_1,
    CONF_FORECAST_ENTITY_2,
    CONF_FORECAST_ENTITY_1_NAME,
    CONF_FORECAST_ENTITY_2_NAME,
    DEFAULT_COUNTRY,
    DEFAULT_BILLING_PRICE_MODE,
    DEFAULT_BILLING_FIXED_PRICE,
    DEFAULT_BILLING_WORK_PRICE,
    DEFAULT_BILLING_GRID_FEES,
    DEFAULT_BILLING_BASE_FEE,
    DEFAULT_FEED_IN_TARIFF,
    DEFAULT_FORECAST_ENTITY_1_NAME,
    DEFAULT_FORECAST_ENTITY_2_NAME,
    DEFAULT_PANEL1_NAME,
    DEFAULT_PANEL2_NAME,
    DEFAULT_PANEL3_NAME,
    DEFAULT_PANEL4_NAME,
    PRICE_MODE_DYNAMIC,
    PRICE_MODE_FIXED,
    PRICE_MODE_NONE,
    CONF_THEME,
    CONF_DASHBOARD_STYLE,
    DEFAULT_THEME,
    DEFAULT_DASHBOARD_STYLE,
    THEME_DARK,
    THEME_LIGHT,
    DASHBOARD_STYLE_3D,
    DASHBOARD_STYLE_2D,
    CONF_BILLING_START_DAY,
    CONF_BILLING_START_MONTH,
    DEFAULT_BILLING_START_DAY,
    DEFAULT_BILLING_START_MONTH,
    CONF_SENSOR_SOLAR_TO_BATTERY,
    CONF_SENSOR_BATTERY_TO_HOUSE,
    CONF_SENSOR_BATTERY_TO_GRID,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_BATTERY_CHARGE_SOLAR_DAILY,
    CONF_SENSOR_BATTERY_CHARGE_GRID_DAILY,
    CONF_SENSOR_BATTERY_DISCHARGE_DAILY,
    CONF_SENSOR_GRID_IMPORT_YEARLY,
    CONF_SENSOR_PRICE_TOTAL,
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_SMARTMETER_EXPORT,
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HEATPUMP_DAILY,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_HEATINGROD_DAILY,
    CONF_SENSOR_WALLBOX_POWER,
    CONF_SENSOR_WALLBOX_DAILY,
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


# ---------------------------------------------------------------------------
# Config Flow — 3 Steps
# ---------------------------------------------------------------------------

class SFMLStatsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for SFML Stats — 3-step setup. @zara"""

    VERSION = 7

    def __init__(self) -> None:
        """Initialize the config flow. @zara"""
        self._data: dict[str, Any] = {}

    # ----- Step 1: Basic setup -----

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Step 1 — Country, required sensors, optional weather. @zara"""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_optional()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_COUNTRY, default=DEFAULT_COUNTRY,
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value="DE", label="Deutschland"),
                            selector.SelectOptionDict(value="AT", label="Oesterreich"),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Required(CONF_SENSOR_HOME_CONSUMPTION): _entity(device_class="power"),
                vol.Required(CONF_SENSOR_HOME_CONSUMPTION_DAILY): _entity(device_class="energy"),
                vol.Required(CONF_SENSOR_SOLAR_TO_HOUSE): _entity(device_class="power"),
                vol.Optional(CONF_WEATHER_ENTITY): _entity(domain="weather"),
            }),
        )

    # ----- Step 2: Optional sensors -----

    async def async_step_optional(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Step 2 — Battery + Grid sensors (skippable). @zara"""
        if user_input is not None:
            opt_keys = [
                CONF_SENSOR_BATTERY_SOC, CONF_SENSOR_BATTERY_POWER,
                CONF_SENSOR_GRID_IMPORT_DAILY, CONF_SENSOR_GRID_EXPORT_DAILY,
                CONF_SENSOR_GRID_IMPORT_EXTRA,
            ]
            _store(self._data, user_input, opt_keys)
            return await self.async_step_pricing()

        return self.async_show_form(
            step_id="optional",
            data_schema=vol.Schema({
                vol.Optional(CONF_SENSOR_BATTERY_SOC): _entity(device_class="battery"),
                vol.Optional(CONF_SENSOR_BATTERY_POWER): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_GRID_IMPORT_DAILY): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_GRID_EXPORT_DAILY): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_GRID_IMPORT_EXTRA): _entity(device_class="energy"),
            }),
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
            self._data.setdefault(CONF_PANEL_GROUP_NAMES, {})
            return self.async_create_entry(title=NAME, data=self._data)

        return self.async_show_form(
            step_id="pricing",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_PRICE_MODE, default=DEFAULT_BILLING_PRICE_MODE,
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
            self._data.setdefault(CONF_PANEL_GROUP_NAMES, {})
            return self.async_create_entry(title=NAME, data=self._data)

        return self.async_show_form(
            step_id="pricing_fixed",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_WORK_PRICE, default=DEFAULT_BILLING_WORK_PRICE,
                ): _number(0, 80, 0.01),
                vol.Required(
                    CONF_BILLING_GRID_FEES, default=DEFAULT_BILLING_GRID_FEES,
                ): _number(0, 30, 0.01),
                vol.Required(
                    CONF_BILLING_BASE_FEE, default=DEFAULT_BILLING_BASE_FEE,
                ): _number(0, 100, 0.01, unit="EUR/Monat"),
                vol.Required(
                    CONF_FEED_IN_TARIFF, default=DEFAULT_FEED_IN_TARIFF,
                ): _number(0, 50, 0.01),
            }),
        )

    # ----- Step 3b-dynamic: Dynamic pricing details -----

    async def async_step_pricing_dynamic(
        self, user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Step 3b — Dynamic: base fee + feed-in only (GPM delivers hourly rate). @zara"""
        if user_input is not None:
            self._data.update(user_input)
            self._data.setdefault(CONF_PANEL_GROUP_NAMES, {})
            return self.async_create_entry(title=NAME, data=self._data)

        return self.async_show_form(
            step_id="pricing_dynamic",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_BILLING_BASE_FEE, default=DEFAULT_BILLING_BASE_FEE,
                ): _number(0, 100, 0.01, unit="EUR/Monat"),
                vol.Required(
                    CONF_FEED_IN_TARIFF, default=DEFAULT_FEED_IN_TARIFF,
                ): _number(0, 50, 0.01),
            }),
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
            CONF_SENSOR_HOME_CONSUMPTION, CONF_SENSOR_HOME_CONSUMPTION_DAILY,
            CONF_SENSOR_SOLAR_TO_HOUSE, CONF_WEATHER_ENTITY,
            CONF_SENSOR_BATTERY_SOC, CONF_SENSOR_BATTERY_POWER,
            CONF_SENSOR_SOLAR_TO_BATTERY, CONF_SENSOR_BATTERY_TO_HOUSE,
            CONF_SENSOR_BATTERY_TO_GRID, CONF_SENSOR_BATTERY_CHARGE_SOLAR_DAILY,
            CONF_SENSOR_BATTERY_CHARGE_GRID_DAILY, CONF_SENSOR_BATTERY_DISCHARGE_DAILY,
            CONF_SENSOR_GRID_TO_HOUSE, CONF_SENSOR_GRID_TO_BATTERY,
            CONF_SENSOR_HOUSE_TO_GRID,
            CONF_SENSOR_SMARTMETER_IMPORT, CONF_SENSOR_SMARTMETER_EXPORT,
            CONF_SENSOR_GRID_IMPORT_DAILY, CONF_SENSOR_GRID_EXPORT_DAILY,
            CONF_SENSOR_GRID_IMPORT_EXTRA,
            CONF_SENSOR_GRID_IMPORT_YEARLY,
            CONF_SENSOR_PRICE_TOTAL,
            CONF_SENSOR_HEATPUMP_POWER, CONF_SENSOR_HEATPUMP_DAILY,
            CONF_SENSOR_HEATINGROD_POWER, CONF_SENSOR_HEATINGROD_DAILY,
            CONF_SENSOR_WALLBOX_POWER, CONF_SENSOR_WALLBOX_DAILY,
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
                vol.Optional(CONF_SENSOR_HOME_CONSUMPTION_DAILY, description=_sv(CONF_SENSOR_HOME_CONSUMPTION_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_SOLAR_TO_HOUSE, description=_sv(CONF_SENSOR_SOLAR_TO_HOUSE)): _entity(device_class="power"),
                vol.Optional(CONF_WEATHER_ENTITY, description=_sv(CONF_WEATHER_ENTITY)): _entity(domain="weather"),
                vol.Optional(CONF_SENSOR_BATTERY_SOC, description=_sv(CONF_SENSOR_BATTERY_SOC)): _entity(device_class="battery"),
                vol.Optional(CONF_SENSOR_BATTERY_POWER, description=_sv(CONF_SENSOR_BATTERY_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SOLAR_TO_BATTERY, description=_sv(CONF_SENSOR_SOLAR_TO_BATTERY)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_BATTERY_TO_HOUSE, description=_sv(CONF_SENSOR_BATTERY_TO_HOUSE)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_BATTERY_TO_GRID, description=_sv(CONF_SENSOR_BATTERY_TO_GRID)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_BATTERY_CHARGE_SOLAR_DAILY, description=_sv(CONF_SENSOR_BATTERY_CHARGE_SOLAR_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_BATTERY_CHARGE_GRID_DAILY, description=_sv(CONF_SENSOR_BATTERY_CHARGE_GRID_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_BATTERY_DISCHARGE_DAILY, description=_sv(CONF_SENSOR_BATTERY_DISCHARGE_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_GRID_TO_HOUSE, description=_sv(CONF_SENSOR_GRID_TO_HOUSE)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_GRID_TO_BATTERY, description=_sv(CONF_SENSOR_GRID_TO_BATTERY)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HOUSE_TO_GRID, description=_sv(CONF_SENSOR_HOUSE_TO_GRID)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SMARTMETER_IMPORT, description=_sv(CONF_SENSOR_SMARTMETER_IMPORT)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_SMARTMETER_EXPORT, description=_sv(CONF_SENSOR_SMARTMETER_EXPORT)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_GRID_IMPORT_DAILY, description=_sv(CONF_SENSOR_GRID_IMPORT_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_GRID_EXPORT_DAILY, description=_sv(CONF_SENSOR_GRID_EXPORT_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_GRID_IMPORT_EXTRA, description=_sv(CONF_SENSOR_GRID_IMPORT_EXTRA)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_GRID_IMPORT_YEARLY, description=_sv(CONF_SENSOR_GRID_IMPORT_YEARLY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_PRICE_TOTAL, description=_sv(CONF_SENSOR_PRICE_TOTAL)): _entity(device_class="monetary"),
                vol.Optional(CONF_SENSOR_HEATPUMP_POWER, description=_sv(CONF_SENSOR_HEATPUMP_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HEATPUMP_DAILY, description=_sv(CONF_SENSOR_HEATPUMP_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_HEATINGROD_POWER, description=_sv(CONF_SENSOR_HEATINGROD_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_HEATINGROD_DAILY, description=_sv(CONF_SENSOR_HEATINGROD_DAILY)): _entity(device_class="energy"),
                vol.Optional(CONF_SENSOR_WALLBOX_POWER, description=_sv(CONF_SENSOR_WALLBOX_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_SENSOR_WALLBOX_DAILY, description=_sv(CONF_SENSOR_WALLBOX_DAILY)): _entity(device_class="energy"),
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

            for key in (CONF_BATTERY_CAPACITY, CONF_MIN_SOC, CONF_MAX_SOC, CONF_MAX_PRICE):
                if key in user_input and user_input[key] is not None:
                    new_data[key] = user_input[key]

            soc_sensor = user_input.get(CONF_BATTERY_SOC_SENSOR)
            if soc_sensor:
                new_data[CONF_BATTERY_SOC_SENSOR] = soc_sensor
            elif CONF_BATTERY_SOC_SENSOR in new_data and not soc_sensor:
                del new_data[CONF_BATTERY_SOC_SENSOR]

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
                vol.Optional(
                    CONF_BATTERY_SOC_SENSOR,
                    description=_sv(CONF_BATTERY_SOC_SENSOR),
                ): _entity(device_class="battery"),
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
        """Pricing Step 2 — Dynamic: base fee + feed-in (GPM delivers kWh rate). @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data, **user_input}
            return self._save(new_data)

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
            for key in [
                CONF_THEME, CONF_DASHBOARD_STYLE,
                CONF_SHOW_PANEL_GROUPS,
            ]:
                if key in user_input:
                    new_data[key] = user_input[key]
            # Billing start (convert string dropdown values back to int)
            for key in [CONF_BILLING_START_MONTH, CONF_BILLING_START_DAY]:
                if key in user_input:
                    try:
                        new_data[key] = int(user_input[key])
                    except (ValueError, TypeError):
                        new_data[key] = user_input[key]

            # Panel names + sensors
            panel_keys = [
                CONF_PANEL1_NAME, CONF_SENSOR_PANEL1_POWER,
                CONF_PANEL2_NAME, CONF_SENSOR_PANEL2_POWER,
                CONF_PANEL3_NAME, CONF_SENSOR_PANEL3_POWER,
                CONF_PANEL4_NAME, CONF_SENSOR_PANEL4_POWER,
            ]
            _store(new_data, user_input, panel_keys)

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

        days = {i: str(i) for i in range(1, 29)}

        return self.async_show_form(
            step_id="advanced",
            data_schema=vol.Schema({
                # --- Display Settings ---
                vol.Required(
                    CONF_THEME,
                    default=self._current(CONF_THEME, DEFAULT_THEME),
                ): vol.In({THEME_DARK: "Dark", THEME_LIGHT: "Light"}),
                vol.Required(
                    CONF_DASHBOARD_STYLE,
                    default=self._current(CONF_DASHBOARD_STYLE, DEFAULT_DASHBOARD_STYLE),
                ): vol.In({DASHBOARD_STYLE_3D: "3D Isometric", DASHBOARD_STYLE_2D: "2D Classic"}),
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
                vol.Optional(CONF_PANEL1_NAME, default=self._current(CONF_PANEL1_NAME, DEFAULT_PANEL1_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL1_POWER, description=_sv(CONF_SENSOR_PANEL1_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_PANEL2_NAME, default=self._current(CONF_PANEL2_NAME, DEFAULT_PANEL2_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL2_POWER, description=_sv(CONF_SENSOR_PANEL2_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_PANEL3_NAME, default=self._current(CONF_PANEL3_NAME, DEFAULT_PANEL3_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL3_POWER, description=_sv(CONF_SENSOR_PANEL3_POWER)): _entity(device_class="power"),
                vol.Optional(CONF_PANEL4_NAME, default=self._current(CONF_PANEL4_NAME, DEFAULT_PANEL4_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL4_POWER, description=_sv(CONF_SENSOR_PANEL4_POWER)): _entity(device_class="power"),
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
