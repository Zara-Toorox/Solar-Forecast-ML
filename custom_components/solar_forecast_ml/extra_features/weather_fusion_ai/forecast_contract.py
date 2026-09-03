"""Public, data-minimised forecast snapshot contract for WFAI consumers."""

from __future__ import annotations

from datetime import datetime
from itertools import islice
from math import isfinite
from typing import Any, Final, Iterable


FORECAST_CONTRACT_VERSION: Final = 1

SNAPSHOT_STATUS_AVAILABLE: Final = "available"
SNAPSHOT_STATUS_STALE: Final = "stale"
SNAPSHOT_STATUS_UNAVAILABLE: Final = "unavailable"

# This whitelist is deliberately the complete public hourly contract. In
# particular, source internals, coordinates, API keys, and HA entity IDs must
# never cross the provider boundary.
HOURLY_FORECAST_FIELDS: Final = (
    "datetime",
    "condition",
    "temperature",
    "humidity",
    "pressure",
    "wind_speed",
    "wind_bearing",
    "cloud_coverage",
    "precipitation",
    "precipitation_probability",
)

# `observed_at` is represented separately, so values contain only weather
# properties and cannot accidentally carry source timing or HA metadata.
OBSERVATION_VALUE_FIELDS: Final = HOURLY_FORECAST_FIELDS[1:]
MAX_HOURLY_FORECAST_POINTS: Final = 168

_PUBLIC_CONDITIONS: Final = frozenset(
    {
        "clear-night",
        "cloudy",
        "exceptional",
        "fog",
        "hail",
        "lightning",
        "lightning-rainy",
        "partlycloudy",
        "pouring",
        "rainy",
        "snowy",
        "snowy-rainy",
        "sunny",
        "windy",
        "windy-variant",
    }
)
_PUBLIC_NUMBER_RANGES: Final = {
    "temperature": (-100.0, 80.0),
    "humidity": (0.0, 100.0),
    "pressure": (800.0, 1200.0),
    "wind_speed": (0.0, 500.0),
    "wind_bearing": (0.0, 360.0),
    "cloud_coverage": (0.0, 100.0),
    "precipitation": (0.0, 500.0),
    "precipitation_probability": (0.0, 100.0),
}


def _public_value(field: str, value: Any) -> Any:
    if value is None:
        return None
    if field == "datetime":
        if not isinstance(value, str) or len(value) > 64:
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None or parsed.utcoffset() is None:
            return None
        return value
    if field == "condition":
        return value if isinstance(value, str) and value in _PUBLIC_CONDITIONS else None
    if field in _PUBLIC_NUMBER_RANGES:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        number = float(value)
        minimum, maximum = _PUBLIC_NUMBER_RANGES[field]
        return value if isfinite(number) and minimum <= number <= maximum else None
    return None


def sanitise_hourly_forecast(
    hourly_forecast: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return a detached, public-only copy of hourly forecast values."""
    source_hours = list(islice(hourly_forecast, MAX_HOURLY_FORECAST_POINTS + 1))
    if len(source_hours) > MAX_HOURLY_FORECAST_POINTS:
        return []
    hourly: list[dict[str, Any]] = []
    for source_hour in source_hours:
        if not isinstance(source_hour, dict):
            continue

        public_hour: dict[str, Any] = {}
        for field in HOURLY_FORECAST_FIELDS:
            value = source_hour.get(field)
            projected = _public_value(field, value)
            if projected is not None or value is None:
                public_hour[field] = projected

        # A timestamp is the minimum useful identity of an hourly forecast.
        if public_hour.get("datetime"):
            hourly.append(public_hour)

    return hourly


def sanitise_timestamp(value: Any) -> str | None:
    """Return one bounded ISO timestamp or reject malformed public data."""
    if isinstance(value, datetime):
        return value.isoformat()
    return _public_value("datetime", value)


def sanitise_observation_values(current_weather: dict[str, Any]) -> dict[str, Any]:
    """Return public weather values from the current coordinator state."""
    if not isinstance(current_weather, dict):
        return {}

    public: dict[str, Any] = {}
    for field in OBSERVATION_VALUE_FIELDS:
        value = _public_value(field, current_weather.get(field))
        if value is not None:
            public[field] = value
    return public
