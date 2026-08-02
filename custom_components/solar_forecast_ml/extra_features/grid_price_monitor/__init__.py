# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntry, ConfigEntryNotReady
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send

# Only import constants at module level - these are lightweight
from .const import DOMAIN, NAME, PLATFORMS, VERSION

if TYPE_CHECKING:
    from .coordinator import GridPriceMonitorCoordinator

_LOGGER = logging.getLogger(__name__)
PROVIDER_CHANGED_SIGNAL = f"{DOMAIN}_provider_changed"


def _require_sfml_storage(hass: HomeAssistant) -> None:
    """Fail setup until the authoritative SFML service and database are ready."""
    database_path = Path(hass.config.path("solar_forecast_ml/solar_forecast.db"))
    sfml_data = hass.data.get("solar_forecast_ml", {})
    coordinator_ready = any(
        isinstance(entry_id, str)
        and hasattr(candidate, "async_refresh")
        and getattr(candidate, "data_manager", None) is not None
        for entry_id, candidate in sfml_data.items()
    )
    if not coordinator_ready or not database_path.is_file():
        raise ConfigEntryNotReady(
            "Solar Forecast ML must initialize its shared database before GPM"
        )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Solar Forecast GPM from a config entry.

    Uses background initialization to avoid blocking HA startup. @zara
    """
    # Lazy import to avoid blocking the event loop during module import
    from .coordinator import GridPriceMonitorCoordinator

    _LOGGER.info(
        "Setting up %s v%s",
        NAME,
        VERSION,
    )
    _require_sfml_storage(hass)

    # Initialize domain data storage
    hass.data.setdefault(DOMAIN, {})

    # Create coordinator (lightweight, no blocking)
    coordinator = GridPriceMonitorCoordinator(hass, entry)

    # Store coordinator BEFORE background init
    # This allows platforms to set up even if data isn't ready yet
    hass.data[DOMAIN][entry.entry_id] = coordinator
    async_dispatcher_send(hass, PROVIDER_CHANGED_SIGNAL)

    # Set up platforms - they will show "unavailable" until data is ready
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Background initialization to avoid blocking HA startup @zara
    async def _background_initialization() -> None:
        """Initialize coordinator in background to not block HA startup."""
        import asyncio

        try:
            _LOGGER.debug("Solar Forecast GPM: Starting background initialization")

            # Initialize persistent storage (creates /config/grid_price_monitor/ structure)
            await coordinator.async_initialize_storage()

            # Initialize battery tracker if configured
            await coordinator.async_setup_battery_tracker()

            # Fetch initial data with timeout to prevent indefinite blocking
            # Note: Use async_refresh() instead of async_config_entry_first_refresh()
            # because we're in a background task after setup has completed (state is LOADED)
            try:
                async with asyncio.timeout(60):
                    await coordinator.async_refresh()
            except asyncio.TimeoutError:
                _LOGGER.warning(
                    "Solar Forecast GPM: First refresh timed out after 60s - "
                    "will retry at next scheduled update"
                )

            _LOGGER.info(
                "%s setup complete - monitoring %s electricity prices",
                NAME,
                {**entry.data, **entry.options}.get("country", "DE"),
            )
        except Exception as err:
            _LOGGER.error("Solar Forecast GPM background init failed: %s", err)

    # Start background initialization - does not block HA startup
    hass.async_create_background_task(
        _background_initialization(),
        f"{DOMAIN}_background_init_{entry.entry_id}",
    )

    _LOGGER.info("Solar Forecast GPM basic setup complete - initialization continues in background")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry @zara"""
    _LOGGER.debug("Unloading %s", NAME)

    coordinator: GridPriceMonitorCoordinator = hass.data[DOMAIN].get(entry.entry_id)
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        if coordinator:
            await coordinator.async_shutdown_battery_tracker()
            await coordinator.async_shutdown_storage()
        hass.data[DOMAIN].pop(entry.entry_id)
        async_dispatcher_send(hass, PROVIDER_CHANGED_SIGNAL)

    return unload_ok
