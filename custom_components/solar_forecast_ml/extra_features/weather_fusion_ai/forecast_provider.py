"""Read-only provider for versioned Weather Fusion AI forecast snapshots."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .forecast_contract import (
    FORECAST_CONTRACT_VERSION,
    SNAPSHOT_STATUS_AVAILABLE,
    SNAPSHOT_STATUS_STALE,
    SNAPSHOT_STATUS_UNAVAILABLE,
    sanitise_hourly_forecast,
    sanitise_observation_values,
    sanitise_timestamp,
)


class WeatherFusionForecastProvider:
    """Expose one config entry's weather data without mutable source state."""

    contract_version = FORECAST_CONTRACT_VERSION

    def __init__(self, entry_id: str, coordinator: Any) -> None:
        self._entry_id = entry_id
        self._coordinator = coordinator

    def snapshot(self) -> dict[str, Any]:
        """Return a detached, data-minimised forecast snapshot for this entry."""
        generated_at = getattr(
            self._coordinator, "forecast_snapshot_generated_at", None
        )
        hourly = sanitise_hourly_forecast(
            getattr(self._coordinator, "hourly_forecast", [])
        )

        if not isinstance(generated_at, datetime):
            return self._snapshot(
                generated_at=None,
                valid_until=None,
                stale=True,
                status=SNAPSHOT_STATUS_UNAVAILABLE,
                hourly=[],
                observation=None,
            )

        if generated_at.tzinfo is None:
            generated_at = generated_at.replace(tzinfo=timezone.utc)

        update_interval = getattr(self._coordinator, "update_interval", None)
        if not isinstance(update_interval, timedelta):
            update_interval = timedelta(0)
        valid_until = generated_at + update_interval
        last_update_success = getattr(self._coordinator, "last_update_success", True)
        stale = datetime.now(timezone.utc) >= valid_until or not last_update_success
        observation = self._observation(generated_at)
        status = (
            SNAPSHOT_STATUS_UNAVAILABLE
            if not hourly
            else (SNAPSHOT_STATUS_STALE if stale else SNAPSHOT_STATUS_AVAILABLE)
        )

        return self._snapshot(
            generated_at=generated_at,
            valid_until=valid_until,
            stale=stale or not hourly,
            status=status,
            hourly=hourly,
            observation=observation,
        )

    def _observation(self, generated_at: datetime) -> dict[str, Any] | None:
        """Build an optional current-weather observation from public values."""
        current_weather = getattr(self._coordinator, "current_weather", {})
        values = sanitise_observation_values(current_weather)
        if not values:
            return None

        observed_at = (
            current_weather.get("datetime", generated_at.isoformat())
            if isinstance(current_weather, dict)
            else generated_at.isoformat()
        )
        observed_at = sanitise_timestamp(observed_at) or generated_at.isoformat()

        return {"observed_at": observed_at, "values": values}

    def _snapshot(
        self,
        *,
        generated_at: datetime | None,
        valid_until: datetime | None,
        stale: bool,
        status: str,
        hourly: list[dict[str, Any]],
        observation: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Serialise contract timestamps in UTC without exposing source metadata."""
        return {
            "contract_version": self.contract_version,
            "generated_at": generated_at.isoformat() if generated_at else None,
            "valid_until": valid_until.isoformat() if valid_until else None,
            "stale": stale,
            "status": status,
            "hourly": hourly,
            "observation": observation,
        }
