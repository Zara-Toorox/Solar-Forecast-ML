"""Passive EAI automation condition sensors."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .automation import EAIRecommendationEngine, device_info, wallbox_enabled
from .const import CONF_HEAT_PUMP_ENABLED, CONF_WEATHER_INTELLIGENCE_ENABLED, DOMAIN

BINARY_SENSORS = tuple(
    BinarySensorEntityDescription(key=key, translation_key=key)
    for key in (
        "automation_ready",
        "pv_window_active",
        "dhw_recommended",
        "heating_recommended",
        "thermal_storage_recommended",
        "low_price_window_active",
        "operation_deferrable",
        "critical_data_issue",
    )
)
WALLBOX_BINARY_SENSORS = tuple(
    BinarySensorEntityDescription(key=key, translation_key=key)
    for key in (
        "wallbox_charging_window_active",
        "wallbox_pv_charging_recommended",
        "wallbox_residual_pv_window_active",
        "wallbox_low_price_charging_recommended",
        "wallbox_departure_risk",
    )
)
WEATHER_INTELLIGENCE_BINARY_SENSORS = tuple(
    BinarySensorEntityDescription(key=key, translation_key=key)
    for key in (
        "weather_alert_active",
        "weather_frost_risk",
        "weather_heavy_rain_risk",
        "weather_high_wind_risk",
        "weather_heat_stress_risk",
        "weather_forecast_stale",
    )
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    config = {**entry.data, **entry.options}
    descriptions = (
        BINARY_SENSORS if config.get(CONF_HEAT_PUMP_ENABLED, True) else ()
    ) + (WALLBOX_BINARY_SENSORS if wallbox_enabled(entry) else ())
    async_add_entities(
        EAIBinarySensor(runtime.recommendation_engine, entry, description)
        for description in descriptions
    )
    if config.get(CONF_WEATHER_INTELLIGENCE_ENABLED, False):
        async_add_entities(
            EAIWeatherIntelligenceBinarySensor(runtime, entry, description)
            for description in WEATHER_INTELLIGENCE_BINARY_SENSORS
        )


class EAIBinarySensor(BinarySensorEntity):
    _attr_has_entity_name = True

    def __init__(
        self,
        engine: EAIRecommendationEngine,
        entry: ConfigEntry,
        description: BinarySensorEntityDescription,
    ) -> None:
        self.engine = engine
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_automation_{description.key}"
        self._attr_device_info = device_info(entry.entry_id)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.engine.add_listener(self.async_write_ha_state))

    @property
    def is_on(self) -> bool:
        return bool(self.engine.snapshot().values[self.entity_description.key])

    @property
    def extra_state_attributes(self):
        return self.engine.snapshot().attributes[self.entity_description.key]


class EAIWeatherIntelligenceBinarySensor(BinarySensorEntity):
    """Expose forecast weather risks as ready-to-use automation triggers."""

    _attr_has_entity_name = True

    def __init__(self, runtime, entry: ConfigEntry, description: BinarySensorEntityDescription) -> None:
        self.runtime = runtime
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_weather_intelligence_{description.key}"
        self._attr_device_info = device_info(entry.entry_id)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            self.runtime.add_weather_intelligence_listener(self.async_write_ha_state)
        )

    @property
    def is_on(self) -> bool:
        snapshot = self.runtime.weather_intelligence_snapshot
        events = snapshot.get("events", [])
        codes = {event.get("code") for event in events if isinstance(event, dict)}
        key = self.entity_description.key
        if key == "weather_alert_active":
            return bool(codes - {"forecast_stale", "forecast_unavailable"})
        if key == "weather_frost_risk":
            return "freeze_risk" in codes
        if key == "weather_heavy_rain_risk":
            return bool({"heavy_precipitation", "high_precipitation_probability"} & codes)
        if key == "weather_high_wind_risk":
            return bool({"strong_wind", "storm_wind"} & codes)
        if key == "weather_heat_stress_risk":
            return "heat_stress" in codes
        if key == "weather_forecast_stale":
            return "forecast_stale" in codes or snapshot.get("source_status") == "stale"
        return False

    @property
    def extra_state_attributes(self):
        return {"events": self.runtime.weather_intelligence_snapshot.get("events", [])}
