"""Public, data-minimised forecast snapshot contract for WFAI consumers."""

from __future__ import annotations

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


def sanitise_hourly_forecast(
    hourly_forecast: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Return a detached, public-only copy of hourly forecast values."""
    hourly: list[dict[str, Any]] = []
    for source_hour in hourly_forecast:
        if not isinstance(source_hour, dict):
            continue

        public_hour: dict[str, Any] = {}
        for field in HOURLY_FORECAST_FIELDS:
            value = source_hour.get(field)
            if value is None or isinstance(value, (str, int, float, bool)):
                public_hour[field] = value

        # A timestamp is the minimum useful identity of an hourly forecast.
        if public_hour.get("datetime"):
            hourly.append(public_hour)

    return hourly


def sanitise_observation_values(current_weather: dict[str, Any]) -> dict[str, Any]:
    """Return public weather values from the current coordinator state."""
    if not isinstance(current_weather, dict):
        return {}

    return {
        field: value
        for field in OBSERVATION_VALUE_FIELDS
        if (value := current_weather.get(field)) is not None
        and isinstance(value, (str, int, float, bool))
    }
