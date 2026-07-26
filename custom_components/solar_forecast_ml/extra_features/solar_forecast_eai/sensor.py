"""Passive EAI recommendation sensors."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    PERCENTAGE,
    UnitOfEnergy,
    UnitOfPrecipitationDepth,
    UnitOfSpeed,
    UnitOfTemperature,
    UnitOfTime,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .automation import (
    EAIRecommendationEngine,
    device_info,
    thermal_loss_enabled,
    wallbox_enabled,
)
from .const import (
    CONF_HEAT_PUMP_ENABLED,
    CONF_WEATHER_INTELLIGENCE_ENABLED,
    DOMAIN,
)


@dataclass(frozen=True, kw_only=True)
class EAISensorDescription(SensorEntityDescription):
    pass


WEATHER_EVENT_OPTIONS = [
    "none",
    "forecast_stale",
    "forecast_unavailable",
    "freeze_risk",
    "heat_stress",
    "heavy_precipitation",
    "high_precipitation_probability",
    "strong_wind",
    "storm_wind",
]


SENSORS = (
    EAISensorDescription(
        key="recommended_action",
        translation_key="recommended_action",
        device_class=SensorDeviceClass.ENUM,
        options=["none", "dhw", "heating", "thermal_storage", "defer"],
    ),
    EAISensorDescription(
        key="recommendation_reason",
        translation_key="recommendation_reason",
        device_class=SensorDeviceClass.ENUM,
        options=[
            "none",
            "pv_surplus",
            "low_price",
            "comfort_need",
            "high_price",
            "data_unavailable",
        ],
    ),
    EAISensorDescription(
        key="recommendation_explanation",
        translation_key="recommendation_explanation",
    ),
    EAISensorDescription(
        key="recommendation_confidence",
        translation_key="recommendation_confidence",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="forecast_uncertainty",
        translation_key="forecast_uncertainty",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="next_action_start",
        translation_key="next_action_start",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    EAISensorDescription(
        key="recommendation_valid_until",
        translation_key="recommendation_valid_until",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    EAISensorDescription(
        key="recommended_duration",
        translation_key="recommended_duration",
        native_unit_of_measurement=UnitOfTime.MINUTES,
    ),
    EAISensorDescription(
        key="consumption_next_hour",
        translation_key="consumption_next_hour",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="consumption_today",
        translation_key="consumption_today",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="consumption_tomorrow",
        translation_key="consumption_tomorrow",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="expected_pv_surplus",
        translation_key="expected_pv_surplus",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="estimated_cost_advantage",
        translation_key="estimated_cost_advantage",
        device_class=SensorDeviceClass.MONETARY,
        native_unit_of_measurement="EUR",
    ),
    EAISensorDescription(
        key="data_quality",
        translation_key="data_quality",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="model_status",
        translation_key="model_status",
        device_class=SensorDeviceClass.ENUM,
        options=["learning", "ready", "degraded"],
    ),
)

WALLBOX_SENSORS = (
    EAISensorDescription(
        key="wallbox_recommended_action",
        translation_key="wallbox_recommended_action",
        device_class=SensorDeviceClass.ENUM,
        options=["data_unavailable", "connect", "charge", "defer", "complete"],
    ),
    EAISensorDescription(
        key="wallbox_recommendation_reason",
        translation_key="wallbox_recommendation_reason",
        device_class=SensorDeviceClass.ENUM,
        options=[
            "data_unavailable",
            "pv_surplus",
            "pv_window_upcoming",
            "low_price",
            "departure_deadline",
            "deadline_plan",
            "target_reached",
        ],
    ),
    EAISensorDescription(
        key="wallbox_recommendation_explanation",
        translation_key="wallbox_recommendation_explanation",
    ),
    EAISensorDescription(
        key="wallbox_recommendation_confidence",
        translation_key="wallbox_recommendation_confidence",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="wallbox_forecast_uncertainty",
        translation_key="wallbox_forecast_uncertainty",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="wallbox_next_start",
        translation_key="wallbox_next_start",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    EAISensorDescription(
        key="wallbox_recommended_end",
        translation_key="wallbox_recommended_end",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    EAISensorDescription(
        key="wallbox_required_energy",
        translation_key="wallbox_required_energy",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="wallbox_expected_pv_share",
        translation_key="wallbox_expected_pv_share",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="wallbox_estimated_cost",
        translation_key="wallbox_estimated_cost",
        device_class=SensorDeviceClass.MONETARY,
        native_unit_of_measurement="EUR",
    ),
    EAISensorDescription(
        key="wallbox_estimated_cost_advantage",
        translation_key="wallbox_estimated_cost_advantage",
        device_class=SensorDeviceClass.MONETARY,
        native_unit_of_measurement="EUR",
    ),
    EAISensorDescription(
        key="wallbox_departure_readiness",
        translation_key="wallbox_departure_readiness",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="wallbox_data_quality",
        translation_key="wallbox_data_quality",
        native_unit_of_measurement=PERCENTAGE,
    ),
)

THERMAL_LOSS_SENSORS = (
    EAISensorDescription(
        key="storage_heat_loss_coefficient",
        translation_key="storage_heat_loss_coefficient",
        native_unit_of_measurement="W/K",
    ),
    EAISensorDescription(
        key="storage_standby_loss",
        translation_key="storage_standby_loss",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="circulation_loss",
        translation_key="circulation_loss",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="thermal_loss_forecast",
        translation_key="thermal_loss_forecast",
        device_class=SensorDeviceClass.ENERGY,
        native_unit_of_measurement=UnitOfEnergy.KILO_WATT_HOUR,
    ),
    EAISensorDescription(
        key="thermal_loss_data_quality",
        translation_key="thermal_loss_data_quality",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="thermal_loss_status",
        translation_key="thermal_loss_status",
        device_class=SensorDeviceClass.ENUM,
        options=["not_configured", "learning", "partial", "implausible", "ready"],
    ),
)

WEATHER_INTELLIGENCE_SENSORS = (
    EAISensorDescription(
        key="weather_intelligence_status",
        translation_key="weather_intelligence_status",
        device_class=SensorDeviceClass.ENUM,
        options=["disabled", "degraded", "cold_start", "ready"],
    ),
    EAISensorDescription(
        key="weather_data_quality",
        translation_key="weather_data_quality",
        native_unit_of_measurement=PERCENTAGE,
    ),
    EAISensorDescription(
        key="weather_paired_samples",
        translation_key="weather_paired_samples",
    ),
    EAISensorDescription(
        key="weather_temperature_mae",
        translation_key="weather_temperature_mae",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
    ),
    EAISensorDescription(
        key="weather_temperature_bias",
        translation_key="weather_temperature_bias",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
    ),
    EAISensorDescription(
        key="weather_temperature_uncertainty",
        translation_key="weather_temperature_uncertainty",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
    ),
    EAISensorDescription(
        key="weather_active_event",
        translation_key="weather_active_event",
        device_class=SensorDeviceClass.ENUM,
        options=WEATHER_EVENT_OPTIONS,
    ),
    EAISensorDescription(
        key="weather_forecast_valid_until",
        translation_key="weather_forecast_valid_until",
        device_class=SensorDeviceClass.TIMESTAMP,
    ),
    EAISensorDescription(
        key="weather_next_event",
        translation_key="weather_next_event",
        device_class=SensorDeviceClass.ENUM,
        options=WEATHER_EVENT_OPTIONS,
    ),
    EAISensorDescription(key="weather_next_event_severity", translation_key="weather_next_event_severity", device_class=SensorDeviceClass.ENUM, options=["none", "advisory", "warning", "critical"]),
    EAISensorDescription(key="weather_next_event_start", translation_key="weather_next_event_start", device_class=SensorDeviceClass.TIMESTAMP),
    EAISensorDescription(key="weather_next_event_end", translation_key="weather_next_event_end", device_class=SensorDeviceClass.TIMESTAMP),
    EAISensorDescription(key="weather_precipitation_next_24h", translation_key="weather_precipitation_next_24h", device_class=SensorDeviceClass.PRECIPITATION, native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS),
    EAISensorDescription(key="weather_precipitation_probability_next_24h", translation_key="weather_precipitation_probability_next_24h", native_unit_of_measurement=PERCENTAGE),
    EAISensorDescription(key="weather_temperature_min_next_24h", translation_key="weather_temperature_min_next_24h", device_class=SensorDeviceClass.TEMPERATURE, native_unit_of_measurement=UnitOfTemperature.CELSIUS),
    EAISensorDescription(key="weather_temperature_max_next_24h", translation_key="weather_temperature_max_next_24h", device_class=SensorDeviceClass.TEMPERATURE, native_unit_of_measurement=UnitOfTemperature.CELSIUS),
    EAISensorDescription(key="weather_wind_speed_max_next_24h", translation_key="weather_wind_speed_max_next_24h", device_class=SensorDeviceClass.WIND_SPEED, native_unit_of_measurement=UnitOfSpeed.KILOMETERS_PER_HOUR),
    EAISensorDescription(key="weather_forecast_confidence", translation_key="weather_forecast_confidence", native_unit_of_measurement=PERCENTAGE),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    config = {**entry.data, **entry.options}
    descriptions = SENSORS if config.get(CONF_HEAT_PUMP_ENABLED, True) else ()
    if wallbox_enabled(entry):
        descriptions += WALLBOX_SENSORS
    if thermal_loss_enabled(entry):
        descriptions += THERMAL_LOSS_SENSORS
    async_add_entities(
        EAISensor(runtime.recommendation_engine, entry, description)
        for description in descriptions
    )
    if config.get(CONF_WEATHER_INTELLIGENCE_ENABLED, False):
        async_add_entities(
            EAIWeatherIntelligenceSensor(runtime, entry, description)
            for description in WEATHER_INTELLIGENCE_SENSORS
        )


class EAISensor(SensorEntity):
    _attr_has_entity_name = True

    def __init__(
        self,
        engine: EAIRecommendationEngine,
        entry: ConfigEntry,
        description: EAISensorDescription,
    ) -> None:
        self.engine = engine
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_automation_{description.key}"
        self._attr_device_info = device_info(entry.entry_id)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self.engine.add_listener(self.async_write_ha_state))

    @property
    def native_value(self) -> Any:
        return self.engine.snapshot().values[self.entity_description.key]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return self.engine.snapshot().attributes[self.entity_description.key]


class EAIWeatherIntelligenceSensor(SensorEntity):
    """Expose bounded, explainable weather-intelligence results."""

    _attr_has_entity_name = True

    def __init__(
        self,
        runtime: Any,
        entry: ConfigEntry,
        description: EAISensorDescription,
    ) -> None:
        self.runtime = runtime
        self.entity_description = description
        self._attr_unique_id = (
            f"{entry.entry_id}_weather_intelligence_{description.key}"
        )
        self._attr_device_info = device_info(entry.entry_id)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            self.runtime.add_weather_intelligence_listener(self.async_write_ha_state)
        )

    @property
    def native_value(self) -> Any:
        snapshot = self.runtime.weather_intelligence_snapshot
        key = self.entity_description.key
        quality = snapshot.get("data_quality", {})
        if key == "weather_intelligence_status":
            return snapshot.get("status", "degraded")
        if key == "weather_data_quality":
            return quality.get("score_percent", 0)
        if key == "weather_paired_samples":
            return quality.get("paired_samples", 0)
        if key == "weather_temperature_mae":
            return self._accuracy_value("mae")
        if key == "weather_temperature_bias":
            return self._accuracy_value("bias")
        if key == "weather_temperature_uncertainty":
            uncertainty = snapshot.get("uncertainty", {})
            return (
                uncertainty.get("temperature_c")
                if uncertainty.get("available")
                else None
            )
        if key == "weather_active_event":
            events = snapshot.get("events", [])
            return events[0].get("code", "none") if events else "none"
        if key == "weather_forecast_valid_until":
            return self._timestamp(snapshot.get("valid_at"))
        event = self._event(snapshot)
        if key == "weather_next_event":
            return event.get("code", "none")
        if key == "weather_next_event_severity":
            return event.get("severity", "none")
        if key == "weather_next_event_start":
            return self._timestamp(event.get("start"))
        if key == "weather_next_event_end":
            return self._timestamp(event.get("end"))
        outlook = snapshot.get("outlook", {}).get("next_hours", {})
        if key == "weather_precipitation_next_24h":
            return outlook.get("precipitation_forecast_mm")
        if key == "weather_precipitation_probability_next_24h":
            return outlook.get("precipitation_probability_max")
        if key == "weather_temperature_min_next_24h":
            return outlook.get("temperature_min_c")
        if key == "weather_temperature_max_next_24h":
            return outlook.get("temperature_max_c")
        if key == "weather_wind_speed_max_next_24h":
            return outlook.get("wind_speed_max")
        if key == "weather_forecast_confidence":
            return quality.get("score_percent", 0)
        return None

    @staticmethod
    def _event(snapshot: dict[str, Any]) -> dict[str, Any]:
        events = snapshot.get("events", [])
        return events[0] if isinstance(events, list) and events else {}

    @staticmethod
    def _timestamp(value: Any) -> Any:
        if not value:
            return None
        from datetime import datetime
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None

    def _accuracy_value(self, metric: str) -> float | None:
        accuracy = self.runtime.weather_intelligence_snapshot.get("accuracy", {})
        for bucket in ("0_6h", "6_24h", "24_72h"):
            value = accuracy.get(bucket, {}).get(metric)
            if value is not None:
                return float(value)
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        snapshot = self.runtime.weather_intelligence_snapshot
        key = self.entity_description.key
        if key == "weather_intelligence_status":
            return {
                "source_status": snapshot.get("source_status"),
                "cold_start": snapshot.get("cold_start", True),
                "data_quality": snapshot.get("data_quality", {}),
            }
        if key in {"weather_temperature_mae", "weather_temperature_bias"}:
            return {"accuracy_by_horizon": snapshot.get("accuracy", {})}
        if key == "weather_temperature_uncertainty":
            return snapshot.get("uncertainty", {})
        if key == "weather_active_event":
            return {"events": snapshot.get("events", [])}
        if key.startswith("weather_next_event"):
            return {"event": self._event(snapshot)}
        if key.endswith("next_24h"):
            return {"hours": snapshot.get("outlook", {}).get("next_hours", {}).get("hours", 0)}
        return {}
