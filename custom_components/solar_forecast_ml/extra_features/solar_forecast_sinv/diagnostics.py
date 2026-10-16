# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# * Based on ha-anker-solix by Thomas Luther (@thomluther), MIT License,
#   Copyright (c) 2024 Thomas Luther. MIT notice: LICENSE-ha-anker-solix
# ******************************************************************************

"""Diagnostics support for solar_forecast_sinv. @thomas"""

from dataclasses import asdict
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntry

from .const import CONF_VENDOR, DOMAIN, LOCAL_VENDORS
from .coordinator import AnkerSolixDataUpdateCoordinator

TO_REDACT = {
    "ip_address",
    "unique_id",
    "username",
    "password",
    "email",
    "owner_user_id",
    "bt_ble_mac",
    "wifi_mac",
    "wifi_name",
    "host",
    "enc_rand",
}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry. @thomas"""
    if entry.data.get(CONF_VENDOR) == "site":
        return {"config_entry": async_redact_data(entry.as_dict(), TO_REDACT)}
    if entry.data.get(CONF_VENDOR) in LOCAL_VENDORS:
        return _local_diagnostics(entry)
    coordinator: AnkerSolixDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]
    if isinstance(coordinator, AnkerSolixDataUpdateCoordinator) and coordinator.client:
        # Wait until client cache is valid
        await coordinator.client.validate_cache()
        cache = coordinator.data or {}
        # redact keys from cache
        entry_dict = entry.as_dict()
        cache["account"] = cache.pop(entry_dict.get("unique_id"), {})
        return {
            "config_entry": async_redact_data(entry_dict, TO_REDACT),
            "cached_data": async_redact_data(cache, TO_REDACT),
        }
    return {}


async def async_get_device_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry, device: DeviceEntry
) -> dict[str, Any]:
    """Return diagnostics for a device. @thomas"""
    if entry.data.get(CONF_VENDOR) in LOCAL_VENDORS:
        devices = _local_diagnostics(entry).get("devices", {})
        return {"device": devices.get(device.serial_number) or {}}
    coordinator: AnkerSolixDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]
    if isinstance(coordinator, AnkerSolixDataUpdateCoordinator) and coordinator.client:
        # Wait until client cache is valid
        await coordinator.client.validate_cache()
        return {
            "cached_data": async_redact_data(
                coordinator.data.get(device.serial_number) or {}, TO_REDACT
            ),
        }
    return {}


def _local_diagnostics(entry: ConfigEntry) -> dict[str, Any]:
    """Return the parsed devices of a local-API instance (no credentials exist). @zara"""
    coordinator = getattr(entry, "runtime_data", None)
    devices = (coordinator.data or {}) if coordinator else {}
    return {
        "config_entry": async_redact_data(entry.as_dict(), TO_REDACT),
        "devices": {
            serial: {**asdict(device), "derived": sorted(device.derived)}
            for serial, device in devices.items()
        },
    }
