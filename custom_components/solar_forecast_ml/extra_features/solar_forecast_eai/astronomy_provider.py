"""Adapt SFML's public astronomy snapshot to EAI's legacy shape."""

from __future__ import annotations

import asyncio
import logging
import math
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

SFML_DOMAIN = "solar_forecast_ml"
SFML_ASTRONOMY_REGISTRY = "astronomy_providers"
SFML_ASTRONOMY_CONTRACT_VERSION = 2
QUERY_TIMEOUT_SECONDS = 10.0
PROVIDER_RETRY_MAX_ATTEMPTS = 16
PROVIDER_RETRY_DELAY_SECONDS = 0.05
PROVIDER_RETRY_MAX_DELAY_SECONDS = 0.5
RESULT_CACHE_SECONDS = 5.0
RESULT_CACHE_MAX_ENTRIES = 8

_LOGGER = logging.getLogger(__name__)


class _ProviderUnavailable(RuntimeError):
    """The public SFML provider is not ready or cannot serve a snapshot."""

    def __init__(self, message: str, provider_id: int | None = None) -> None:
        super().__init__(message)
        self.provider_id = provider_id


@dataclass(frozen=True)
class _ProviderSnapshot:
    """A snapshot bound to the concrete provider that produced it."""

    payload: Mapping[str, Any]
    provider_id: int


