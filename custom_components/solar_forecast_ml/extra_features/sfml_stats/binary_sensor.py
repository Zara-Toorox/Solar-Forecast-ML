# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Binary sensor platform for SFML Stats. @zara"""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, CONF_SMART_CHARGING_ENABLED
from .sensors.binary_sensors import CheapEnergyBinarySensor, SmartChargingBinarySensor


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SFML Stats binary sensor entities from a config entry. @zara"""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data.get("gpm_coordinator")
    if coordinator is None:
        return

    entities = [CheapEnergyBinarySensor(coordinator, entry)]
    if entry.data.get(CONF_SMART_CHARGING_ENABLED):
        entities.append(SmartChargingBinarySensor(coordinator, entry))
    async_add_entities(entities)
