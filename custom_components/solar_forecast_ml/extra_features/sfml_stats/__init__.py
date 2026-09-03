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

# ruff: noqa: E402, F401


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
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_track_time_change
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import (
    DOMAIN,
    NAME,
    VERSION,
    RUNTIME_READY_KEY,
    PLATFORMS,
    SOLAR_FORECAST_DB,
    CONF_WEATHER_ENTITY,
    CONF_COUNTRY,
    CONF_VAT_RATE,
    CONF_GPM_GRID_FEE,
    CONF_TAXES_FEES,
    CONF_PROVIDER_MARKUP,
    LEGACY_POWER_ENERGY_SENSOR_KEYS,
    CONF_MAX_PRICE,
    CONF_SMART_CHARGING_ENABLED,
    CONF_SMART_CHARGING_SWITCH,
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_SOLAR_TO_HOUSE,
    CONF_FORCE_CHARGE_PRICE,
    DEFAULT_FORCE_CHARGE_PRICE,
    CONF_SENSOR_PRICE_TOTAL,
    CONF_BATTERY_CAPACITY,
    CONF_BATTERY_SOC_SENSOR,
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_BATTERY_POWER,
    CONF_MAX_SOC,
    CONF_MIN_SOC,
    DEFAULT_COUNTRY,
    DEFAULT_VAT_RATE_DE,
    DEFAULT_GPM_GRID_FEE,
    DEFAULT_TAXES_FEES,
    DEFAULT_PROVIDER_MARKUP,
    DEFAULT_MAX_PRICE,
    DEFAULT_MAX_SOC,
    DEFAULT_MIN_SOC,
    DEFAULT_BATTERY_CAPACITY,
    DAILY_AGGREGATION_HOUR,
    DAILY_AGGREGATION_MINUTE,
    DAILY_AGGREGATION_SECOND,
    FORECAST_EVENING_HOUR,
    FORECAST_EVENING_MINUTE,
)
from .storage import DataValidator
from .storage.db_connection_manager import DatabaseConnectionManager, get_manager
from .api import async_setup_views, async_setup_websocket

_LOGGER = logging.getLogger(__name__)

LOVELACE_CARD_URL = f"/api/sfml_stats/static/sfml-stats-card.js?v={VERSION}"
CORRECTIONS_PANEL_PATH = "sfml-stats-corrections-bridge"
CORRECTIONS_PANEL_URL = f"/api/sfml_stats/static/corrections-bridge.js?v={VERSION}"
EMS_BRIDGE_PANEL_PATH = "sfml-stats-ems-bridge"
EMS_BRIDGE_PANEL_URL = f"/api/sfml_stats/static/ems-bridge.js?v={VERSION}"
API_BRIDGE_PANEL_PATH = "sfml-stats-api-bridge"
API_BRIDGE_PANEL_URL = f"/api/sfml_stats/static/api-bridge.js?v={VERSION}"


async def _async_register_api_bridge_panel(hass: HomeAssistant) -> None:
    """Register the hidden authenticated bridge used by the standalone dashboard."""
    from homeassistant.components import frontend

    if frontend.async_panel_exists(hass, API_BRIDGE_PANEL_PATH):
        return
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        frontend_url_path=API_BRIDGE_PANEL_PATH,
        config={
            "_panel_custom": {
                "name": "sfml-stats-api-bridge",
                "embed_iframe": False,
                "trust_external": False,
                "module_url": API_BRIDGE_PANEL_URL,
            }
        },
        require_admin=False,
        show_in_sidebar=False,
    )


async def _async_register_corrections_panel(hass: HomeAssistant) -> None:
    """Register the hidden authenticated admin-only corrections bridge."""
    from homeassistant.components import frontend

    if frontend.async_panel_exists(hass, CORRECTIONS_PANEL_PATH):
        return
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        frontend_url_path=CORRECTIONS_PANEL_PATH,
        config={
            "_panel_custom": {
                "name": "sfml-stats-corrections-bridge",
                "embed_iframe": False,
                "trust_external": False,
                "module_url": CORRECTIONS_PANEL_URL,
            }
        },
        require_admin=True,
        show_in_sidebar=False,
    )


