# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Sensor platform for SFML Stats. @zara"""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .sensors.price_sensors import (
    SpotPriceSensor,
    TotalPriceSensor,
    SpotPriceNextHourSensor,
    TotalPriceNextHourSensor,
    CheapestHourSensor,
    MostExpensiveHourSensor,
    AveragePriceTodaySensor,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up SFML Stats sensor entities from a config entry. @zara"""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator = data.get("gpm_coordinator")
    if coordinator is None:
        return

    entities = [
        SpotPriceSensor(coordinator, entry),
        TotalPriceSensor(coordinator, entry),
        SpotPriceNextHourSensor(coordinator, entry),
        TotalPriceNextHourSensor(coordinator, entry),
        CheapestHourSensor(coordinator, entry),
        MostExpensiveHourSensor(coordinator, entry),
        AveragePriceTodaySensor(coordinator, entry),
    ]
    async_add_entities(entities)
