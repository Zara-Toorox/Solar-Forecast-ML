# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

"""
Coordinator Initialization Helpers.
Provides helper methods for coordinator initialization and
configuration extraction. Pure utility functions.

@zara
"""

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

try:
    from ..const import (
        CONF_HOURLY,
        CONF_LEARNING_ENABLED,
        CONF_WP_POWER_ENTITY,
        CONF_WP_ENERGY_TODAY,
        CONF_WP_TYPE,
        CONF_HEATING_CAPACITY_KW,
        CONF_COP_RATED,
        CONF_WEATHER_ENTITY,
        DEFAULT_WP_TYPE,
        DEFAULT_HEATING_CAPACITY_KW,
        DEFAULT_COP_RATED,
        DOMAIN,
    )
except ImportError:
    CONF_HOURLY = "hourly"
    CONF_LEARNING_ENABLED = "learning_enabled"
    CONF_WP_POWER_ENTITY = "wp_power_entity"
    CONF_WP_ENERGY_TODAY = "wp_energy_today"
    CONF_WP_TYPE = "wp_type"
    CONF_HEATING_CAPACITY_KW = "heating_capacity_kw"
    CONF_COP_RATED = "cop_rated"
    CONF_WEATHER_ENTITY = "weather_entity"
    DEFAULT_WP_TYPE = "air_water"
    DEFAULT_HEATING_CAPACITY_KW = 10.0
    DEFAULT_COP_RATED = 4.0
    DOMAIN = "solar_forecast_eai"


@dataclass
class CoordinatorConfiguration:
    """Configuration data extracted from ConfigEntry. @zara"""

    heating_capacity_kw: float
    wp_type: str
    cop_rated: float
    learning_enabled: bool
    enable_hourly: bool

    wp_power_entity: Optional[str]
    wp_energy_today: Optional[str]
    primary_weather_entity: Optional[str]


class CoordinatorInitHelpers:
    """Helper methods for coordinator initialization. @zara"""

    @staticmethod
    def extract_configuration(entry: ConfigEntry) -> CoordinatorConfiguration:
        """Extract configuration from entry. @zara"""
        config = {**entry.data, **entry.options}
        heating_capacity = config.get(
            CONF_HEATING_CAPACITY_KW, DEFAULT_HEATING_CAPACITY_KW
        )
        wp_type = config.get(CONF_WP_TYPE, DEFAULT_WP_TYPE)
        cop_rated = config.get(CONF_COP_RATED, DEFAULT_COP_RATED)

        _LOGGER.info(
            "Heat pump configuration: type=%s, capacity=%.1f kW, rated COP=%.1f",
            wp_type,
            float(heating_capacity),
            float(cop_rated),
        )

        return CoordinatorConfiguration(
            heating_capacity_kw=float(heating_capacity),
            wp_type=str(wp_type),
            cop_rated=float(cop_rated),
            learning_enabled=entry.options.get(CONF_LEARNING_ENABLED, True),
            enable_hourly=entry.options.get(CONF_HOURLY, False),
            wp_power_entity=config.get(CONF_WP_POWER_ENTITY),
            wp_energy_today=config.get(CONF_WP_ENERGY_TODAY),
            primary_weather_entity=config.get(CONF_WEATHER_ENTITY),
        )

    @staticmethod
    def setup_data_directory(hass: HomeAssistant) -> Path:
        """Setup and return data directory path. @zara"""
        config_dir = hass.config.path()
        data_dir_path = Path(config_dir) / DOMAIN
        return data_dir_path
