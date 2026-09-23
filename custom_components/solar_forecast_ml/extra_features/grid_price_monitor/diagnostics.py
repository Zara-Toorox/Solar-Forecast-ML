"""Config-entry diagnostics without license key material."""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import CONF_LICENSE_ID, CONF_LICENSE_KEY, DOMAIN
from .license import mask_license_id


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    coordinator = hass.data[DOMAIN][entry.entry_id]

    def _public_mapping(values: dict[str, Any]) -> dict[str, Any]:
        public = {
            key: value for key, value in values.items() if key != CONF_LICENSE_KEY
        }
        if CONF_LICENSE_ID in public:
            public[CONF_LICENSE_ID] = mask_license_id(public.get(CONF_LICENSE_ID))
        return public

    snapshot = coordinator.snapshot()
    return {
        "entry": _public_mapping(dict(entry.data)),
        "options": _public_mapping(dict(entry.options)),
        "license_source": snapshot.get("license_source"),
        "license_status": snapshot.get("license_status"),
        "license_id": snapshot.get("license_id_masked"),
        "snapshot": snapshot,
    }
