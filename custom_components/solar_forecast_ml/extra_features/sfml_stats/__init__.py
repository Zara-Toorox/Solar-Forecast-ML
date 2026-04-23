# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""SFML Stats V17 — Solar Command Center integration for Home Assistant. @zara"""
from __future__ import annotations


# PyArmor Runtime Path Setup - MUST be before any protected module imports
import sys
from pathlib import Path as _Path
_runtime_path = str(_Path(__file__).parent)
if _runtime_path not in sys.path:
    sys.path.insert(0, _runtime_path)

# Pre-load PyArmor runtime at module level (before async event loop)
try:
    import pyarmor_runtime_009810  # noqa: F401
except ImportError:
    pass  # Runtime not present (development mode)
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import (
    DOMAIN,
    NAME,
    VERSION,
    PLATFORMS,
    SOLAR_FORECAST_DB,
    CONF_SENSOR_SMARTMETER_IMPORT_KWH,
    CONF_WEATHER_ENTITY,
    CONF_COUNTRY,
    CONF_VAT_RATE,
    CONF_GPM_GRID_FEE,
    CONF_TAXES_FEES,
    CONF_PROVIDER_MARKUP,
    CONF_MAX_PRICE,
    CONF_SMART_CHARGING_ENABLED,
    CONF_BATTERY_CAPACITY,
    CONF_BATTERY_SOC_SENSOR,
    CONF_GPM_BATTERY_POWER_SENSOR,
    CONF_MAX_SOC,
    CONF_MIN_SOC,
    CONF_FORECAST_ENTITY_1,
    CONF_FORECAST_ENTITY_2,
    DEFAULT_COUNTRY,
    DEFAULT_VAT_RATE_DE,
    DEFAULT_GPM_GRID_FEE,
    DEFAULT_TAXES_FEES,
    DEFAULT_PROVIDER_MARKUP,
    DEFAULT_MAX_PRICE,
    DEFAULT_MAX_SOC,
    DEFAULT_MIN_SOC,
    DEFAULT_BATTERY_CAPACITY,
    GPM_UPDATE_INTERVAL,
    DAILY_AGGREGATION_HOUR,
    DAILY_AGGREGATION_MINUTE,
    DAILY_AGGREGATION_SECOND,
    FORECAST_MORNING_HOUR,
    FORECAST_MORNING_MINUTE,
    FORECAST_EVENING_HOUR,
    FORECAST_EVENING_MINUTE,
    FORECAST_CHART_HOUR,
    FORECAST_CHART_MINUTE,
)
from .storage import DataValidator
from .storage.db_connection_manager import DatabaseConnectionManager, get_manager
from .api import async_setup_views, async_setup_websocket

_LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# GPM Coordinator (DataUpdateCoordinator for price updates)
# ---------------------------------------------------------------------------

class GPMCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator for electricity price data updates. @zara"""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
    ) -> None:
        """Initialize GPM coordinator. @zara"""
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_gpm",
            update_interval=GPM_UPDATE_INTERVAL,
        )
        self._entry = entry
        self._price_service = None
        self._price_calculator = None
        self._battery_tracker = None
        self._smart_charging = None
        self._forecast_reader = None
        self._last_price_fetch: datetime | None = None

    async def async_initialize(self) -> None:
        """Initialize GPM services. @zara"""
        from .core.price_service import ElectricityPriceService
        from .core.price_calculator import PriceCalculator

        entry_data = self._entry.data
        country = entry_data.get(CONF_COUNTRY, DEFAULT_COUNTRY)
        vat_rate = entry_data.get(CONF_VAT_RATE, DEFAULT_VAT_RATE_DE)

        self._price_service = ElectricityPriceService(country=country)
        self._price_calculator = PriceCalculator(
            vat_rate=vat_rate,
            grid_fee=entry_data.get(CONF_GPM_GRID_FEE, DEFAULT_GPM_GRID_FEE),
            taxes_fees=entry_data.get(CONF_TAXES_FEES, DEFAULT_TAXES_FEES),
            provider_markup=entry_data.get(CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP),
        )


        # Battery tracker (optional)
        battery_sensor = entry_data.get(CONF_GPM_BATTERY_POWER_SENSOR)
        if battery_sensor:
            try:
                from .core.battery_tracker import BatteryTracker
                db = get_manager()
                self._battery_tracker = BatteryTracker(
                    self.hass, self._entry.entry_id, db=db
                )
                await self._battery_tracker.async_setup(battery_sensor)
                _LOGGER.info("Battery tracker initialized for %s", battery_sensor)
            except Exception as err:
                _LOGGER.error("Failed to initialize battery tracker: %s", err)

        # Smart charging (optional)
        if entry_data.get(CONF_SMART_CHARGING_ENABLED):
            try:
                from .core.solar_forecast_reader_gpm import SolarForecastReader
                from .core.smart_charging import SmartChargingManager

                db = get_manager()
                if db:
                    self._forecast_reader = SolarForecastReader(db)
                    soc_sensor = entry_data.get(CONF_BATTERY_SOC_SENSOR, "")
                    self._smart_charging = SmartChargingManager(
                        hass=self.hass,
                        forecast_reader=self._forecast_reader,
                        battery_capacity_kwh=entry_data.get(
                            CONF_BATTERY_CAPACITY, DEFAULT_BATTERY_CAPACITY
                        ),
                        soc_sensor_entity=soc_sensor,
                        max_soc=entry_data.get(CONF_MAX_SOC, DEFAULT_MAX_SOC),
                        min_soc=entry_data.get(CONF_MIN_SOC, DEFAULT_MIN_SOC),
                    )
                    _LOGGER.info("Smart charging initialized")
            except Exception as err:
                _LOGGER.error("Failed to initialize smart charging: %s", err)

    async def async_shutdown(self) -> None:
        """Shutdown GPM services. @zara"""
        if self._battery_tracker:
            try:
                await self._battery_tracker.async_unload()
            except Exception as err:
                _LOGGER.warning("Error unloading battery tracker: %s", err)

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch updated price data. @zara"""
        from datetime import timezone
        data: dict[str, Any] = {}

        try:
            # Fetch prices (hourly)
            now = datetime.now(timezone.utc)
            should_fetch = (
                self._last_price_fetch is None
                or (now - self._last_price_fetch).total_seconds() > 3600
            )
            if should_fetch and self._price_service:
                prices = await self._price_service.fetch_day_ahead_prices()
                if prices:
                    self._last_price_fetch = now

            if self._price_service and self._price_service.has_data:
                calc = self._price_calculator
                max_price = self._entry.data.get(CONF_MAX_PRICE, DEFAULT_MAX_PRICE)

                spot_net = self._price_service.get_current_price()
                next_spot = self._price_service.get_next_hour_price()
                cheapest = self._price_service.get_cheapest_hour_today()
                most_exp = self._price_service.get_most_expensive_hour_today()

                data["spot_price"] = round(calc.calculate_gross_spot(spot_net), 2) if spot_net else None
                data["total_price"] = round(calc.calculate_total_price(spot_net), 2) if spot_net else None
                data["spot_price_next_hour"] = round(calc.calculate_gross_spot(next_spot), 2) if next_spot else None
                data["total_price_next_hour"] = round(calc.calculate_total_price(next_spot), 2) if next_spot else None
                data["cheapest_hour_today"] = cheapest.get("hour") if cheapest else None
                data["most_expensive_hour_today"] = most_exp.get("hour") if most_exp else None
                data["average_price_today"] = self._price_service.get_average_price_today()
                data["is_cheap"] = calc.is_cheap(
                    data.get("total_price", 999), max_price
                ) if data.get("total_price") else False
                data["price_trend"] = calc.calculate_trend(
                    data.get("total_price"), data.get("total_price_next_hour")
                )

            # Battery stats
            if self._battery_tracker:
                stats = self._battery_tracker.get_statistics()
                data["battery_power"] = stats.get("battery_power", 0)
                data["battery_charged_today"] = stats.get("battery_charged_today", 0)
                data["battery_charged_week"] = stats.get("battery_charged_week", 0)
                data["battery_charged_month"] = stats.get("battery_charged_month", 0)

            # Smart charging
            if self._smart_charging:
                is_cheap = data.get("is_cheap", False)
                state = await self._smart_charging.async_update(is_cheap)
                data["smart_charging_target_soc"] = state.target_soc
                data["smart_charging_active"] = state.is_active
                data["smart_charging_reason"] = state.reason
                data["smart_charging_current_soc"] = state.current_soc
                data["solar_forecast_today"] = state.solar_forecast_today_kwh
                data["solar_forecast_tomorrow"] = state.solar_forecast_tomorrow_kwh

        except Exception as err:
            _LOGGER.error("Error updating GPM data: %s", err)
            raise UpdateFailed(f"GPM update failed: {err}") from err

        return data


