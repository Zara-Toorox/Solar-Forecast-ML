# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Weather Fusion AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/weather-fusion-ai/blob/main/LICENSE
# ******************************************************************************
"""Constants for Weather Fusion AI integration.

@zara
"""

from typing import Final

DOMAIN: Final = "weather_fusion_ai"
NAME: Final = "Weather Fusion AI"
VERSION: Final = "40.0.0"

# Internal Home Assistant data registry keys for the public forecast provider.
DATA_FORECAST_PROVIDERS: Final = "forecast_providers"
DATA_FORECAST_PROVIDER: Final = "forecast_provider"

# Config keys
CONF_LOCATION_NAME: Final = "location_name"
CONF_LATITUDE: Final = "latitude"
CONF_LONGITUDE: Final = "longitude"
CONF_UPDATE_INTERVAL: Final = "update_interval"

# Sensor config keys
CONF_TEMP_SENSOR: Final = "temperature_sensor"
CONF_HUMIDITY_SENSOR: Final = "humidity_sensor"
CONF_PRESSURE_SENSOR: Final = "pressure_sensor"
CONF_WIND_SPEED_SENSOR: Final = "wind_speed_sensor"
CONF_WIND_DIRECTION_SENSOR: Final = "wind_direction_sensor"
CONF_RAIN_SENSOR: Final = "rain_sensor"
CONF_UV_SENSOR: Final = "uv_sensor"
CONF_VISIBILITY_SENSOR: Final = "visibility_sensor"

# Optional API keys
CONF_PIRATE_WEATHER_API_KEY: Final = "pirate_weather_api_key"

# Update intervals (minutes)
DEFAULT_UPDATE_INTERVAL: Final = 30
MIN_UPDATE_INTERVAL: Final = 10
MAX_UPDATE_INTERVAL: Final = 120

# Weather source update intervals (hours)
OPEN_METEO_UPDATE_HOURS: Final = 3
BRIGHT_SKY_UPDATE_HOURS: Final = 3
WTTR_UPDATE_HOURS: Final = 6
PIRATE_WEATHER_UPDATE_HOURS: Final = 3

# Learning parameters
LEARNING_MIN_DAYS: Final = 3
LEARNING_ROLLING_DAYS: Final = 7
LEARNING_SMOOTHING_FACTOR: Final = 0.3

# Cloud type classification thresholds
CLOUD_CLEAR_MAX: Final = 25.0
CLOUD_FAIR_MAX: Final = 50.0
CLOUD_MIXED_MAX: Final = 75.0

# File names
FILE_WEATHER_CACHE: Final = "weather_cache.json"
FILE_EXPERT_WEIGHTS: Final = "expert_weights.json"
FILE_PRECISION_DATA: Final = "precision_data.json"
FILE_HOURLY_ACTUAL: Final = "hourly_actual.json"

# Data directory
DATA_DIR_NAME: Final = "weather_fusion_ai_data"

# Platforms
PLATFORMS: Final = ["weather", "sensor"]

# Attribution
ATTRIBUTION: Final = "Weather data by Weather Fusion AI (Multi-Source Blending)"

# Weather condition mappings (Open-Meteo WMO codes to HA conditions)
WMO_TO_HA_CONDITION: Final = {
    0: "sunny",  # Clear sky
    1: "sunny",  # Mainly clear
    2: "partlycloudy",  # Partly cloudy
    3: "cloudy",  # Overcast
    45: "fog",  # Fog
    48: "fog",  # Depositing rime fog
    51: "rainy",  # Light drizzle
    53: "rainy",  # Moderate drizzle
    55: "rainy",  # Dense drizzle
    56: "rainy",  # Light freezing drizzle
    57: "rainy",  # Dense freezing drizzle
    61: "rainy",  # Slight rain
    63: "rainy",  # Moderate rain
    65: "pouring",  # Heavy rain
    66: "rainy",  # Light freezing rain
    67: "pouring",  # Heavy freezing rain
    71: "snowy",  # Slight snow
    73: "snowy",  # Moderate snow
    75: "snowy",  # Heavy snow
    77: "snowy",  # Snow grains
    80: "rainy",  # Slight rain showers
    81: "rainy",  # Moderate rain showers
    82: "pouring",  # Violent rain showers
    85: "snowy",  # Slight snow showers
    86: "snowy",  # Heavy snow showers
    95: "lightning-rainy",  # Thunderstorm
    96: "lightning-rainy",  # Thunderstorm with slight hail
    99: "lightning-rainy",  # Thunderstorm with heavy hail
}

# Default HA condition if WMO code not found
DEFAULT_CONDITION: Final = "cloudy"

# Day conditions that change at night
# Home Assistant expects "clear-night" instead of "sunny" after sunset
DAY_TO_NIGHT_CONDITION: Final = {
    "sunny": "clear-night",
}
