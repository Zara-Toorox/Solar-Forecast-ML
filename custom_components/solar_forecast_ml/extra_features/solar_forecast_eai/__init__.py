"""Solar Forecast Energy AI licensed onboarding runtime."""

from __future__ import annotations

# ruff: noqa: E402

import math
import logging
import sys
from pathlib import Path

_runtime_path = str(Path(__file__).parent)
if _runtime_path not in sys.path:
    sys.path.insert(0, _runtime_path)
try:
    import pyarmor_runtime_009810  # type: ignore[import-not-found]  # noqa: F401
except ImportError:
    pass

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .capability import EAICapabilityProvider
from .const import (
    CONF_CAPABILITY_LEVEL,
    CONF_COP_RATED,
    CONF_COP_RATED_CONFIRMED,
    CONF_HEAT_PUMP_ENABLED,
    CONF_HEATING_CAPACITY_CONFIRMED,
    CONF_HEATING_CAPACITY_KW,
    CONF_LICENSE_KEY,
    CONF_OUTDOOR_TEMP_ENTITY,
    CONF_WALLBOX_ENABLED,
    CONF_WEATHER_INTELLIGENCE_ENABLED,
    CONF_WP_TYPE,
    CONFIG_ENTRY_VERSION,
    DOMAIN,
    ISSUE_HYDRAULICS_SETUP_INCOMPLETE,
    SUPPORTED_WP_TYPES,
)
from .license import OfflineLicenseValidator
from .runtime import EAIRuntime
from .setup_state import (
    hydraulics_setup_incomplete,
    issue_id_for_entry,
    mark_shipping_defaults_unconfirmed,
)

_LOGGER = logging.getLogger(__name__)

PROVIDER_KEY = "capability_provider"
VALIDATOR_KEY = "license_validator"
PLATFORMS = (Platform.SENSOR, Platform.BINARY_SENSOR, Platform.SWITCH)


def get_capability_provider(hass: HomeAssistant) -> EAICapabilityProvider:
    domain_data = hass.data.setdefault(DOMAIN, {})
    provider = domain_data.get(PROVIDER_KEY)
    if not isinstance(provider, EAICapabilityProvider):
        provider = EAICapabilityProvider(hass)
        domain_data[PROVIDER_KEY] = provider
    return provider


def get_license_validator(hass: HomeAssistant) -> OfflineLicenseValidator:
    candidate = hass.data.setdefault(DOMAIN, {}).get(VALIDATOR_KEY)
    return (
        candidate
        if isinstance(candidate, OfflineLicenseValidator)
        else OfflineLicenseValidator()
    )


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    get_capability_provider(hass)
    return True


def _merged_entry_config(entry: ConfigEntry) -> dict[str, object]:
    return {**entry.data, **entry.options}


def _validate_optional_positive(
    value: object, minimum: float, maximum: float
) -> bool:
    if value in (None, ""):
        return True
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(parsed) and minimum <= parsed <= maximum


