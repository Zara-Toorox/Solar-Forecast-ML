# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

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
from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.config_entries import ConfigEntry, ConfigEntryNotReady
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_send

# Only import constants at module level - these are lightweight
from .const import (
    CONF_LEGACY_ENTITLED,
    CONF_LICENSE_KEY,
    CONF_LICENSE_STATUS,
    CONF_TARIFF_MODE,
    DOMAIN,
    EAI_DOMAIN,
    LICENSE_STATUS_GRANDFATHERED,
    NAME,
    PLATFORMS,
    REMOVED_UNIQUE_ID_SUFFIXES,
    SMC_REMOVED_ENTRY_KEYS,
    TARIFF_MODE_DYNAMIC,
    VERSION,
)

if TYPE_CHECKING:
    from .coordinator import GridPriceMonitorCoordinator

_LOGGER = logging.getLogger(__name__)
PROVIDER_CHANGED_SIGNAL = f"{DOMAIN}_provider_changed"

CONFIG_ENTRY_VERSION = 3


def migrate_entry_payload(
    version: int, data: dict
) -> tuple[int, dict]:
    """Return (version, data) for config-entry migration.

    Version 1 entries become grandfathered dynamic tariffs. Version 3 removes
    retired smart-charging keys from entry data. Missing later keys stay unset
    so runtime can still load pre-migration data.
    """
    new_data = dict(data)
    if version < 2:
        new_data[CONF_TARIFF_MODE] = TARIFF_MODE_DYNAMIC
        new_data[CONF_LICENSE_KEY] = ""
        new_data[CONF_LICENSE_STATUS] = LICENSE_STATUS_GRANDFATHERED
        new_data[CONF_LEGACY_ENTITLED] = True
        version = 2
    if version < 3:
        for key in SMC_REMOVED_ENTRY_KEYS:
            new_data.pop(key, None)
        version = 3
    new_data = _backfill_legacy_entitled(new_data)
    return version, new_data


def _backfill_legacy_entitled(data: dict) -> dict:
    """Keep the grandfathered marker even when a later key is added (A1)."""
    new_data = dict(data)
    if new_data.get(CONF_LICENSE_STATUS) == LICENSE_STATUS_GRANDFATHERED:
        new_data[CONF_LEGACY_ENTITLED] = True
    return new_data


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Migrate a config entry to the current version."""
    version, new_data = migrate_entry_payload(entry.version, dict(entry.data))
    new_options = dict(entry.options)
    options_changed = False
    if version >= 3:
        for key in SMC_REMOVED_ENTRY_KEYS:
            if key in new_options:
                new_options.pop(key, None)
                options_changed = True
    if (
        version == entry.version
        and new_data == dict(entry.data)
        and not options_changed
    ):
        return True
    update: dict[str, object] = {"data": new_data, "version": version}
    if options_changed:
        update["options"] = new_options
    hass.config_entries.async_update_entry(entry, **update)
    _LOGGER.info("Migrated %s config entry to version %s", NAME, version)
    return True


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


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register GPM services once per Home Assistant instance."""
    from .services import async_setup_services

    await async_setup_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Solar Forecast GPM from a config entry.

    Uses background initialization to avoid blocking HA startup. @zara
    """
    # Lazy import to avoid blocking the event loop during module import
    from homeassistant.helpers import issue_registry as ir

    from .coordinator import GridPriceMonitorCoordinator
    from .license import (
        CONF_LEGACY_ENTITLED as LICENSE_LEGACY_FLAG,
        has_valid_license_source,
        license_key_from_entry,
        resolve_entitlements,
    )
    from .license.models import LicenseStatus

    _LOGGER.info(
        "Setting up %s v%s",
        NAME,
        VERSION,
    )
    _require_sfml_storage(hass)

    current = dict(entry.data)
    backfilled = _backfill_legacy_entitled(current)
    if backfilled != current:
        hass.config_entries.async_update_entry(entry, data=backfilled)

    resolved = resolve_entitlements(hass, entry)
    status = resolved.status
    key = license_key_from_entry(dict(entry.data))

    # Initialize domain data storage
    hass.data.setdefault(DOMAIN, {})

    from .services import async_setup_services

    await async_setup_services(hass)

    # Create coordinator (lightweight, no blocking)
    coordinator = GridPriceMonitorCoordinator(hass, entry)

    hass.data[DOMAIN][entry.entry_id] = coordinator
    async_dispatcher_send(hass, PROVIDER_CHANGED_SIGNAL)

    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    for suffix in REMOVED_UNIQUE_ID_SUFFIXES:
        unique_id = f"{entry.entry_id}_{suffix}"
        entity_id = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
        if entity_id is None:
            entity_id = registry.async_get_entity_id("binary_sensor", DOMAIN, unique_id)
        if entity_id:
            registry.async_remove(entity_id)

    # Set up platforms - they will show "unavailable" until data is ready
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    issue_id = f"license_recommended_{entry.entry_id}"
    if entry.data.get(LICENSE_LEGACY_FLAG) and not has_valid_license_source(resolved):
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            is_fixable=True,
            is_persistent=True,
            severity=ir.IssueSeverity.WARNING,
            translation_key="license_recommended",
            data={"entry_id": entry.entry_id},
        )
    else:
        ir.async_delete_issue(hass, DOMAIN, issue_id)

    for eai_entry in hass.config_entries.async_entries(EAI_DOMAIN):
        entry.async_on_unload(eai_entry.add_update_listener(_async_eai_updated))

    if status == LicenseStatus.NOT_YET_VALID.value and not resolved.entitlements:
        coordinator.schedule_not_yet_valid_recheck()
    elif (
        key
        and not resolved.entitlements
        and status not in (LicenseStatus.VALID.value, LicenseStatus.NOT_YET_VALID.value)
    ):
        entry.async_start_reauth(hass)
    elif has_valid_license_source(resolved):
        coordinator.schedule_license_monitor(resolved.expires_at)

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


async def _async_eai_updated(hass: HomeAssistant, eai_entry: ConfigEntry) -> None:
    """Reload GPM when the EAI license or feature switch changes."""
    for gpm_entry in hass.config_entries.async_entries(DOMAIN):
        await hass.config_entries.async_reload(gpm_entry.entry_id)
