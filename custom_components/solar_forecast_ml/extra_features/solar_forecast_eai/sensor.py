"""Passive EAI recommendation sensors."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

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
from homeassistant.util import dt as dt_util

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
    "thunderstorm",
    "hail",
    "snow_or_ice",
    "dense_fog",
    "severe_weather",
]

WEATHER_WARNING_SEVERITY_RANK = {"warning": 1, "critical": 2}
WEATHER_NON_HAZARD_CODES = {"none", "forecast_stale", "forecast_unavailable"}
WEATHER_WARNING_ICON_KEYS = {
    "frost",
    "heat",
    "heavy_rain",
    "rain_likely",
    "strong_wind",
    "storm",
    "thunderstorm",
    "hail",
    "snow_or_ice",
    "fog",
    "severe_weather",
}
WEATHER_WARNING_EVIDENCE_KINDS = {"condition_derived", "forecast_value"}


def _weather_event_code(value: Any) -> str:
    """Keep enum sensors valid when a stale snapshot contains an old code."""
    return value if isinstance(value, str) and value in WEATHER_EVENT_OPTIONS else "none"


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
            "planning_window_incomplete",
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
        options=["disabled", "dependency_missing", "degraded", "cold_start", "ready"],
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
    EAISensorDescription(
        key="weather_most_important_warning",
        translation_key="weather_most_important_warning",
        device_class=SensorDeviceClass.ENUM,
        options=WEATHER_EVENT_OPTIONS,
    ),
    EAISensorDescription(
        key="weather_event_today",
        translation_key="weather_event_today",
        device_class=SensorDeviceClass.ENUM,
        options=WEATHER_EVENT_OPTIONS,
    ),
    EAISensorDescription(
        key="weather_event_tomorrow",
        translation_key="weather_event_tomorrow",
        device_class=SensorDeviceClass.ENUM,
        options=WEATHER_EVENT_OPTIONS,
    ),
    EAISensorDescription(
        key="weather_event_day_after_tomorrow",
        translation_key="weather_event_day_after_tomorrow",
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
            return _weather_event_code(self._active_event(snapshot).get("code"))
        if key == "weather_forecast_valid_until":
            return self._timestamp(snapshot.get("valid_at"))
        event = self._next_event(snapshot)
        if key == "weather_next_event":
            return _weather_event_code(event.get("code"))
        if key == "weather_most_important_warning":
            return _weather_event_code(
                self._most_important_warning(snapshot).get("code")
            )
        day_offsets = {
            "weather_event_today": 0,
            "weather_event_tomorrow": 1,
            "weather_event_day_after_tomorrow": 2,
        }
        if key in day_offsets:
            return _weather_event_code(
                self._event_for_day(snapshot, day_offsets[key]).get("code")
            )
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

    @classmethod
    def _active_event(cls, snapshot: dict[str, Any]) -> dict[str, Any]:
        now = dt_util.utcnow()
        for event in cls._events(snapshot):
            start = cls._timestamp(event.get("start"))
            end = cls._timestamp(event.get("end"))
            if start is None and end is None:
                return event
            if start is not None and start <= now and (end is None or now < end):
                return event
        return {}

    @classmethod
    def _next_event(cls, snapshot: dict[str, Any]) -> dict[str, Any]:
        now = dt_util.utcnow()
        for event in cls._events(snapshot):
            start = cls._timestamp(event.get("start"))
            if start is None or start > now:
                return event
        return {}

    @classmethod
    def _most_important_warning(
        cls, snapshot: dict[str, Any]
    ) -> dict[str, Any]:
        """Return the highest-severity warning, then the earliest one."""
        warnings = cls._warning_events(snapshot)
        if not warnings:
            return {}

        def sort_key(event: dict[str, Any]) -> tuple[int, float, str]:
            severity_rank = WEATHER_WARNING_SEVERITY_RANK[event["severity"]]
            start = cls._timestamp(event.get("start"))
            return (
                -severity_rank,
                start.timestamp() if start is not None else float("inf"),
                str(event.get("code", "")),
            )

        return min(warnings, key=sort_key)

    @staticmethod
    def _warning_event_id(event: dict[str, Any]) -> str | None:
        if not event:
            return None
        identity = [
            str(event.get(key, ""))
            for key in ("code", "severity", "start", "end")
        ]
        return hashlib.sha256(
            json.dumps(identity, separators=(",", ":")).encode()
        ).hexdigest()

    @classmethod
    def _warning_events(cls, snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        warnings = []
        now = dt_util.utcnow()
        events = snapshot.get("events", [])
        if not isinstance(events, list):
            return warnings
        for event in events[:24]:
            if not isinstance(event, dict):
                continue
            severity = event.get("severity")
            code = event.get("code")
            contract_version = event.get("contract_version")
            category = event.get("category")
            evidence_kind = event.get("evidence_kind")
            start = cls._timestamp(event.get("start"))
            end = cls._timestamp(event.get("end"))
            if (
                not isinstance(severity, str)
                or severity not in WEATHER_WARNING_SEVERITY_RANK
                or not isinstance(code, str)
                or code not in WEATHER_EVENT_OPTIONS
                or code in WEATHER_NON_HAZARD_CODES
                or type(contract_version) is not int
                or contract_version != 1
                or category != "weather_hazard"
                or not isinstance(evidence_kind, str)
                or evidence_kind not in WEATHER_WARNING_EVIDENCE_KINDS
                or start is None
                or end is None
                or start.utcoffset() is None
                or end.utcoffset() is None
                or end <= start
                or end <= now
            ):
                continue
            icon_key = event.get("icon_key")
            warnings.append(
                {
                    "code": code,
                    "severity": severity,
                    "contract_version": contract_version,
                    "category": category,
                    "evidence_kind": evidence_kind,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "title": cls._bounded_warning_text(event, "title", 160),
                    "recommended_action": cls._bounded_warning_text(
                        event, "recommended_action", 320
                    ),
                    "icon_key": (
                        icon_key
                        if isinstance(icon_key, str)
                        and icon_key in WEATHER_WARNING_ICON_KEYS
                        else None
                    ),
                    "official_alert": event.get("official_alert") is True,
                }
            )
        return warnings

    @staticmethod
    def _bounded_warning_text(
        warning: dict[str, Any], key: str, limit: int
    ) -> str | None:
        value = warning.get(key)
        if not isinstance(value, str) or not value.strip():
            return None
        return value.strip()[:limit]

    @staticmethod
    def _events(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        events = snapshot.get("events", [])
        return [event for event in events if isinstance(event, dict)]

    def _event_for_day(
        self, snapshot: dict[str, Any], day_offset: int
    ) -> dict[str, Any]:
        events = self._events_for_day(snapshot, day_offset)
        return events[0] if events else {}

    def _events_for_day(
        self, snapshot: dict[str, Any], day_offset: int
    ) -> list[dict[str, Any]]:
        time_zone_name = getattr(
            getattr(self.runtime.hass, "config", None), "time_zone", None
        )
        try:
            local_zone = ZoneInfo(time_zone_name) if time_zone_name else None
        except (TypeError, ValueError):
            local_zone = None
        now = dt_util.utcnow()
        now = now.astimezone(local_zone) if local_zone else now.astimezone()
        target_date = now.date() + timedelta(days=day_offset)
        day_start = datetime.combine(
            target_date, datetime.min.time(), tzinfo=now.tzinfo
        )
        day_end = datetime.combine(
            target_date + timedelta(days=1),
            datetime.min.time(),
            tzinfo=now.tzinfo,
        )
        matching: list[dict[str, Any]] = []
        events = snapshot.get("events", [])
        for event in events if isinstance(events, list) else []:
            if not isinstance(event, dict):
                continue
            start = self._timestamp(event.get("start"))
            if start is None:
                if day_offset == 0:
                    matching.append(event)
                continue
            local_start = start.astimezone(local_zone) if local_zone else start.astimezone()
            end = self._timestamp(event.get("end"))
            local_end = (
                end.astimezone(local_zone) if end is not None and local_zone
                else end.astimezone() if end is not None
                else None
            )
            if local_start < day_end and (
                local_end is None or local_end > day_start
            ):
                matching.append(event)
        return matching

    @staticmethod
    def _timestamp(value: Any) -> Any:
        if not value:
            return None
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
            raw_history = snapshot.get("actual_history")
            history = raw_history if isinstance(raw_history, dict) else {}
            precipitation = (
                dict(history.get("precipitation", {}))
                if isinstance(history, dict)
                and isinstance(history.get("precipitation"), dict)
                else {}
            )
            precipitation.pop("daily", None)
            return {
                "source_status": snapshot.get("source_status"),
                "cold_start": snapshot.get("cold_start", True),
                "data_quality": snapshot.get("data_quality", {}),
                "history": {
                    "available": history.get("available", False),
                    "status": history.get("status"),
                    "source": history.get("source"),
                    "data_since": history.get("data_since"),
                    "data_to": history.get("data_to"),
                    "coverage_percent": history.get("coverage"),
                    "coverage_by_metric": history.get(
                        "coverage_by_metric", {}
                    ),
                    "complete_recorder_history": history.get(
                        "complete_recorder_history", False
                    ),
                    "history_truncated": history.get(
                        "history_truncated", False
                    ),
                    "daily_points": len(history.get("timeline", [])),
                    "recent_hourly_points": len(
                        history.get("recent_timeline", [])
                    ),
                    "monthly_points": len(
                        history.get("monthly_series", [])
                    ),
                    "days": history.get("days", {}),
                    "precipitation": precipitation,
                },
            }
        if key in {"weather_temperature_mae", "weather_temperature_bias"}:
            return {"accuracy_by_horizon": snapshot.get("accuracy", {})}
        if key == "weather_temperature_uncertainty":
            return snapshot.get("uncertainty", {})
        if key == "weather_active_event":
            return {
                "event": self._active_event(snapshot) or None,
                "events": snapshot.get("events", []),
            }
        if key.startswith("weather_next_event"):
            return {"event": self._next_event(snapshot)}
        if key == "weather_most_important_warning":
            warning = self._most_important_warning(snapshot)
            warnings = self._warning_events(snapshot)
            return {
                "event_id": self._warning_event_id(warning),
                "code": self._bounded_warning_text(warning, "code", 64),
                "severity": warning.get("severity"),
                "contract_version": warning.get("contract_version"),
                "category": warning.get("category"),
                "evidence_kind": warning.get("evidence_kind"),
                "title": self._bounded_warning_text(warning, "title", 160),
                "start": self._bounded_warning_text(warning, "start", 64),
                "end": self._bounded_warning_text(warning, "end", 64),
                "recommended_action": self._bounded_warning_text(
                    warning, "recommended_action", 320
                ),
                "icon_key": self._bounded_warning_text(
                    warning, "icon_key", 64
                ),
                "official_alert": warning.get("official_alert") is True,
                "warning_count": len(warnings),
            }
        day_offsets = {
            "weather_event_today": 0,
            "weather_event_tomorrow": 1,
            "weather_event_day_after_tomorrow": 2,
        }
        if key in day_offsets:
            events = self._events_for_day(snapshot, day_offsets[key])
            return {"event": events[0] if events else None, "events": events}
        if key.endswith("next_24h"):
            return {"hours": snapshot.get("outlook", {}).get("next_hours", {}).get("hours", 0)}
        return {}
