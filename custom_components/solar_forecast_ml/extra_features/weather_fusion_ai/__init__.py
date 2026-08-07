# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Weather Fusion AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/weather-fusion-ai/blob/main/LICENSE
# ******************************************************************************
"""Weather Fusion AI - Multi-Source Local Weather Learning Integration.

This integration provides accurate local weather forecasts by:
1. Blending multiple weather sources (Open-Meteo, Bright Sky, wttr.in, Pirate Weather)
2. Learning from your local weather station sensors
3. Applying cloud-type-specific accuracy corrections
4. Continuously improving predictions for YOUR location

@zara
"""

# ruff: noqa: E402

# PyArmor Runtime Path Setup - MUST be before any protected module imports
import sys
from pathlib import Path as _Path
_runtime_path = str(_Path(__file__).parent)
if _runtime_path not in sys.path:
    sys.path.insert(0, _runtime_path)

# Pre-load PyArmor runtime at module level (before async event loop)
# This prevents "blocking call to open" warning from platform.libc_ver()
try:
    import pyarmor_runtime_009810  # noqa: F401
except ImportError:
    pass  # Runtime not present (development mode)

import logging
import asyncio
import shutil
from pathlib import Path

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    DATA_DIR_NAME,
    PLATFORMS,
)

DATA_FORECAST_PROVIDER = "forecast_provider"
DATA_FORECAST_PROVIDERS = "forecast_providers"
DATA_HISTORY_PROVIDER = "history_provider"
DATA_HISTORY_PROVIDERS = "history_providers"
DATA_SENSOR_MAPPING_PROVIDERS = "sensor_mapping_providers"

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up Weather Fusion AI from yaml configuration (not used)."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Weather Fusion AI from a config entry."""
    _LOGGER.info("Setting up Weather Fusion AI integration")

    hass.data.setdefault(DOMAIN, {})

    # Create data directory for this entry
    data_dir = Path(hass.config.path(DATA_DIR_NAME)) / entry.entry_id
    data_dir.mkdir(parents=True, exist_ok=True)

    # Import coordinator here to avoid circular imports
    from .coordinator import WeatherFusionCoordinator

    # Create coordinator
    coordinator = WeatherFusionCoordinator(
        hass=hass,
        entry=entry,
        data_dir=data_dir,
    )

    # Initialize coordinator (loads caches, sets up experts)
    await coordinator.async_initialize()

    # This provider intentionally exposes only an entry-scoped, sanitised
    # forecast snapshot. Consumers must not access coordinator internals.
    try:
        from .forecast_provider import WeatherFusionForecastProvider
    except ImportError:
        WeatherFusionForecastProvider = None
        _LOGGER.warning(
            "Forecast provider module is unavailable; rebuild the integration "
            "before enabling EAI weather intelligence"
        )
    forecast_provider = (
        WeatherFusionForecastProvider(entry.entry_id, coordinator)
        if WeatherFusionForecastProvider is not None
        else None
    )
    try:
        from .history_provider import WeatherFusionHistoryProvider
    except ImportError:
        WeatherFusionHistoryProvider = None
        _LOGGER.warning("History provider module is unavailable; rebuild the integration")
    history_provider = (
        WeatherFusionHistoryProvider(
            coordinator.actual_tracker,
            getattr(hass.config, "time_zone", None),
            hass=hass,
            sensors=getattr(coordinator.actual_tracker, "sensors", None),
        )
        if WeatherFusionHistoryProvider is not None and coordinator.actual_tracker
        else None
    )

    # Store coordinator for platforms BEFORE first refresh
    # This ensures platforms are always set up, even if the first API call fails.
    # Without this, a cold-start API failure prevents entity registration,
    # causing "entity no longer provided" errors after HA restart.
    entry_data = {
        "coordinator": coordinator,
        "data_dir": data_dir,
    }
    if forecast_provider is not None:
        entry_data[DATA_FORECAST_PROVIDER] = forecast_provider
        hass.data[DOMAIN].setdefault(DATA_FORECAST_PROVIDERS, {})[entry.entry_id] = (
            forecast_provider
        )
    if history_provider is not None:
        entry_data[DATA_HISTORY_PROVIDER] = history_provider
        hass.data[DOMAIN].setdefault(DATA_HISTORY_PROVIDERS, {})[entry.entry_id] = (
            history_provider
        )
    hass.data[DOMAIN][entry.entry_id] = entry_data

    # Set up platforms first so entities are always registered
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # First data fetch - non-blocking: if it fails, coordinator retries automatically
    try:
        await coordinator.async_config_entry_first_refresh()
    except Exception:
        _LOGGER.warning(
            "Initial weather data fetch failed - will retry on next update cycle"
        )

    # Register update listener for options changes
    entry.async_on_unload(entry.add_update_listener(async_update_options))

    try:
        from .sensor_mapping_provider import SensorMappingProvider, register_provider
    except ImportError:
        _LOGGER.warning(
            "Sensor mapping provider is unavailable; rebuild the integration "
            "before enabling EAI sensor reuse"
        )
    else:
        sensor_mapping_provider = SensorMappingProvider(
            entry.entry_id, {**entry.data, **entry.options}
        )
        sensor_mapping_providers = hass.data[DOMAIN].setdefault(
            DATA_SENSOR_MAPPING_PROVIDERS, {}
        )
        register_provider(
            sensor_mapping_providers, entry.entry_id, sensor_mapping_provider
        )

    _LOGGER.info("Weather Fusion AI setup complete")

    return True


async def async_update_options(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    _LOGGER.debug("Options updated, reloading integration")
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.info("Unloading Weather Fusion AI integration")

    # Unload platforms
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        # Clean up stored data
        entry_data = hass.data[DOMAIN].get(entry.entry_id, {})
        coordinator = entry_data.get("coordinator")
        if coordinator:
            await coordinator.async_shutdown()

        hass.data[DOMAIN].pop(entry.entry_id)
        providers = hass.data[DOMAIN].get(DATA_FORECAST_PROVIDERS)
        if providers is not None:
            providers.pop(entry.entry_id, None)
            if not providers:
                hass.data[DOMAIN].pop(DATA_FORECAST_PROVIDERS, None)
        history_providers = hass.data[DOMAIN].get(DATA_HISTORY_PROVIDERS)
        if history_providers is not None:
            history_providers.pop(entry.entry_id, None)
            if not history_providers:
                hass.data[DOMAIN].pop(DATA_HISTORY_PROVIDERS, None)
        sensor_mapping_providers = hass.data[DOMAIN].get(
            DATA_SENSOR_MAPPING_PROVIDERS
        )
        if isinstance(sensor_mapping_providers, dict):
            sensor_mapping_provider = sensor_mapping_providers.get(entry.entry_id)
            if sensor_mapping_provider is not None:
                sensor_mapping_provider.invalidate()
                if sensor_mapping_providers.get(entry.entry_id) is sensor_mapping_provider:
                    sensor_mapping_providers.pop(entry.entry_id, None)
            if not sensor_mapping_providers:
                hass.data[DOMAIN].pop(DATA_SENSOR_MAPPING_PROVIDERS, None)

    return unload_ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Delete entry-scoped weather history when the config entry is removed."""
    root = Path(hass.config.path(DATA_DIR_NAME)).resolve()
    entry_dir = root / entry.entry_id
    if entry_dir.parent != root or entry_dir.is_symlink():
        _LOGGER.warning("Refusing to remove an unsafe Weather Fusion AI data path")
        return
    if entry_dir.is_dir():
        await asyncio.to_thread(shutil.rmtree, entry_dir)
    _LOGGER.info("Weather Fusion AI entry data removed")
