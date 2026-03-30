# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Config flow for SFML Stats integration. @zara"""
from __future__ import annotations

import logging
import platform
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    DOMAIN,
    NAME,
    CONF_GENERATE_WEEKLY,
    CONF_GENERATE_MONTHLY,
    CONF_AUTO_GENERATE,
    CONF_THEME,
    CONF_DASHBOARD_STYLE,
    DEFAULT_GENERATE_WEEKLY,
    DEFAULT_GENERATE_MONTHLY,
    DEFAULT_AUTO_GENERATE,
    DEFAULT_THEME,
    DEFAULT_DASHBOARD_STYLE,
    THEME_DARK,
    THEME_LIGHT,
    DASHBOARD_STYLE_3D,
    DASHBOARD_STYLE_2D,
    CONF_SENSOR_SOLAR_TO_HOUSE,
    CONF_SENSOR_SOLAR_TO_BATTERY,
    CONF_SENSOR_BATTERY_TO_HOUSE,
    CONF_SENSOR_BATTERY_TO_GRID,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_BATTERY_POWER,
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_GRID_IMPORT_DAILY,
    CONF_SENSOR_GRID_IMPORT_YEARLY,
    CONF_SENSOR_BATTERY_CHARGE_SOLAR_DAILY,
    CONF_SENSOR_BATTERY_CHARGE_GRID_DAILY,
    CONF_SENSOR_BATTERY_DISCHARGE_DAILY,
    CONF_SENSOR_GRID_EXPORT_DAILY,
    CONF_SENSOR_HOME_CONSUMPTION_DAILY,
    CONF_SENSOR_PRICE_TOTAL,
    CONF_WEATHER_ENTITY,
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_SMARTMETER_EXPORT,
    CONF_SENSOR_PANEL1_POWER,
    CONF_SENSOR_PANEL2_POWER,
    CONF_SENSOR_PANEL3_POWER,
    CONF_SENSOR_PANEL4_POWER,
    CONF_PANEL1_NAME,
    CONF_PANEL2_NAME,
    CONF_PANEL3_NAME,
    CONF_PANEL4_NAME,
    DEFAULT_PANEL1_NAME,
    DEFAULT_PANEL2_NAME,
    DEFAULT_PANEL3_NAME,
    DEFAULT_PANEL4_NAME,
    CONF_BILLING_START_DAY,
    CONF_BILLING_START_MONTH,
    CONF_BILLING_PRICE_MODE,
    CONF_BILLING_FIXED_PRICE,
    CONF_FEED_IN_TARIFF,
    DEFAULT_BILLING_START_DAY,
    DEFAULT_BILLING_START_MONTH,
    DEFAULT_BILLING_PRICE_MODE,
    DEFAULT_BILLING_FIXED_PRICE,
    DEFAULT_FEED_IN_TARIFF,
    PRICE_MODE_DYNAMIC,
    PRICE_MODE_FIXED,
    PRICE_MODE_NONE,
    CONF_PANEL_GROUP_NAMES,
    CONF_SHOW_PANEL_GROUPS,
    CONF_FORECAST_ENTITY_1,
    CONF_FORECAST_ENTITY_2,
    CONF_FORECAST_ENTITY_1_NAME,
    CONF_FORECAST_ENTITY_2_NAME,
    DEFAULT_FORECAST_ENTITY_1_NAME,
    DEFAULT_FORECAST_ENTITY_2_NAME,
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HEATPUMP_DAILY,
    CONF_SENSOR_HEATPUMP_COP,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_HEATINGROD_DAILY,
    CONF_SENSOR_WALLBOX_POWER,
    CONF_SENSOR_WALLBOX_DAILY,
    CONF_SENSOR_WALLBOX_STATE,
)
from .sensor_helpers import check_and_suggest_helpers

_LOGGER = logging.getLogger(__name__)

MONTHS_EN = {
    1: "January", 2: "February", 3: "March", 4: "April",
    5: "May", 6: "June", 7: "July", 8: "August",
    9: "September", 10: "October", 11: "November", 12: "December"
}