class AstronomyProviderAdapter:
    """Read and validate the public, entry-scoped SFML astronomy contract."""

    def __init__(self, hass: Any, eai_entry: Any | None = None) -> None:
        self._hass = hass
        self._inflight_reads: dict[
            tuple[date, date], asyncio.Task[_ProviderSnapshot]
        ] = {}
        self._snapshot_cache: dict[
            tuple[date, date], tuple[float, int, Mapping[str, Any]]
        ] = {}
        self._failed_until: dict[tuple[date, date], tuple[float, int | None]] = {}
        self._closed = False

    async def async_get_legacy_days(
        self, start_date: date, days: int = 3
    ) -> dict[str, Any]:
        """Return one to 31 complete local astronomy days in the EAI shape."""
        if self._closed or (
            isinstance(start_date, datetime)
            or not isinstance(start_date, date)
            or type(days) is not int
            or not 1 <= days <= 31
        ):
            return {}
        try:
            snapshot = await self._async_get_snapshot(
                start_date, start_date + timedelta(days=days)
            )
        except Exception:  # noqa: BLE001 - dependency boundary must fail closed
            return {}
        if self._closed:
            return {}
        normalized = self._validate_and_normalize(snapshot, start_date, days)
        return self._to_legacy_days(normalized) if normalized is not None else {}

    async def async_get_day(
        self, target_date: date | datetime
    ) -> dict[str, Any] | None:
        """Return one complete astronomy day, or ``None`` fail-closed."""
        target = target_date.date() if isinstance(target_date, datetime) else target_date
        if not isinstance(target, date):
            return None
        return (await self.async_get_legacy_days(target, 1)).get(target.isoformat())

    async def async_shutdown(self) -> None:
        """Stop accepting reads and drain already-bounded provider calls."""
        self._closed = True
        tasks = tuple(self._inflight_reads.values())
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._snapshot_cache.clear()
        self._failed_until.clear()

    async def _async_get_snapshot(
        self, start_date: date, end_date: date
    ) -> Mapping[str, Any]:
        key = (start_date, end_date)
        now = time.monotonic()
        for failed_key, (expires_at, _provider_id) in tuple(self._failed_until.items()):
            if expires_at <= now:
                self._failed_until.pop(failed_key, None)
        resolved = self._provider()
        provider_id = id(resolved[1]) if resolved is not None else None
        cached = self._snapshot_cache.get(key)
        if (
            cached is not None
            and cached[0] > now
            and provider_id is not None
            and cached[1] == provider_id
        ):
            return cached[2]
        self._snapshot_cache.pop(key, None)
        failure = self._failed_until.get(key)
        if failure is not None and failure[0] > now and failure[1] == provider_id:
            raise _ProviderUnavailable("recent SFML astronomy failure", failure[1])
        self._failed_until.pop(key, None)
        task = self._inflight_reads.get(key)
        if task is None:
            task = asyncio.create_task(
                self._async_fetch_snapshot(start_date, end_date),
                name="solar_forecast_eai_astronomy_snapshot",
            )
            self._inflight_reads[key] = task
            task.add_done_callback(
                lambda complete, read_key=key: self._finish_inflight_read(
                    read_key, complete
                )
            )
        return (await asyncio.shield(task)).payload

    def _finish_inflight_read(
        self, key: tuple[date, date], task: asyncio.Task[_ProviderSnapshot]
    ) -> None:
        if self._inflight_reads.get(key) is task:
            self._inflight_reads.pop(key, None)
        if task.cancelled():
            return
        error = task.exception()
        if error is not None:
            provider_id = getattr(error, "provider_id", None)
            self._failed_until[key] = (
                time.monotonic() + RESULT_CACHE_SECONDS,
                provider_id,
            )
            while len(self._failed_until) > RESULT_CACHE_MAX_ENTRIES:
                self._failed_until.pop(next(iter(self._failed_until)))
            return
        result = task.result()
        self._snapshot_cache[key] = (
            time.monotonic() + RESULT_CACHE_SECONDS,
            result.provider_id,
            result.payload,
        )
        while len(self._snapshot_cache) > RESULT_CACHE_MAX_ENTRIES:
            self._snapshot_cache.pop(next(iter(self._snapshot_cache)))

    async def _async_fetch_snapshot(
        self, start_date: date, end_date: date
    ) -> _ProviderSnapshot:
        deadline = time.monotonic() + QUERY_TIMEOUT_SECONDS
        last_error: Exception | None = None
        attempts = 0
        for attempt in range(PROVIDER_RETRY_MAX_ATTEMPTS):
            remaining = deadline - time.monotonic()
            if remaining <= 0 or self._closed:
                break
            attempts += 1
            resolved = self._provider()
            if resolved is None:
                last_error = _ProviderUnavailable("no unambiguous SFML astronomy provider")
            else:
                entry_id, provider = resolved
                try:
                    snapshot = await asyncio.wait_for(
                        provider.snapshot(start_date, days=(end_date - start_date).days),
                        timeout=remaining,
                    )
                    if isinstance(snapshot, Mapping):
                        # Bind the DTO to the registry entry selected for this
                        # call. A stale or spoofed provider must fail closed.
                        payload = snapshot if snapshot.get("entry_id") == entry_id else {}
                        return _ProviderSnapshot(payload, id(provider))
                    last_error = _ProviderUnavailable(
                        "SFML returned no astronomy snapshot", id(provider)
                    )
                except Exception as error:  # noqa: BLE001 - provider may be reloading
                    last_error = error
            delay = min(
                PROVIDER_RETRY_DELAY_SECONDS * (2**attempt),
                PROVIDER_RETRY_MAX_DELAY_SECONDS,
            )
            if deadline - time.monotonic() <= delay:
                break
            await asyncio.sleep(delay)
        elapsed = QUERY_TIMEOUT_SECONDS - max(0.0, deadline - time.monotonic())
        _LOGGER.warning(
            "SFML astronomy provider unavailable after bounded retry "
            "(attempts=%d; elapsed=%.3fs); failing closed",
            attempts,
            elapsed,
            exc_info=last_error is not None,
        )
        current = self._provider()
        raise _ProviderUnavailable(
            "SFML astronomy provider retry budget exhausted",
            id(current[1]) if current is not None else None,
        ) from last_error

    def _provider(self) -> tuple[str, Any] | None:
        """Resolve exactly one active v2 provider; legacy entry ids are ignored."""
        domain_data = getattr(self._hass, "data", {}).get(SFML_DOMAIN)
        if not isinstance(domain_data, Mapping):
            return None
        providers = domain_data.get(SFML_ASTRONOMY_REGISTRY)
        if not isinstance(providers, Mapping):
            return None
        candidates = [
            (entry_id, provider)
            for entry_id, provider in providers.items()
            if isinstance(entry_id, str)
            and callable(getattr(provider, "snapshot", None))
            and getattr(provider, "contract_version", None)
            == SFML_ASTRONOMY_CONTRACT_VERSION
            and getattr(provider, "_active", True) is True
        ]
        return candidates[0] if len(candidates) == 1 else None

    def _validate_and_normalize(
        self, snapshot: Mapping[str, Any], start_date: date, day_count: int
    ) -> list[dict[str, Any]] | None:
        if (
            snapshot.get("contract_version") != SFML_ASTRONOMY_CONTRACT_VERSION
            or snapshot.get("provider_domain") != SFML_DOMAIN
            or snapshot.get("complete") is not True
            or snapshot.get("start_date") != start_date.isoformat()
            or snapshot.get("day_count") != day_count
            or not isinstance(snapshot.get("entry_id"), str)
        ):
            return None
        timezone_name = str(getattr(self._hass.config, "time_zone", ""))
        if snapshot.get("time_zone") != timezone_name:
            return None
        try:
            timezone = ZoneInfo(timezone_name)
        except (KeyError, ValueError):
            return None
        records = snapshot.get("days")
        if (
            not isinstance(records, Sequence)
            or isinstance(records, (str, bytes))
            or len(records) != day_count
        ):
            return None
        normalized: list[dict[str, Any]] = []
        for offset, record in enumerate(records):
            expected_date = start_date + timedelta(days=offset)
            if not isinstance(record, Mapping) or record.get("date") != expected_date.isoformat():
                return None
            daily = tuple(record.get(key) for key in ("sunrise", "sunset", "solar_noon"))
            parsed_daily = tuple(
                self._local_timestamp(value, timezone, expected_date) for value in daily
            )
            if any(value is None for value in parsed_daily):
                return None
            sunrise, sunset, solar_noon = parsed_daily
            if not sunrise <= solar_noon <= sunset:
                return None
            rows = record.get("hourly")
            if not isinstance(rows, Sequence) or isinstance(rows, (str, bytes)) or len(rows) != 24:
                return None
            hourly: list[dict[str, Any]] = []
            daylight_hours: float | int | None = None
            for hour, row in enumerate(rows):
                if not isinstance(row, Mapping) or row.get("hour") != hour:
                    return None
                daylight = row.get("daylight_hours")
                if (
                    not self._valid_number(daylight, 0, 24)
                    or (daylight_hours is not None and daylight != daylight_hours)
                    or not self._valid_number(row.get("sun_elevation_deg"), -90, 90)
                    or not self._valid_number(row.get("sun_azimuth_deg"), 0, 360)
                    or not self._valid_number(row.get("clear_sky_radiation_wm2"), 0)
                    or not self._valid_number(row.get("theoretical_max_kwh"), 0)
                ):
                    return None
                daylight_hours = daylight
                hourly.append({
                    "hour": hour,
                    "sun_elevation_deg": row["sun_elevation_deg"],
                    "sun_azimuth_deg": row["sun_azimuth_deg"],
                    "clear_sky_radiation_wm2": row["clear_sky_radiation_wm2"],
                    "theoretical_max_kwh": row["theoretical_max_kwh"],
                })
            normalized.append({
                "date": expected_date.isoformat(),
                "sunrise": daily[0],
                "sunset": daily[1],
                "solar_noon": daily[2],
                "daylight_hours": daylight_hours,
                "hourly": hourly,
            })
        return normalized

    @staticmethod
    def _valid_number(value: Any, minimum: float, maximum: float | None = None) -> bool:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return False
        try:
            return math.isfinite(value) and value >= minimum and (maximum is None or value <= maximum)
        except (OverflowError, TypeError):
            return False

    @staticmethod
    def _local_timestamp(
        value: Any, timezone: ZoneInfo, target_date: date
    ) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return None
        local = parsed.astimezone(timezone)
        if local.date() != target_date or parsed.utcoffset() != local.utcoffset():
            return None
        return local

    @staticmethod
    def _to_legacy_days(days: Sequence[dict[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for day in days:
            date_string = day["date"]
            result[date_string] = {
                "sunrise_local": day["sunrise"], "sunset_local": day["sunset"],
                "solar_noon_local": day["solar_noon"], "daylight_hours": day["daylight_hours"],
            }
            for hour_data in day["hourly"]:
                result[f"{date_string}_{hour_data['hour']:02d}"] = {
                    key: hour_data[key] for key in (
                        "sun_elevation_deg", "sun_azimuth_deg", "clear_sky_radiation_wm2", "theoretical_max_kwh"
                    )
                }
        first_date = days[0]["date"]
        result.update(result[first_date])
        for hour in range(24):
            result[str(hour)] = result[f"{first_date}_{hour:02d}"]
        return result