async def _async_register_ems_bridge_panel(hass: HomeAssistant) -> None:
    """Register the hidden authenticated admin-only EMS control bridge."""
    from homeassistant.components import frontend

    if frontend.async_panel_exists(hass, EMS_BRIDGE_PANEL_PATH):
        return
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        frontend_url_path=EMS_BRIDGE_PANEL_PATH,
        config={
            "_panel_custom": {
                "name": "sfml-stats-ems-bridge",
                "embed_iframe": False,
                "trust_external": False,
                "module_url": EMS_BRIDGE_PANEL_URL,
            }
        },
        require_admin=True,
        show_in_sidebar=False,
    )


class GPMProviderView:
    """STATS view of the GPM coordinator, with local Smart Charging actuation."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._listeners: list[Any] = []
        self._provider_unsubscribe: Any | None = None
        self._bound_provider: Any | None = None
        self._smart_charging: Any | None = None
        self._forecast_reader: Any | None = None
        self._smc_overlay: dict[str, Any] = {}
        self._smc_task_pending = False
        self._config: dict[str, Any] = {}
        self._unsubscribe_dispatcher = async_dispatcher_connect(
            hass, "grid_price_monitor_provider_changed", self._async_rebind
        )
        self._async_rebind()

    @property
    def _provider(self) -> Any | None:
        return next(
            (
                coordinator
                for coordinator in self._hass.data.get(
                    "grid_price_monitor", {}
                ).values()
                if hasattr(coordinator, "data")
            ),
            None,
        )

    @property
    def data(self) -> dict[str, Any]:
        provider = self._provider
        data = dict(getattr(provider, "data", None) or {})
        if self._smc_overlay:
            data.update(self._smc_overlay)
        data.setdefault("smart_charging_decision", "not_load")
        data.setdefault("smart_charging_requested_grid_charge_kwh", 0.0)
        data.setdefault("smart_charging_effective_storage_cost_ct_kwh", None)
        data.setdefault("smart_charging_compared_future_price_ct_kwh", None)
        data.setdefault("smart_charging_effective_roundtrip_efficiency", None)
        data.setdefault("smart_charging_reserved_future_grid_charge_kwh", 0.0)
        return data

    @property
    def last_update_success(self) -> bool:
        provider = self._provider
        return bool(getattr(provider, "last_update_success", False))

    def async_add_listener(self, update_callback: Any, context: Any = None) -> Any:
        self._listeners.append(update_callback)

        def _remove_listener() -> None:
            if update_callback in self._listeners:
                self._listeners.remove(update_callback)

        return _remove_listener

    def _async_rebind(self) -> None:
        provider = self._provider
        if provider is self._bound_provider:
            return
        if self._provider_unsubscribe is not None:
            self._provider_unsubscribe()
            self._provider_unsubscribe = None
        self._bound_provider = provider
        if provider is not None and hasattr(provider, "async_add_listener"):
            self._provider_unsubscribe = provider.async_add_listener(
                self._notify_listeners
            )
        self._notify_listeners()

    def _emit_listeners(self) -> None:
        for listener in tuple(self._listeners):
            listener()

    def _notify_listeners(self) -> None:
        self._emit_listeners()
        self._schedule_smart_charging()

    def _schedule_smart_charging(self) -> None:
        if self._smc_task_pending or self._smart_charging is None:
            return
        create_task = getattr(self._hass, "async_create_task", None)
        if not callable(create_task):
            return
        self._smc_task_pending = True
        create_task(self._async_refresh_smart_charging())

    def _future_price_slots(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        from datetime import timedelta

        from homeassistant.util import dt as dt_util

        now = dt_util.now()
        slots: list[dict[str, Any]] = []
        for day_offset, key in ((0, "forecast_today"), (1, "forecast_tomorrow")):
            day = now.date() + timedelta(days=day_offset)
            raw_slots = data.get(key)
            if not isinstance(raw_slots, list):
                continue
            for item in raw_slots:
                if not isinstance(item, dict):
                    continue
                hour = item.get("hour")
                price = item.get("total_price", item.get("price"))
                if hour is None or price is None:
                    continue
                try:
                    stamp = datetime.combine(day, datetime.min.time(), tzinfo=now.tzinfo)
                    stamp = stamp.replace(hour=int(hour))
                except (TypeError, ValueError):
                    continue
                if stamp <= now:
                    continue
                slots.append(
                    {
                        "timestamp": stamp,
                        "total_price": price,
                        "duration_hours": 1.0,
                    }
                )
        return slots

    def _disabled_overlay(self) -> dict[str, Any]:
        return {
            "smart_charging_active": False,
            "smart_charging_decision": "not_load",
            "smart_charging_reason": "smart_charging_disabled",
            "smart_charging_requested_grid_charge_kwh": 0.0,
            "smart_charging_reserved_future_grid_charge_kwh": 0.0,
        }

    def _overlay_from_state(self, state: Any) -> dict[str, Any]:
        return {
            "smart_charging_active": bool(state.is_active),
            "smart_charging_target_soc": state.target_soc,
            "smart_charging_current_soc": state.current_soc,
            "smart_charging_reason": state.reason,
            "smart_charging_decision": state.economic_decision,
            "smart_charging_requested_grid_charge_kwh": state.requested_grid_charge_kwh,
            "smart_charging_effective_storage_cost_ct_kwh": (
                state.effective_storage_cost_ct_kwh
            ),
            "smart_charging_compared_future_price_ct_kwh": (
                state.compared_future_price_ct_kwh
            ),
            "smart_charging_effective_roundtrip_efficiency": (
                state.effective_roundtrip_efficiency
            ),
            "smart_charging_reserved_future_grid_charge_kwh": (
                state.reserved_future_grid_charge_kwh
            ),
            "solar_forecast_today": state.solar_forecast_today_kwh,
            "solar_forecast_tomorrow": state.solar_forecast_tomorrow_kwh,
        }

    def _manager_kwargs(self, config: dict[str, Any]) -> dict[str, Any]:
        battery_capacity = config.get(CONF_BATTERY_CAPACITY)
        if battery_capacity is None:
            battery_capacity = DEFAULT_BATTERY_CAPACITY
        max_soc = config.get(CONF_MAX_SOC)
        if max_soc is None:
            max_soc = DEFAULT_MAX_SOC
        min_soc = config.get(CONF_MIN_SOC)
        if min_soc is None:
            min_soc = DEFAULT_MIN_SOC
        force_charge_price = config.get(CONF_FORCE_CHARGE_PRICE)
        if force_charge_price is None:
            force_charge_price = DEFAULT_FORCE_CHARGE_PRICE
        return {
            "battery_capacity_kwh": battery_capacity,
            "soc_sensor_entity": config.get(CONF_BATTERY_SOC_SENSOR, "")
            or config.get(CONF_SENSOR_BATTERY_SOC, ""),
            "max_soc": max_soc,
            "min_soc": min_soc,
            "smart_charging_switch": config.get(CONF_SMART_CHARGING_SWITCH),
            "home_consumption_sensor": config.get(CONF_SENSOR_HOME_CONSUMPTION),
            "solar_power_sensor": config.get(CONF_SENSOR_SOLAR_TO_HOUSE),
            "force_charge_price": force_charge_price,
            "main_soc_sensor_entity": config.get(CONF_SENSOR_BATTERY_SOC, ""),
        }

    async def async_configure(self, config: dict[str, Any]) -> None:
        """Create or refresh the STATS Smart Charging manager from current config."""
        self._config = dict(config)
        enabled = bool(config.get(CONF_SMART_CHARGING_ENABLED))
        if not enabled:
            if self._smart_charging is not None:
                await self._smart_charging.async_force_off()
                self._smart_charging = None
            self._smc_overlay = self._disabled_overlay()
            self._emit_listeners()
            return
        kwargs = self._manager_kwargs(config)
        if self._smart_charging is None:
            try:
                from .core.smart_charging import SmartChargingManager
                from .core.solar_forecast_reader_gpm import SolarForecastReader

                db = get_manager()
                if db is None:
                    _LOGGER.warning("Smart charging skipped: database manager unavailable")
                    return
                self._forecast_reader = SolarForecastReader(db)
                self._smart_charging = SmartChargingManager(
                    hass=self._hass,
                    forecast_reader=self._forecast_reader,
                    **kwargs,
                )
                _LOGGER.info("Smart charging initialized")
            except Exception as err:
                _LOGGER.error("Failed to initialize smart charging: %s", err)
                self._smart_charging = None
                return
        else:
            self._smart_charging.update_config(**kwargs)
        self._schedule_smart_charging()

    async def _async_refresh_smart_charging(self) -> None:
        try:
            manager = self._smart_charging
            if manager is None:
                return
            provider_data = dict(getattr(self._provider, "data", None) or {})
            current_price = provider_data.get("total_price")
            is_cheap = bool(provider_data.get("is_cheap", False))
            if current_price is not None:
                try:
                    is_cheap = float(current_price) < float(
                        self._config.get(CONF_MAX_PRICE, DEFAULT_MAX_PRICE)
                    )
                except (TypeError, ValueError):
                    pass
            future_slots = self._future_price_slots(provider_data)
            state = await manager.async_update(
                is_cheap,
                current_price=current_price,
                future_total_price_slots=future_slots or None,
            )
            self._smc_overlay = self._overlay_from_state(state)
        except Exception as err:
            _LOGGER.warning("Smart charging update failed: %s", err)
        finally:
            self._smc_task_pending = False
        self._emit_listeners()

    async def async_shutdown_smart_charging(self) -> None:
        if self._smart_charging is not None:
            try:
                await self._smart_charging.async_force_off()
            except Exception as err:
                _LOGGER.warning("Error turning off smart charging: %s", err)
            self._smart_charging = None
        self._smc_overlay = {}

    def async_close(self) -> None:
        if self._provider_unsubscribe is not None:
            self._provider_unsubscribe()
            self._provider_unsubscribe = None
        self._unsubscribe_dispatcher()
        self._listeners.clear()
        self._smart_charging = None
        self._smc_overlay = {}

    def __getattr__(self, name: str) -> Any:
        provider = self._provider
        if provider is None:
            raise AttributeError(name)
        return getattr(provider, name)


async def _async_register_lovelace_card(hass: HomeAssistant) -> None:
    """Register the STATS Lovelace card resource when storage mode is available."""
    try:
        lovelace = hass.data.get("lovelace")
        resources = (
            getattr(lovelace, "resources", None) if lovelace is not None else None
        )
        if resources is None:
            return
        mode = getattr(lovelace, "mode", None)
        if mode is not None and mode != "storage":
            return
        info = await resources.async_get_info()
        base_url = LOVELACE_CARD_URL.split("?", 1)[0]
        if any(
            item.get("url", "").split("?", 1)[0] == base_url
            for item in info.get("resources", [])
            if isinstance(item, dict)
        ):
            return
        await resources.async_create_item(
            {"res_type": "module", "url": LOVELACE_CARD_URL}
        )
    except Exception as err:
        _LOGGER.debug("Could not register STATS Lovelace card resource: %s", err)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the SFML Stats component."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    if not isinstance(domain_data.get(RUNTIME_READY_KEY), asyncio.Event):
        domain_data[RUNTIME_READY_KEY] = asyncio.Event()
    await async_setup_views(hass)
    await async_setup_websocket(hass)
    return True


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old entry to new version. @zara"""
    _LOGGER.info("Migrating SFML Stats from version %s to %s", config_entry.version, 9)
    new_data = {**config_entry.data}
    new_options = {**config_entry.options}

    if config_entry.version < 6:
        hass.config_entries.async_update_entry(config_entry, data=new_data, version=6)
        _LOGGER.info("Migration to version 6 successful")

    if config_entry.version < 7:
        # V7: GPM integration merged
        new_data.setdefault(CONF_COUNTRY, DEFAULT_COUNTRY)
        new_data.setdefault(CONF_VAT_RATE, DEFAULT_VAT_RATE_DE)
        hass.config_entries.async_update_entry(config_entry, data=new_data, version=7)
        _LOGGER.info("Migration to version 7 successful (GPM merged)")

    if config_entry.version < 8:
        removed = sorted(
            key
            for key in LEGACY_POWER_ENERGY_SENSOR_KEYS
            if key in new_data or key in new_options
        )
        for key in removed:
            new_data.pop(key, None)
            new_options.pop(key, None)
        hass.config_entries.async_update_entry(
            config_entry, data=new_data, options=new_options, version=8
        )
        _LOGGER.info(
            "Migration to version 8 successful (%d legacy kWh sensor mappings removed)",
            len(removed),
        )

    if config_entry.version < 9:
        new_data.pop("sensor_solar_power", None)
        new_options.pop("sensor_solar_power", None)
        hass.config_entries.async_update_entry(
            config_entry, data=new_data, options=new_options, version=9
        )
        _LOGGER.info("Migration to version 9 successful")

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up SFML Stats from a config entry. @zara"""
    _LOGGER.info("Setting up %s v%s (Entry: %s)", NAME, VERSION, entry.entry_id)

    runtime_ready = hass.data[DOMAIN][RUNTIME_READY_KEY]
    runtime_ready.clear()

    entry_config = {**entry.data, **entry.options}

    # --- DataValidator ---
    validator = DataValidator(hass)
    if not await validator.async_initialize(entry_config):
        _LOGGER.error("DataValidator could not be initialized")
        return False

    # --- Database Connection ---
    db_manager = None
    try:
        db_manager = await DatabaseConnectionManager.get_instance(hass)
        await db_manager.async_bootstrap_stats_schema()
        from .readers.solar_reader import SolarDataReader
        from .readers.weather_reader import WeatherDataReader

        SolarDataReader._db_manager = db_manager
        WeatherDataReader._db_manager = db_manager
        _LOGGER.info("STATS database schema gate completed")
    except Exception as err:
        _LOGGER.error("STATS database schema gate failed: %s", err, exc_info=True)
        return False

    # --- Config ---
    config_path = Path(hass.config.path())
    # --- Core Services (from services → core) ---
    from .core.daily_aggregator import DailyEnergyAggregator
    from .core.billing import BillingCalculator
    from .core.tariff_manager import MonthlyTariffManager
    from .core.forecast_collector import ForecastComparisonCollector
    from .core.energy_context import StatsEnergyContextProvider
    from .core.ems import EMSManager

    aggregator = DailyEnergyAggregator(hass, config_path)
    billing_calculator = BillingCalculator(hass, config_path, entry_data=entry_config)
    monthly_tariff_manager = MonthlyTariffManager(
        hass, config_path, entry_data=entry_config
    )

    # --- Hourly Billing Aggregator (dynamic pricing) ---
    from .core.hourly_aggregator import HourlyBillingAggregator

    hourly_aggregator = HourlyBillingAggregator(hass, config_path)
    _LOGGER.info(
        "Hourly billing aggregator initialized (price_mode: %s)",
        entry_config.get("billing_price_mode", "dynamic"),
    )

    energy_context_provider = (
        StatsEnergyContextProvider(hass, db_manager) if db_manager is not None else None
    )
    if energy_context_provider is not None:
        await energy_context_provider.async_refresh()

    # --- Power Sources Collector ---
    from .power_sources_collector import PowerSourcesCollector

    power_sources_path = config_path / "sfml_stats" / "data"
    power_sources_collector = PowerSourcesCollector(
        hass, entry_config, power_sources_path
    )
    try:
        await power_sources_collector.start()
        if energy_context_provider is not None:
            await energy_context_provider.async_refresh()
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

    gpm_coordinator = GPMProviderView(hass)
    await gpm_coordinator.async_configure(entry_config)
    ems_manager = EMSManager(hass, entry, entry_config)
    await ems_manager.async_setup()

    # --- Store everything ---
    hass.data[DOMAIN][entry.entry_id] = {
        "config_entry": entry,
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
        "energy_context_provider": energy_context_provider,
        "ems_manager": ems_manager,
    }

    # --- Forward sensor platforms ---
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await _async_register_lovelace_card(hass)
    await _async_register_api_bridge_panel(hass)
    await _async_register_corrections_panel(hass)
    await _async_register_ems_bridge_panel(hass)

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
        hass,
        _daily_aggregation_job,
        hour=DAILY_AGGREGATION_HOUR,
        minute=DAILY_AGGREGATION_MINUTE,
        second=DAILY_AGGREGATION_SECOND,
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_daily_job"] = cancel_daily

    # Start dynamic scheduler for morning forecast comparison collection
    hass.async_create_task(forecast_comparison_collector.async_schedule_next_lock_job())
    cancel_morning = forecast_comparison_collector.stop
    hass.data[DOMAIN][entry.entry_id]["cancel_forecast_morning_job"] = cancel_morning

    # Start database self-healing migration for historical forecast comparison correction
    hass.async_create_task(
        forecast_comparison_collector.async_migrate_historical_forecasts()
    )

    async def _forecast_evening_job(now: datetime) -> None:
        """Collect evening actuals. @zara"""
        try:
            await forecast_comparison_collector.async_collect_evening_actual()
        except Exception as err:
            _LOGGER.error("Evening actual collection failed: %s", err)

    cancel_evening = async_track_time_change(
        hass,
        _forecast_evening_job,
        hour=FORECAST_EVENING_HOUR,
        minute=FORECAST_EVENING_MINUTE,
        second=0,
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_forecast_evening_job"] = cancel_evening

    # --- Hourly Billing Job (after SFML hourly actualization) ---
    async def _hourly_billing_job(now: datetime) -> None:
        """Run hourly billing aggregation — calculates cost per hour. @zara"""
        try:
            success = await hourly_aggregator.async_aggregate_hourly()
            if success:
                _LOGGER.debug("Hourly billing aggregation completed")
                if energy_context_provider is not None:
                    await energy_context_provider.async_refresh()
            else:
                _LOGGER.debug("Hourly billing aggregation skipped (no data)")
        except Exception as err:
            _LOGGER.error("Hourly billing aggregation failed: %s", err)

    cancel_hourly_billing = async_track_time_change(
        hass,
        _hourly_billing_job,
        minute=7,
        second=0,
    )
    hass.data[DOMAIN][entry.entry_id]["cancel_hourly_billing_job"] = (
        cancel_hourly_billing
    )
    _LOGGER.info("Hourly billing aggregation scheduled (every hour at :07)")

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

            reader = ForecastComparisonReader(
                config_path / SOLAR_FORECAST_DB, hass=hass
            )
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

    # Lovelace Resources Auto-Registration
    try:
        lovelace = hass.data.get("lovelace")
        if lovelace and getattr(lovelace, "mode", "storage") == "storage":
            registered_urls = {
                res.get("url") for res in lovelace.resources.async_items()
            }

            sfml_url = f"/api/{DOMAIN}/static/sfml-card.js"
            if sfml_url not in registered_urls:
                await lovelace.resources.async_create_item(
                    {"res_type": "module", "url": sfml_url}
                )
                _LOGGER.info("SFML Lovelace card registered successfully")

            stats_url = f"/api/{DOMAIN}/static/stats-flow-card.js"
            if stats_url not in registered_urls:
                await lovelace.resources.async_create_item(
                    {"res_type": "module", "url": stats_url}
                )
                _LOGGER.info("STATS Flow Lovelace card registered successfully")
    except Exception as err:
        _LOGGER.warning("Could not auto-register Lovelace resources: %s", err)

    from .sensor_mapping_provider import SensorMappingProvider, register_provider

    sensor_mapping_provider = SensorMappingProvider(entry.entry_id, entry_config)
    sensor_mapping_providers = hass.data[DOMAIN].setdefault(
        "sensor_mapping_providers", {}
    )
    register_provider(sensor_mapping_providers, entry.entry_id, sensor_mapping_provider)

    runtime_ready.set()
    _LOGGER.info("%s v%s successfully set up", NAME, VERSION)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry. @zara"""
    _LOGGER.info("Unloading %s (Entry: %s)", NAME, entry.entry_id)

    if entry.entry_id not in hass.data.get(DOMAIN, {}):
        return True

    entry_data = hass.data[DOMAIN][entry.entry_id]
    ems_manager = entry_data.get("ems_manager")
    if ems_manager is not None and not await ems_manager.async_shutdown():
        _LOGGER.error(
            "EMS safe release is still pending for Entry %s; refusing unload",
            entry.entry_id,
        )
        return False

    # Unload sensor platforms
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if not unload_ok:
        if ems_manager is not None:
            ems_manager.resume_after_failed_unload()
        _LOGGER.warning(
            "Platform unload failed for Entry %s; keeping runtime state intact",
            entry.entry_id,
        )
        return False

    gpm_coordinator = entry_data.get("gpm_coordinator")
    if gpm_coordinator is not None:
        shutdown_smc = getattr(gpm_coordinator, "async_shutdown_smart_charging", None)
        if callable(shutdown_smc):
            try:
                await shutdown_smc()
            except Exception as err:
                _LOGGER.warning("Error shutting down smart charging: %s", err)
        gpm_coordinator.async_close()

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

    runtime_ready = hass.data[DOMAIN].get(RUNTIME_READY_KEY)
    if isinstance(runtime_ready, asyncio.Event):
        runtime_ready.clear()

    # Close DB (last!)
    try:
        await DatabaseConnectionManager.close_instance()
    except Exception as err:
        _LOGGER.warning("Error closing database: %s", err)

    sensor_mapping_providers = hass.data[DOMAIN].get("sensor_mapping_providers")
    if isinstance(sensor_mapping_providers, dict):
        sensor_mapping_provider = sensor_mapping_providers.get(entry.entry_id)
        if sensor_mapping_provider is not None:
            sensor_mapping_provider.invalidate()
            if sensor_mapping_providers.get(entry.entry_id) is sensor_mapping_provider:
                sensor_mapping_providers.pop(entry.entry_id, None)
        if not sensor_mapping_providers:
            hass.data[DOMAIN].pop("sensor_mapping_providers", None)

    del hass.data[DOMAIN][entry.entry_id]
    if not any(
        isinstance(value, dict) and "config_entry" in value
        for value in hass.data[DOMAIN].values()
    ):
        from homeassistant.components import frontend

        frontend.async_remove_panel(hass, CORRECTIONS_PANEL_PATH, warn_if_unknown=False)
        frontend.async_remove_panel(hass, API_BRIDGE_PANEL_PATH, warn_if_unknown=False)
        frontend.async_remove_panel(hass, EMS_BRIDGE_PANEL_PATH, warn_if_unknown=False)
    return unload_ok


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update. @zara"""
    if entry.entry_id not in hass.data.get(DOMAIN, {}):
        return

    entry_data = hass.data[DOMAIN][entry.entry_id]
    new_config = {**entry.data, **entry.options}
    entry_data["config"] = new_config
    ems_manager = entry_data.get("ems_manager")
    if ems_manager is not None:
        await ems_manager.async_update_config(new_config)

    gpm_coordinator = entry_data.get("gpm_coordinator")
    configure_smc = getattr(gpm_coordinator, "async_configure", None)
    if callable(configure_smc):
        await configure_smc(new_config)

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

    from .sensor_mapping_provider import SensorMappingProvider, register_provider

    sensor_mapping_provider = SensorMappingProvider(entry.entry_id, new_config)
    sensor_mapping_providers = hass.data[DOMAIN].setdefault(
        "sensor_mapping_providers", {}
    )
    register_provider(sensor_mapping_providers, entry.entry_id, sensor_mapping_provider)

    gpm_coordinator = entry_data.get("gpm_coordinator")
    notify_listeners = getattr(gpm_coordinator, "_notify_listeners", None)
    if callable(notify_listeners):
        notify_listeners()

    _LOGGER.info("Configuration refresh complete")