REQUIRED_SENSOR_KEYS = [
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_HOME_CONSUMPTION_DAILY,
    CONF_SENSOR_SOLAR_TO_HOUSE,
]

BATTERY_SENSOR_KEYS = [
    CONF_SENSOR_SOLAR_TO_BATTERY,
    CONF_SENSOR_BATTERY_CHARGE_SOLAR_DAILY,
    CONF_SENSOR_BATTERY_TO_HOUSE,
    CONF_SENSOR_BATTERY_DISCHARGE_DAILY,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_BATTERY_CHARGE_GRID_DAILY,
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_BATTERY_TO_GRID,
    CONF_SENSOR_BATTERY_POWER,
]

SMARTMETER_SENSOR_KEYS = [
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_GRID_IMPORT_DAILY,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_SMARTMETER_EXPORT,
    CONF_SENSOR_GRID_EXPORT_DAILY,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_GRID_IMPORT_YEARLY,
]

OTHER_SENSOR_KEYS = [
    CONF_SENSOR_PRICE_TOTAL,
    CONF_WEATHER_ENTITY,
]

LEGACY_SENSOR_KEYS = []

ALL_SENSOR_KEYS = (
    REQUIRED_SENSOR_KEYS +
    BATTERY_SENSOR_KEYS +
    SMARTMETER_SENSOR_KEYS +
    OTHER_SENSOR_KEYS +
    LEGACY_SENSOR_KEYS
)

CONSUMER_SENSOR_KEYS = [
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HEATPUMP_DAILY,
    CONF_SENSOR_HEATPUMP_COP,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_HEATINGROD_DAILY,
    CONF_SENSOR_WALLBOX_POWER,
    CONF_SENSOR_WALLBOX_DAILY,
    CONF_SENSOR_WALLBOX_STATE,
]


def _is_raspberry_pi() -> bool:
    """Check if the system is running on a Raspberry Pi. @zara"""
    try:
        machine = platform.machine().lower()
        if machine in ('armv7l', 'aarch64', 'armv6l'):
            try:
                with open('/proc/cpuinfo', 'r') as f:
                    cpuinfo = f.read().lower()
                    if 'raspberry pi' in cpuinfo or 'bcm' in cpuinfo:
                        return True
            except (FileNotFoundError, PermissionError):
                _LOGGER.warning(
                    "Cannot read /proc/cpuinfo, but ARM architecture detected (%s). "
                    "Assuming Raspberry Pi for safety.", machine
                )
                return True
        return False
    except Exception as e:
        _LOGGER.error("Error detecting Raspberry Pi: %s", e)
        return False


def _is_proxmox() -> bool:
    """Check if the system is running on Proxmox VE. @zara"""
    try:
        proxmox_indicators = [
            '/etc/pve',
            '/usr/bin/pvesh',
            '/usr/bin/pveversion',
        ]
        for indicator in proxmox_indicators:
            try:
                from pathlib import Path
                if Path(indicator).exists():
                    _LOGGER.info("Proxmox VE detected via %s", indicator)
                    return True
            except Exception:
                pass
        try:
            import os
            kernel_version = os.uname().release.lower()
            if 'pve' in kernel_version:
                _LOGGER.info("Proxmox VE detected via kernel version: %s", kernel_version)
                return True
        except Exception:
            pass
        return False
    except Exception as e:
        _LOGGER.error("Error detecting Proxmox: %s", e)
        return False


def _get_entity_selector(key: str) -> selector.EntitySelector:
    """Create an entity selector with domain based on key. @zara"""
    domain = "weather" if key == CONF_WEATHER_ENTITY else "sensor"
    return selector.EntitySelector(
        selector.EntitySelectorConfig(
            domain=domain,
            multiple=False,
        )
    )


def _build_setup_sensor_schema(sensor_keys: list[str]) -> vol.Schema:
    """Build schema for setup sensor configuration. @zara"""
    schema_dict = {}
    for key in sensor_keys:
        schema_dict[vol.Optional(key)] = _get_entity_selector(key)
    return vol.Schema(schema_dict)


class SFMLStatsConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for SFML Stats. @zara"""

    VERSION = 6

    def __init__(self) -> None:
        """Initialize the config flow. @zara"""
        self._data: dict[str, Any] = {}
        self._helper_yaml: str = ""

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle the initial step - Welcome screen. @zara"""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if _is_raspberry_pi():
            _LOGGER.error(
                "Installation on Raspberry Pi is not supported due to performance limitations."
            )
            return self.async_abort(reason="raspberry_pi_not_supported")

        if _is_proxmox():
            _LOGGER.warning(
                "Installation on Proxmox VE detected. Running HA directly on Proxmox is not recommended."
            )
            return self.async_abort(reason="proxmox_not_recommended")

        if user_input is not None:
            return await self.async_step_sensors_setup()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
        )

    async def async_step_sensors_setup(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle main sensor configuration. @zara"""
        sensor_keys = REQUIRED_SENSOR_KEYS + OTHER_SENSOR_KEYS

        if user_input is not None:
            for key, value in user_input.items():
                if value is not None and isinstance(value, str) and value.strip():
                    self._data[key] = value.strip()
            return await self.async_step_battery_setup()

        return self.async_show_form(
            step_id="sensors_setup",
            data_schema=_build_setup_sensor_schema(sensor_keys),
        )

    async def async_step_battery_setup(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle battery sensor configuration (optional). @zara"""
        if user_input is not None:
            for key, value in user_input.items():
                if value is not None and isinstance(value, str) and value.strip():
                    self._data[key] = value.strip()
            return await self.async_step_smartmeter_setup()

        return self.async_show_form(
            step_id="battery_setup",
            data_schema=_build_setup_sensor_schema(BATTERY_SENSOR_KEYS),
        )

    async def async_step_smartmeter_setup(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle smartmeter sensor configuration (optional). @zara"""
        if user_input is not None:
            for key, value in user_input.items():
                if value is not None and isinstance(value, str) and value.strip():
                    self._data[key] = value.strip()
            return await self.async_step_helpers()

        return self.async_show_form(
            step_id="smartmeter_setup",
            data_schema=_build_setup_sensor_schema(SMARTMETER_SENSOR_KEYS),
        )

    async def async_step_helpers(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle helper check - Check for missing kWh sensors. @zara"""
        if user_input is not None:
            return await self.async_step_settings()

        missing_helpers, self._helper_yaml = await check_and_suggest_helpers(
            self.hass,
            self._data,
        )

        if not missing_helpers:
            return await self.async_step_settings()

        missing_names = [h.friendly_name for h in missing_helpers]

        return self.async_show_form(
            step_id="helpers",
            data_schema=vol.Schema({
                vol.Optional("show_yaml", default=False): bool,
            }),
            description_placeholders={
                "missing_count": str(len(missing_helpers)),
                "missing_sensors": ", ".join(missing_names),
                "yaml_config": self._helper_yaml,
            },
        )

    async def async_step_settings(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Handle settings - General settings. @zara"""
        if user_input is not None:
            self._data.update(user_input)
            self._data[CONF_PANEL_GROUP_NAMES] = {}
            return self.async_create_entry(
                title=NAME,
                data=self._data,
            )

        days = {i: str(i) for i in range(1, 29)}

        return self.async_show_form(
            step_id="settings",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_AUTO_GENERATE,
                    default=DEFAULT_AUTO_GENERATE,
                ): bool,
                vol.Required(
                    CONF_GENERATE_WEEKLY,
                    default=DEFAULT_GENERATE_WEEKLY,
                ): bool,
                vol.Required(
                    CONF_GENERATE_MONTHLY,
                    default=DEFAULT_GENERATE_MONTHLY,
                ): bool,
                vol.Required(
                    CONF_THEME,
                    default=DEFAULT_THEME,
                ): vol.In({
                    THEME_DARK: "Dark",
                    THEME_LIGHT: "Light",
                }),
                vol.Required(
                    CONF_DASHBOARD_STYLE,
                    default=DEFAULT_DASHBOARD_STYLE,
                ): vol.In({
                    DASHBOARD_STYLE_3D: "3D Isometric",
                    DASHBOARD_STYLE_2D: "2D Classic",
                }),
                vol.Required(
                    CONF_BILLING_START_MONTH,
                    default=DEFAULT_BILLING_START_MONTH,
                ): vol.In(MONTHS_EN),
                vol.Required(
                    CONF_BILLING_START_DAY,
                    default=DEFAULT_BILLING_START_DAY,
                ): vol.In(days),
                vol.Required(
                    CONF_BILLING_PRICE_MODE,
                    default=DEFAULT_BILLING_PRICE_MODE,
                ): vol.In({
                    PRICE_MODE_DYNAMIC: "Dynamic (hourly prices)",
                    PRICE_MODE_FIXED: "Fixed price",
                    PRICE_MODE_NONE: "No tariff",
                }),
                vol.Required(
                    CONF_BILLING_FIXED_PRICE,
                    default=DEFAULT_BILLING_FIXED_PRICE,
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0,
                        max=100,
                        step=0.01,
                        unit_of_measurement="ct/kWh",
                        mode=selector.NumberSelectorMode.BOX,
                    )
                ),
                vol.Required(
                    CONF_FEED_IN_TARIFF,
                    default=DEFAULT_FEED_IN_TARIFF,
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0,
                        max=50,
                        step=0.1,
                        unit_of_measurement="ct/kWh",
                        mode=selector.NumberSelectorMode.BOX,
                    )
                ),
            }),
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> SFMLStatsOptionsFlow:
        """Get the options flow for this handler. @zara"""
        return SFMLStatsOptionsFlow(config_entry)


class SFMLStatsOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for SFML Stats. @zara"""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow. @zara"""
        self._config_entry = config_entry

    def _process_sensor_input(
        self,
        user_input: dict[str, Any],
        sensor_keys: list[str],
    ) -> dict[str, Any]:
        """Process sensor input and update config entry data. @zara"""
        new_data = {**self._config_entry.data}
        for key in sensor_keys:
            value = user_input.get(key)
            if value is None or (isinstance(value, str) and not value.strip()):
                new_data.pop(key, None)
            else:
                new_data[key] = value
        return new_data

    def _build_sensor_schema(
        self,
        sensor_keys: list[str],
    ) -> vol.Schema:
        """Build schema for sensor configuration form. @zara"""
        current = self._config_entry.data
        schema_dict = {}
        for key in sensor_keys:
            schema_dict[vol.Optional(
                key,
                description={"suggested_value": current.get(key) or None}
            )] = _get_entity_selector(key)
        return vol.Schema(schema_dict)

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage the options - Simplified Menu. @zara"""
        if user_input is not None:
            next_step = user_input.get("menu_choice")
            if next_step == "sensors_main":
                return await self.async_step_sensors_main()
            elif next_step == "sensors_battery":
                return await self.async_step_sensors_battery()
            elif next_step == "sensors_smartmeter":
                return await self.async_step_sensors_smartmeter()
            elif next_step == "consumers":
                return await self.async_step_consumers()
            elif next_step == "settings":
                return await self.async_step_settings()
            elif next_step == "advanced":
                return await self.async_step_advanced()

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required("menu_choice", default="sensors_main"): vol.In({
                    "sensors_main": "Main Sensors (Required)",
                    "sensors_battery": "Battery Sensors (Optional)",
                    "sensors_smartmeter": "Smartmeter (Optional)",
                    "consumers": "Consumers (Heat Pump, Heating Rod, Wallbox)",
                    "settings": "Settings",
                    "advanced": "Advanced",
                }),
            }),
        )

    async def async_step_sensors_main(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage main/required sensors. @zara"""
        sensor_keys = REQUIRED_SENSOR_KEYS + OTHER_SENSOR_KEYS

        if user_input is not None:
            new_data = self._process_sensor_input(user_input, sensor_keys)
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="sensors_main",
            data_schema=self._build_sensor_schema(sensor_keys),
        )

    async def async_step_sensors_battery(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage battery sensors. @zara"""
        if user_input is not None:
            new_data = self._process_sensor_input(user_input, BATTERY_SENSOR_KEYS)
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="sensors_battery",
            data_schema=self._build_sensor_schema(BATTERY_SENSOR_KEYS),
        )

    async def async_step_sensors_smartmeter(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage smartmeter sensors. @zara"""
        if user_input is not None:
            new_data = self._process_sensor_input(user_input, SMARTMETER_SENSOR_KEYS)
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="sensors_smartmeter",
            data_schema=self._build_sensor_schema(SMARTMETER_SENSOR_KEYS),
        )

    async def async_step_sensors(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Legacy: Manage ALL sensor options on one page. @zara"""
        if user_input is not None:
            new_data = self._process_sensor_input(user_input, ALL_SENSOR_KEYS)
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="sensors",
            data_schema=self._build_sensor_schema(ALL_SENSOR_KEYS),
        )

    async def async_step_consumers(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage consumer sensor options. @zara"""
        if user_input is not None:
            new_data = self._process_sensor_input(user_input, CONSUMER_SENSOR_KEYS)
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="consumers",
            data_schema=self._build_sensor_schema(CONSUMER_SENSOR_KEYS),
        )

    async def async_step_settings(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage settings - Theme, billing, reports. @zara"""
        if user_input is not None:
            new_data = {**self._config_entry.data, **user_input}
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        current = self._config_entry.data
        days = {i: str(i) for i in range(1, 29)}

        return self.async_show_form(
            step_id="settings",
            data_schema=vol.Schema({
                vol.Required(
                    CONF_AUTO_GENERATE,
                    default=current.get(CONF_AUTO_GENERATE, DEFAULT_AUTO_GENERATE),
                ): bool,
                vol.Required(
                    CONF_GENERATE_WEEKLY,
                    default=current.get(CONF_GENERATE_WEEKLY, DEFAULT_GENERATE_WEEKLY),
                ): bool,
                vol.Required(
                    CONF_GENERATE_MONTHLY,
                    default=current.get(CONF_GENERATE_MONTHLY, DEFAULT_GENERATE_MONTHLY),
                ): bool,
                vol.Required(
                    CONF_THEME,
                    default=current.get(CONF_THEME, DEFAULT_THEME),
                ): vol.In({
                    THEME_DARK: "Dark",
                    THEME_LIGHT: "Light",
                }),
                vol.Required(
                    CONF_DASHBOARD_STYLE,
                    default=current.get(CONF_DASHBOARD_STYLE, DEFAULT_DASHBOARD_STYLE),
                ): vol.In({
                    DASHBOARD_STYLE_3D: "3D Isometric",
                    DASHBOARD_STYLE_2D: "2D Classic",
                }),
                vol.Required(
                    CONF_BILLING_START_MONTH,
                    default=current.get(CONF_BILLING_START_MONTH, DEFAULT_BILLING_START_MONTH),
                ): vol.In(MONTHS_EN),
                vol.Required(
                    CONF_BILLING_START_DAY,
                    default=current.get(CONF_BILLING_START_DAY, DEFAULT_BILLING_START_DAY),
                ): vol.In(days),
                vol.Required(
                    CONF_BILLING_PRICE_MODE,
                    default=current.get(CONF_BILLING_PRICE_MODE, DEFAULT_BILLING_PRICE_MODE),
                ): vol.In({
                    PRICE_MODE_DYNAMIC: "Dynamic (hourly prices)",
                    PRICE_MODE_FIXED: "Fixed price",
                    PRICE_MODE_NONE: "No tariff",
                }),
                vol.Required(
                    CONF_BILLING_FIXED_PRICE,
                    default=current.get(CONF_BILLING_FIXED_PRICE, DEFAULT_BILLING_FIXED_PRICE),
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0,
                        max=100,
                        step=0.01,
                        unit_of_measurement="ct/kWh",
                        mode=selector.NumberSelectorMode.BOX,
                    )
                ),
                vol.Required(
                    CONF_FEED_IN_TARIFF,
                    default=current.get(CONF_FEED_IN_TARIFF, DEFAULT_FEED_IN_TARIFF),
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=0,
                        max=50,
                        step=0.1,
                        unit_of_measurement="ct/kWh",
                        mode=selector.NumberSelectorMode.BOX,
                    )
                ),
            }),
        )

    async def async_step_advanced(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Advanced options sub-menu. @zara"""
        if user_input is not None:
            next_step = user_input.get("menu_choice")
            if next_step == "panels":
                return await self.async_step_panels()
            elif next_step == "panel_group_names":
                return await self.async_step_panel_group_names()
            elif next_step == "forecast_comparison":
                return await self.async_step_forecast_comparison()
            elif next_step == "debug_mode":
                return await self.async_step_debug_mode()

        return self.async_show_form(
            step_id="advanced",
            data_schema=vol.Schema({
                vol.Required("menu_choice", default="panels"): vol.In({
                    "panels": "PV Panels",
                    "panel_group_names": "Panel Group Names",
                    "forecast_comparison": "Forecast Comparison",
                    "debug_mode": "Full-KI Transparency Mode",
                }),
            }),
        )

    async def async_step_panels(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage panel sensor options. @zara"""
        panel_keys = [
            CONF_PANEL1_NAME, CONF_SENSOR_PANEL1_POWER,
            CONF_PANEL2_NAME, CONF_SENSOR_PANEL2_POWER,
            CONF_PANEL3_NAME, CONF_SENSOR_PANEL3_POWER,
            CONF_PANEL4_NAME, CONF_SENSOR_PANEL4_POWER,
        ]

        if user_input is not None:
            new_data = {**self._config_entry.data}
            for key in panel_keys:
                value = user_input.get(key)
                if value is None or (isinstance(value, str) and not value.strip()):
                    new_data.pop(key, None)
                else:
                    new_data[key] = value
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        current = self._config_entry.data

        return self.async_show_form(
            step_id="panels",
            data_schema=vol.Schema({
                vol.Optional(CONF_PANEL1_NAME, default=current.get(CONF_PANEL1_NAME, DEFAULT_PANEL1_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL1_POWER, description={"suggested_value": current.get(CONF_SENSOR_PANEL1_POWER) or None}): _get_entity_selector(CONF_SENSOR_PANEL1_POWER),
                vol.Optional(CONF_PANEL2_NAME, default=current.get(CONF_PANEL2_NAME, DEFAULT_PANEL2_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL2_POWER, description={"suggested_value": current.get(CONF_SENSOR_PANEL2_POWER) or None}): _get_entity_selector(CONF_SENSOR_PANEL2_POWER),
                vol.Optional(CONF_PANEL3_NAME, default=current.get(CONF_PANEL3_NAME, DEFAULT_PANEL3_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL3_POWER, description={"suggested_value": current.get(CONF_SENSOR_PANEL3_POWER) or None}): _get_entity_selector(CONF_SENSOR_PANEL3_POWER),
                vol.Optional(CONF_PANEL4_NAME, default=current.get(CONF_PANEL4_NAME, DEFAULT_PANEL4_NAME)): str,
                vol.Optional(CONF_SENSOR_PANEL4_POWER, description={"suggested_value": current.get(CONF_SENSOR_PANEL4_POWER) or None}): _get_entity_selector(CONF_SENSOR_PANEL4_POWER),
            }),
        )

    async def async_step_panel_group_names(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage panel group name mappings. @zara"""
        if user_input is not None:
            names_mapping = {}
            raw_input = user_input.get("panel_group_names_input", "").strip()
            if raw_input:
                for entry in raw_input.split(","):
                    entry = entry.strip()
                    if "=" in entry:
                        parts = entry.split("=", 1)
                        old_name = parts[0].strip()
                        new_name = parts[1].strip()
                        if old_name and new_name:
                            names_mapping[old_name] = new_name

            new_data = {**self._config_entry.data}
            new_data[CONF_PANEL_GROUP_NAMES] = names_mapping
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        current = self._config_entry.data
        existing_mapping = current.get(CONF_PANEL_GROUP_NAMES, {})
        if existing_mapping and isinstance(existing_mapping, dict):
            default_value = ", ".join(f"{k}={v}" for k, v in existing_mapping.items())
        else:
            default_value = ""

        return self.async_show_form(
            step_id="panel_group_names",
            data_schema=vol.Schema({
                vol.Optional("panel_group_names_input", default=default_value): selector.TextSelector(
                    selector.TextSelectorConfig(
                        type=selector.TextSelectorType.TEXT,
                        multiline=True,
                    )
                ),
            }),
            description_placeholders={
                "example": "Group 1=South String, Group 2=West String"
            },
        )

    async def async_step_forecast_comparison(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Manage forecast comparison entities for 7-day chart. @zara"""
        forecast_keys = [
            CONF_FORECAST_ENTITY_1,
            CONF_FORECAST_ENTITY_1_NAME,
            CONF_FORECAST_ENTITY_2,
            CONF_FORECAST_ENTITY_2_NAME,
        ]

        if user_input is not None:
            new_data = {**self._config_entry.data}
            for key in forecast_keys:
                value = user_input.get(key)
                if value is None or (isinstance(value, str) and not value.strip()):
                    new_data.pop(key, None)
                else:
                    new_data[key] = value
            self.hass.config_entries.async_update_entry(
                self._config_entry, data=new_data
            )
            return self.async_create_entry(title="", data={})

        current = self._config_entry.data

        return self.async_show_form(
            step_id="forecast_comparison",
            data_schema=vol.Schema({
                vol.Optional(
                    CONF_FORECAST_ENTITY_1,
                    description={"suggested_value": current.get(CONF_FORECAST_ENTITY_1) or None},
                ): _get_entity_selector(CONF_FORECAST_ENTITY_1),
                vol.Optional(
                    CONF_FORECAST_ENTITY_1_NAME,
                    default=current.get(CONF_FORECAST_ENTITY_1_NAME, DEFAULT_FORECAST_ENTITY_1_NAME),
                ): str,
                vol.Optional(
                    CONF_FORECAST_ENTITY_2,
                    description={"suggested_value": current.get(CONF_FORECAST_ENTITY_2) or None},
                ): _get_entity_selector(CONF_FORECAST_ENTITY_2),
                vol.Optional(
                    CONF_FORECAST_ENTITY_2_NAME,
                    default=current.get(CONF_FORECAST_ENTITY_2_NAME, DEFAULT_FORECAST_ENTITY_2_NAME),
                ): str,
            }),
        )

    async def async_step_debug_mode(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> FlowResult:
        """Debug mode toggle with code protection. @zara"""
        DEBUG_CODE = "4711"
        errors = {}

        if user_input is not None:
            code = str(user_input.get("debug_code", "")).strip()
            if code != DEBUG_CODE:
                errors["debug_code"] = "invalid_code"
            else:
                enabled = user_input.get(CONF_SHOW_PANEL_GROUPS, False)
                new_data = {**self._config_entry.data, CONF_SHOW_PANEL_GROUPS: enabled}
                self.hass.config_entries.async_update_entry(
                    self._config_entry, data=new_data
                )
                # Update in-memory config immediately
                for eid, edata in self.hass.data.get(DOMAIN, {}).items():
                    if isinstance(edata, dict) and "config" in edata:
                        edata["config"][CONF_SHOW_PANEL_GROUPS] = enabled
                return self.async_create_entry(title="", data={})

        current = self._config_entry.data
        is_active = current.get(CONF_SHOW_PANEL_GROUPS, False)

        return self.async_show_form(
            step_id="debug_mode",
            errors=errors,
            data_schema=vol.Schema({
                vol.Required("debug_code"): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
                ),
                vol.Optional(CONF_SHOW_PANEL_GROUPS, default=is_active): selector.BooleanSelector(),
            }),
        )
