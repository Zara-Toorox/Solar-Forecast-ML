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
from homeassistant.const import PERCENTAGE, UnitOfEnergy, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .automation import (
    EAIRecommendationEngine,
    device_info,
    thermal_loss_enabled,
    wallbox_enabled,
)
from .const import DOMAIN


@dataclass(frozen=True, kw_only=True)
class EAISensorDescription(SensorEntityDescription):
    pass


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
        options=["learning", "partial", "ready"],
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    descriptions = SENSORS
    if wallbox_enabled(entry):
        descriptions += WALLBOX_SENSORS
    if thermal_loss_enabled(entry):
        descriptions += THERMAL_LOSS_SENSORS
    async_add_entities(
        EAISensor(runtime.recommendation_engine, entry, description)
        for description in descriptions
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