async def _async_sync_hydraulics_repair(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    from homeassistant.helpers import issue_registry as ir

    issue_id = issue_id_for_entry(entry.entry_id)
    config = _merged_entry_config(entry)
    if hydraulics_setup_incomplete(config):
        ir.async_create_issue(
            hass,
            DOMAIN,
            issue_id,
            is_fixable=True,
            severity=ir.IssueSeverity.WARNING,
            translation_key=ISSUE_HYDRAULICS_SETUP_INCOMPLETE,
            data={"entry_id": entry.entry_id},
        )
        return
    ir.async_delete_issue(hass, DOMAIN, issue_id)


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if entry.version > CONFIG_ENTRY_VERSION:
        return False
    data = dict(entry.data)
    options = dict(entry.options)
    changed = False
    for target in (data, options):
        if CONF_OUTDOOR_TEMP_ENTITY not in target and target.get("temp_sensor"):
            target[CONF_OUTDOOR_TEMP_ENTITY] = target["temp_sensor"]
            changed = True
    configured_type = options.get(CONF_WP_TYPE, data.get(CONF_WP_TYPE))
    if configured_type not in (None, "") and configured_type not in SUPPORTED_WP_TYPES:
        return False
    # Safe feature-off defaults only. Hydraulics keys stay unanswered.
    if CONF_WALLBOX_ENABLED not in data and CONF_WALLBOX_ENABLED not in options:
        data[CONF_WALLBOX_ENABLED] = False
        changed = True
    if CONF_HEAT_PUMP_ENABLED not in data and CONF_HEAT_PUMP_ENABLED not in options:
        data[CONF_HEAT_PUMP_ENABLED] = True
        changed = True
    if (
        CONF_WEATHER_INTELLIGENCE_ENABLED not in data
        and CONF_WEATHER_INTELLIGENCE_ENABLED not in options
    ):
        data[CONF_WEATHER_INTELLIGENCE_ENABLED] = False
        changed = True
    flagged = mark_shipping_defaults_unconfirmed({**data, **options})
    for key in (CONF_COP_RATED_CONFIRMED, CONF_HEATING_CAPACITY_CONFIRMED):
        if flagged.get(key) != options.get(key, data.get(key)):
            data[key] = flagged.get(key)
            changed = True
    cop = options.get(CONF_COP_RATED, data.get(CONF_COP_RATED))
    capacity = options.get(CONF_HEATING_CAPACITY_KW, data.get(CONF_HEATING_CAPACITY_KW))
    if not _validate_optional_positive(cop, 1.0, 10.0):
        return False
    if not _validate_optional_positive(capacity, 1.0, 100.0):
        return False
    if changed or entry.version < CONFIG_ENTRY_VERSION:
        hass.config_entries.async_update_entry(
            entry, data=data, options=options, version=CONFIG_ENTRY_VERSION
        )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    provider = get_capability_provider(hass)
    result = get_license_validator(hass).validate(entry.data.get(CONF_LICENSE_KEY, ""))
    provider.update_license(result)
    if result.status.value != "valid":
        hass.data[DOMAIN].pop(entry.entry_id, None)
        if str(entry.data.get(CONF_LICENSE_KEY, "")).strip():
            entry.async_start_reauth(hass)
        return True
    provider.update_configuration(
        configured=True,
        capability_level=entry.options.get(
            CONF_CAPABILITY_LEVEL, entry.data.get(CONF_CAPABILITY_LEVEL, "standard")
        ),
        config={**entry.data, **entry.options},
    )
    runtime = EAIRuntime(
        hass,
        entry,
        provider,
        license_validator=get_license_validator(hass),
    )
    hass.data[DOMAIN][entry.entry_id] = runtime
    runtime_ready = await runtime.async_setup()
    if not runtime_ready:
        # The stable read-only provider remains available. Coordinator failures
        # are isolated and reported additively through the provider snapshot.
        pass
    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    except Exception:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        await runtime.async_shutdown()
        provider.reset()
        raise
    runtime.schedule_license_monitor(result.payload.expires_at)
    await _async_sync_hydraulics_repair(hass, entry)
    return True


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    domain_data = hass.data.get(DOMAIN, {})
    if (
        entry.entry_id in domain_data
        and not await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    ):
        return False
    runtime = domain_data.pop(entry.entry_id, None)
    if isinstance(runtime, EAIRuntime):
        await runtime.async_shutdown()
    get_capability_provider(hass).reset()
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Delete the entry-scoped Premium weather evaluation on removal."""
    from homeassistant.helpers.storage import Store

    for label, key in (
        ("weather_intelligence", f"{DOMAIN}.weather_intelligence.{entry.entry_id}"),
        ("insights_learning", f"{DOMAIN}.insights_learning.{entry.entry_id}"),
    ):
        try:
            await Store(hass, 1, key).async_remove()
        except Exception:  # noqa: BLE001
            _LOGGER.warning("EAI entry-scoped %s storage could not be removed", label)
