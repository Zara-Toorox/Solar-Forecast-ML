"""Solar Forecast Energy AI licensed onboarding runtime."""

from __future__ import annotations

# ruff: noqa: E402

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
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.typing import ConfigType

from .capability import EAICapabilityProvider
from .automation import is_legacy_eai_unique_id
from .const import (
    CONF_CAPABILITY_LEVEL,
    CONF_LICENSE_KEY,
    DOMAIN,
)
from .license import OfflineLicenseValidator
from .runtime import EAIRuntime

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


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    provider = get_capability_provider(hass)
    result = get_license_validator(hass).validate(entry.data.get(CONF_LICENSE_KEY, ""))
    provider.update_license(result)
    if result.status.value != "valid":
        hass.data[DOMAIN].pop(entry.entry_id, None)
        entry.async_start_reauth(hass)
        return True
    provider.update_configuration(
        configured=True,
        capability_level=entry.options.get(
            CONF_CAPABILITY_LEVEL, entry.data.get(CONF_CAPABILITY_LEVEL, "standard")
        ),
        config={**entry.data, **entry.options},
    )
    runtime = EAIRuntime(hass, entry, provider)
    hass.data[DOMAIN][entry.entry_id] = runtime
    runtime_ready = await runtime.async_setup()
    if not runtime_ready:
        # The stable read-only provider remains available. Coordinator failures
        # are isolated and reported additively through the provider snapshot.
        pass
    _remove_legacy_eai_entities(hass, entry)
    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    except Exception:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        await runtime.async_shutdown()
        provider.reset()
        raise
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


def _remove_legacy_eai_entities(hass: HomeAssistant, entry: ConfigEntry) -> None:
    registry = er.async_get(hass)
    for entity in list(registry.entities.values()):
        if (
            entity.config_entry_id == entry.entry_id
            and entity.platform == DOMAIN
            and is_legacy_eai_unique_id(entry.entry_id, entity.unique_id)
        ):
            registry.async_remove(entity.entity_id)


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
