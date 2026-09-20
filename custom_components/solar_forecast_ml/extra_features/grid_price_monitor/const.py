# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from datetime import timedelta

from homeassistant.const import Platform

# ============================================================================
# DOMAIN & VERSION CONSTANTS
# ============================================================================
DOMAIN = "grid_price_monitor"
NAME = "Solar Forecast GPM"
VERSION = "46.2.0"

# ============================================================================
# PLATFORMS
# ============================================================================
PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.NUMBER, Platform.SELECT]

# ============================================================================
# API CONFIGURATION
# ============================================================================
AWATTAR_API_URL_DE = "https://api.awattar.de/v1/marketdata"
AWATTAR_API_URL_AT = "https://api.awattar.at/v1/marketdata"

API_TIMEOUT = 30  # seconds

# ============================================================================
# CONFIGURATION KEYS
# ============================================================================
CONF_COUNTRY = "country"
CONF_VAT_RATE = "vat_rate"
CONF_GRID_FEE = "grid_fee"
CONF_TAXES_FEES = "taxes_fees"
CONF_PROVIDER_MARKUP = "provider_markup"
CONF_MAX_PRICE = "max_price"
CONF_FORCE_CHARGE_PRICE = "force_charge_price"
CONF_THRESHOLD_MODE = "threshold_mode"
CONF_BELOW_AVERAGE_PCT = "below_average_pct"
CONF_CHEAPEST_HOURS = "cheapest_hours"
THRESHOLD_MODE_ABSOLUTE = "absolute"
THRESHOLD_MODE_BELOW_AVERAGE = "below_average"
THRESHOLD_MODE_CHEAPEST_HOURS = "cheapest_hours"
THRESHOLD_MODES = [
    THRESHOLD_MODE_ABSOLUTE,
    THRESHOLD_MODE_BELOW_AVERAGE,
    THRESHOLD_MODE_CHEAPEST_HOURS,
]
THRESHOLD_LIMITS = {
    "max_price": {"min": 0, "max": 100, "step": 0.5},
    "force_charge_price": {"min": 0, "max": 100, "step": 0.5},
    "below_average_pct": {"min": 0, "max": 50, "step": 1},
    "cheapest_hours": {"min": 1, "max": 12, "step": 1},
}

# Calibration option
CONF_USE_CALIBRATION = "use_calibration"
CONF_CALIBRATION_PRICE = "calibration_price"
CONF_BATTERY_POWER_SENSOR = "battery_power_sensor"

CONF_LICENSE_KEY = "license_key"
CONF_LICENSE_STATUS = "license_status"
CONF_LICENSE_ID = "license_id"
CONF_LICENSE_SOURCE = "license_source"
CONF_LEGACY_ENTITLED = "legacy_entitled"
CONF_TARIFF_MODE = "tariff_mode"
LICENSE_STATUS_GRANDFATHERED = "grandfathered"
EAI_DOMAIN = "solar_forecast_eai"
CONF_FEED_IN_TARIFF_CT = "feed_in_tariff_ct"
CONF_BASE_FEE_EUR_MONTH = "base_fee_eur_month"

TARIFF_MODE_DYNAMIC = "dynamic"
TARIFF_MODE_FIXED = "fixed"
TARIFF_MODE_TIME_OF_USE = "time_of_use"
TARIFF_MODE_TIME_WINDOWS = "time_windows"
TARIFF_MODE_CSV_COMMUNITY = "csv_community"
TARIFF_MODE_DEMO = "demo"

TARIFF_MODE_OPTIONS = [
    TARIFF_MODE_DYNAMIC,
    TARIFF_MODE_FIXED,
    TARIFF_MODE_TIME_OF_USE,
    TARIFF_MODE_TIME_WINDOWS,
    TARIFF_MODE_CSV_COMMUNITY,
]

DEFAULT_FEED_IN_TARIFF_CT = 8.1
DEFAULT_BASE_FEE_EUR_MONTH = 0.0

CONF_FIXED = "fixed"
CONF_FIXED_TOTAL_PRICE = "fixed_total_price"
CONF_TIME_OF_USE = "time_of_use"
CONF_TOU_HIGH_PRICE = "tou_high_price"
CONF_TOU_LOW_PRICE = "tou_low_price"
CONF_TOU_HIGH_START = "tou_high_start"
CONF_TOU_HIGH_END = "tou_high_end"
CONF_TOU_WEEKEND_LOW = "tou_weekend_low"
CONF_TOU_HOLIDAY_LOW = "tou_holiday_low"
CONF_TIME_WINDOWS = "time_windows"
CONF_WINDOWS_DEFAULT_PRICE = "default_price"
CONF_WINDOW_NAME = "window_name"
CONF_WINDOW_START = "window_start"
CONF_WINDOW_END = "window_end"
CONF_WINDOW_PRICE = "window_price"
CONF_WINDOW_WEEKDAYS = "window_weekdays"
CONF_CSV_COMMUNITY = "csv_community"
CONF_CSV_BASE_MODE = "csv_base_mode"
CONF_EEG_PRICE = "eeg_price"
CONF_CSV_PRICE_UNIT = "csv_price_unit"
CONF_CSV_TIMEZONE = "csv_timezone"

PRICE_SOURCE_AWATTAR = "awattar"
PRICE_SOURCE_FIXED = "fixed"
PRICE_SOURCE_TIME_OF_USE = "time_of_use"
PRICE_SOURCE_TIME_WINDOWS = "time_windows"
PRICE_SOURCE_CSV = "csv"
PRICE_SOURCE_DEMO = "demo"
PRICE_SOURCE_GAP_FILL = "gap_fill"
PRICE_SOURCE_MONTHLY = "monthly_correction"