# ---------------------------------------------------------------------------
# Integration Setup
# ---------------------------------------------------------------------------

async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the SFML Stats component. @zara"""
    _LOGGER.info("Initializing %s v%s", NAME, VERSION)
    hass.data.setdefault(DOMAIN, {})
    await async_setup_views(hass)
    await async_setup_websocket(hass)
    _LOGGER.info("SFML Stats Dashboard available at: /api/sfml_stats/dashboard")
    return True


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old entry to new version. @zara"""
    _LOGGER.info(
        "Migrating SFML Stats from version %s to %s",
        config_entry.version, 7
    )
    new_data = {**config_entry.data}

    if config_entry.version < 6:
        hass.config_entries.async_update_entry(
            config_entry, data=new_data, version=6
        )
        _LOGGER.info("Migration to version 6 successful")

    if config_entry.version < 7:
        # V7: GPM integration merged
        new_data.setdefault(CONF_COUNTRY, DEFAULT_COUNTRY)
        new_data.setdefault(CONF_VAT_RATE, DEFAULT_VAT_RATE_DE)
        hass.config_entries.async_update_entry(
            config_entry, data=new_data, version=7
        )
        _LOGGER.info("Migration to version 7 successful (GPM merged)")

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up SFML Stats from a config entry. @zara"""
    _LOGGER.info("Setting up %s v%s (Entry: %s)", NAME, VERSION, entry.entry_id)

    # --- DataValidator ---
    validator = DataValidator(hass)
    if not await validator.async_initialize():
        _LOGGER.error("DataValidator could not be initialized")
        return False

    # --- Database Connection ---
    db_manager = None
    try:
        db_manager = await DatabaseConnectionManager.get_instance(hass)
        from .readers.solar_reader import SolarDataReader
        from .readers.weather_reader import WeatherDataReader
        SolarDataReader._db_manager = db_manager
        WeatherDataReader._db_manager = db_manager
        _LOGGER.info("Database connection established")
    except Exception as err:
        _LOGGER.error("Database connection failed: %s", err, exc_info=True)

    # --- Config ---
    config_path = Path(hass.config.path())
    entry_config = dict(entry.data)

    # --- Core Services (from services → core) ---
    from .core.daily_aggregator import DailyEnergyAggregator
    from .core.billing import BillingCalculator
    from .core.tariff_manager import MonthlyTariffManager
    from .core.forecast_collector import ForecastComparisonCollector

    aggregator = DailyEnergyAggregator(hass, config_path)
    billing_calculator = BillingCalculator(hass, config_path, entry_data=entry_config)
    monthly_tariff_manager = MonthlyTariffManager(hass, config_path, entry_data=entry_config)

    # --- Hourly Billing Aggregator (dynamic pricing) ---
    from .core.hourly_aggregator import HourlyBillingAggregator
    hourly_aggregator = HourlyBillingAggregator(hass, config_path)
    _LOGGER.info("Hourly billing aggregator initialized (price_mode: %s)",
                 entry_config.get("billing_price_mode", "dynamic"))

    # --- Power Sources Collector ---
    from .power_sources_collector import PowerSourcesCollector
    power_sources_path = config_path / "sfml_stats" / "data"
    power_sources_collector = PowerSourcesCollector(hass, entry_config, power_sources_path)
    try:
        await power_sources_collector.start()
    except Exception as err:
        _LOGGER.error("Failed to start power sources collector: %s", err)

    # --- Weather Collector (optional) ---
    weather_collector = None
    if entry_config.get(CONF_WEATHER_ENTITY):
        try:
            from .weather_collector import WeatherDataCollector
            weather_collector = WeatherDataCollector(
                hass, config_path / "sfml_stats_weather"
            )
        except Exception as err:
            _LOGGER.error("Weather collector failed: %s", err)

    # --- Forecast Comparison ---
    forecast_comparison_collector = ForecastComparisonCollector(
        hass, config_path, db_manager
    )
    if db_manager:
        ForecastComparisonCollector._db_manager = db_manager

    # --- GPM Coordinator ---
    gpm_coordinator = GPMCoordinator(hass, entry)
    try:
        await gpm_coordinator.async_initialize()
        await gpm_coordinator.async_config_entry_first_refresh()
        _LOGGER.info("GPM Coordinator initialized with price data")
    except Exception as err:
        _LOGGER.warning("GPM Coordinator init failed (non-fatal): %s", err)

    # --- Store everything ---
    hass.data[DOMAIN][entry.entry_id] = {
        "validator": validator,
        "config": entry_config,
        "aggregator": aggregator,
        "billing_calculator": billing_calculator,
        "monthly_tariff_manager": monthly_tariff_manager,
        "power_sources_collector": power_sources_collector,
        "weather_collector": weather_collector,
        "forecast_comparison_collector": forecast_comparison_collector,
        "gpm_coordinator": gpm_coordinator,
        "hourly_aggregator": hourly_aggregator,
    }

    # --- Forward sensor platforms ---
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # --- Update listener ---
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    # --- Scheduled Jobs ---
    async def _daily_aggregation_job(now: datetime) -> None:
        """Run daily aggregation. @zara"""
        try:
            await aggregator.async_aggregate_daily()
        except Exception as err:
            _LOGGER.error("Daily aggregation failed: %s", err)

    cancel_daily = async_track_time_change(
        hass, _daily_aggregation_job,
        hour=DAILY_AGGREGATION_HOUR,
        minute=DAILY_AGGREGATION_MINUTE,
        second=DAILY_AGGREGATION_SECOND,
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_daily_job"] = cancel_daily

    async def _forecast_morning_job(now: datetime) -> None:
        """Collect morning forecasts. @zara"""
        try:
            await forecast_comparison_collector.async_collect_morning_forecasts()
        except Exception as err:
            _LOGGER.error("Morning forecast collection failed: %s", err)

    cancel_morning = async_track_time_change(
        hass, _forecast_morning_job,
        hour=FORECAST_MORNING_HOUR, minute=FORECAST_MORNING_MINUTE, second=0,
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_forecast_morning_job"] = cancel_morning

    async def _forecast_evening_job(now: datetime) -> None:
        """Collect evening actuals. @zara"""
        try:
            await forecast_comparison_collector.async_collect_evening_actual()
        except Exception as err:
            _LOGGER.error("Evening actual collection failed: %s", err)

    cancel_evening = async_track_time_change(
        hass, _forecast_evening_job,
        hour=FORECAST_EVENING_HOUR, minute=FORECAST_EVENING_MINUTE, second=0,
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_forecast_evening_job"] = cancel_evening

    # --- Hourly Billing Job (every hour at :05) ---
    async def _hourly_billing_job(now: datetime) -> None:
        """Run hourly billing aggregation — calculates cost per hour. @zara"""
        try:
            success = await hourly_aggregator.async_aggregate_hourly()
            if success:
                _LOGGER.debug("Hourly billing aggregation completed")
            else:
                _LOGGER.debug("Hourly billing aggregation skipped (no data)")
        except Exception as err:
            _LOGGER.error("Hourly billing aggregation failed: %s", err)

    cancel_hourly_billing = async_track_time_change(
        hass, _hourly_billing_job,
        minute=5, second=0,  # 5 Minuten nach jeder vollen Stunde
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_hourly_billing_job"] = cancel_hourly_billing
    _LOGGER.info("Hourly billing aggregation scheduled (every hour at :05)")

    # --- Background Tasks ---
    async def _initial_aggregation() -> None:
        try:
            await aggregator.async_aggregate_daily()
        except Exception as err:
            _LOGGER.error("Initial aggregation failed: %s", err)

    task_agg = hass.async_create_background_task(
        _initial_aggregation(), f"{DOMAIN}_initial_aggregation"
    )
    hass.data[DOMAIN][entry.entry_id]["_task_aggregation"] = task_agg

    async def _initial_forecast_collection() -> None:
        import asyncio
        try:
            from .readers.forecast_comparison_reader import ForecastComparisonReader
            reader = ForecastComparisonReader(config_path / SOLAR_FORECAST_DB)
            needs_historical = not reader.is_available
            if not needs_historical:
                days = await reader.async_get_comparison_days(days=7)
                needs_historical = sum(1 for d in days if d.has_data) < 7
            if needs_historical:
                await asyncio.sleep(60)
                await forecast_comparison_collector.async_collect_historical(days=7)
        except Exception as err:
            _LOGGER.error("Initial forecast collection failed: %s", err)

    task_fc = hass.async_create_background_task(
        _initial_forecast_collection(), f"{DOMAIN}_initial_forecast_collection"
    )
    hass.data[DOMAIN][entry.entry_id]["_task_forecast"] = task_fc

    _LOGGER.info("%s v%s successfully set up", NAME, VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry. @zara"""
    _LOGGER.info("Unloading %s (Entry: %s)", NAME, entry.entry_id)

    if entry.entry_id not in hass.data.get(DOMAIN, {}):
        return True

    # Unload sensor platforms
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    entry_data = hass.data[DOMAIN][entry.entry_id]

    # Cancel scheduled jobs
    for job_key in (
        "cancel_daily_job",
        "cancel_forecast_morning_job",
        "cancel_forecast_evening_job",
        "cancel_hourly_billing_job",
    ):
        cancel = entry_data.get(job_key)
        if cancel:
            try:
                cancel()
            except Exception as err:
                _LOGGER.warning("Error cancelling %s: %s", job_key, err)

    # Stop collectors
    collector = entry_data.get("power_sources_collector")
    if collector:
        try:
            await collector.stop()
        except Exception as err:
            _LOGGER.warning("Error stopping power sources collector: %s", err)

    # Shutdown GPM coordinator
    coordinator = entry_data.get("gpm_coordinator")
    if coordinator:
        try:
            await coordinator.async_shutdown()
        except Exception as err:
            _LOGGER.warning("Error shutting down GPM coordinator: %s", err)

    # Cancel background tasks
    for task_key in ("_task_aggregation", "_task_forecast"):
        task = entry_data.get(task_key)
        if task and not task.done():
            task.cancel()

    # Dismiss notifications
    try:
        from homeassistant.components.persistent_notification import async_dismiss
        await async_dismiss(hass, f"{DOMAIN}_no_sources")
    except Exception:
        pass

    # Close DB (last!)
    try:
        await DatabaseConnectionManager.close_instance()
    except Exception as err:
        _LOGGER.warning("Error closing database: %s", err)

    del hass.data[DOMAIN][entry.entry_id]
    return unload_ok


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update. @zara"""
    if entry.entry_id not in hass.data.get(DOMAIN, {}):
        return

    entry_data = hass.data[DOMAIN][entry.entry_id]
    new_config = dict(entry.data)
    entry_data["config"] = new_config

    for key in ("billing_calculator", "monthly_tariff_manager"):
        obj = entry_data.get(key)
        if obj and hasattr(obj, "update_config"):
            try:
                obj.update_config(new_config)
                if hasattr(obj, "invalidate_cache"):
                    obj.invalidate_cache()
            except Exception as err:
                _LOGGER.warning("Error updating %s: %s", key, err)

    for key in ("aggregator", "power_sources_collector"):
        obj = entry_data.get(key)
        if obj and hasattr(obj, "update_config"):
            try:
                obj.update_config(new_config)
            except Exception as err:
                _LOGGER.warning("Error updating %s: %s", key, err)

    _LOGGER.info("Configuration refresh complete")