CSV_BASE_MODE_OPTIONS = [
    TARIFF_MODE_DYNAMIC,
    TARIFF_MODE_FIXED,
    TARIFF_MODE_TIME_OF_USE,
    TARIFF_MODE_TIME_WINDOWS,
]
CSV_PRICE_UNIT_OPTIONS = ["auto", "ct_kwh", "eur_kwh", "eur_mwh"]
CSV_TIMEZONE_OPTIONS = ["local", "utc"]
WEEKDAY_OPTIONS = ["0", "1", "2", "3", "4", "5", "6"]
MAX_TARIFF_WINDOWS = 12

SIGNAL_PRICES_REVISED = f"{DOMAIN}_prices_revised"
BACKFILL_DAYS = 35

LICENSE_RECHECK_INTERVAL_SECONDS = 300
LICENSE_RECHECK_WINDOW_SECONDS = 3600

# ============================================================================
# DEFAULT VALUES
# ============================================================================
DEFAULT_COUNTRY = "DE"
DEFAULT_GRID_FEE = 8.0  # ct/kWh typical German grid fee (brutto)
DEFAULT_TAXES_FEES = 5.0  # ct/kWh taxes and fees (brutto)
DEFAULT_PROVIDER_MARKUP = 1.0  # ct/kWh provider margin (brutto)
DEFAULT_MAX_PRICE = 30.0  # ct/kWh threshold for "cheap" electricity
DEFAULT_FORCE_CHARGE_PRICE = 15.0
DEFAULT_THRESHOLD_MODE = THRESHOLD_MODE_ABSOLUTE
DEFAULT_BELOW_AVERAGE_PCT = 10
DEFAULT_CHEAPEST_HOURS = 4

# ============================================================================
# VAT RATES
# ============================================================================
VAT_RATE_DE = 19  # 19% MwSt Germany (default)
VAT_RATE_AT = 20  # 20% MwSt Austria (default)
VAT_RATE_REDUCED_DE = 7  # 7% reduced VAT Germany

# VAT options for selector
VAT_OPTIONS = [
    {"value": 19, "label": "19% (Standard DE)"},
    {"value": 20, "label": "20% (Standard AT)"},
    {"value": 7, "label": "7% (Ermäßigt DE)"},
    {"value": 0, "label": "0% (Keine MwSt)"},
]

# ============================================================================
# COUNTRY OPTIONS
# ============================================================================
COUNTRY_OPTIONS = {
    "DE": "Germany",
    "AT": "Austria",
}

# ============================================================================
# UPDATE INTERVALS
# ============================================================================
UPDATE_INTERVAL = timedelta(minutes=5)
PRICE_FETCH_INTERVAL = timedelta(hours=1)

# ============================================================================
# SENSOR KEYS
# ============================================================================
SENSOR_SPOT_PRICE = "spot_price"
SENSOR_TOTAL_PRICE = "total_price"
SENSOR_SPOT_PRICE_NEXT_HOUR = "spot_price_next_hour"
SENSOR_TOTAL_PRICE_NEXT_HOUR = "total_price_next_hour"
SENSOR_CHEAPEST_HOUR_TODAY = "cheapest_hour_today"
SENSOR_MOST_EXPENSIVE_HOUR_TODAY = "most_expensive_hour_today"
SENSOR_AVERAGE_PRICE_TODAY = "average_price_today"
SENSOR_PRICES_TODAY = "prices_today"
SENSOR_PRICES_TOMORROW = "prices_tomorrow"

BINARY_SENSOR_CHEAP_ENERGY = "cheap_energy"
REMOVED_UNIQUE_ID_SUFFIXES = (
    "smart_charging",
    "smart_charging_target_soc",
    "solar_forecast_today",
    "solar_forecast_tomorrow",
)
SMC_REMOVED_ENTRY_KEYS = (
    "smart_charging_enabled",
    "battery_capacity",
    "battery_soc_sensor",
    "max_soc",
    "min_soc",
)

# Battery sensors
SENSOR_BATTERY_POWER = "battery_power"
SENSOR_BATTERY_CHARGED_TODAY = "battery_charged_today"
SENSOR_BATTERY_CHARGED_WEEK = "battery_charged_week"
SENSOR_BATTERY_CHARGED_MONTH = "battery_charged_month"

# ============================================================================
# ICONS
# ============================================================================
ICON_PRICE = "mdi:currency-eur"
ICON_SPOT = "mdi:chart-line"
ICON_CHEAP = "mdi:lightning-bolt"
ICON_CLOCK = "mdi:clock-outline"
ICON_AVERAGE = "mdi:chart-bar"
ICON_BATTERY = "mdi:battery-charging"
ICON_BATTERY_ENERGY = "mdi:battery-plus"
ICON_CALENDAR_TODAY = "mdi:calendar-today"
ICON_CALENDAR_TOMORROW = "mdi:calendar-arrow-right"

# ============================================================================
# UNITS
# ============================================================================
UNIT_CT_KWH = "ct/kWh"

# ============================================================================
# ATTRIBUTES
# ============================================================================
ATTR_FORECAST_TODAY = "forecast_today"
ATTR_FORECAST_TOMORROW = "forecast_tomorrow"
ATTR_NEXT_CHEAP_HOUR = "next_cheap_hour"
ATTR_CHEAP_HOURS_TODAY = "cheap_hours_today"
ATTR_CHEAP_HOURS_TOMORROW = "cheap_hours_tomorrow"
ATTR_PRICE_TREND = "price_trend"
ATTR_LAST_UPDATE = "last_update"
ATTR_DATA_SOURCE = "data_source"

# ============================================================================
# DATABASE
# ============================================================================
DB_PATH = "/config/solar_forecast_ml/solar_forecast.db"
