"""Read-only astronomy contract backed by a Solar Forecast ML entry."""

from __future__ import annotations

import asyncio
import math
from datetime import date, datetime
from types import MappingProxyType
from typing import Any, Callable, Mapping
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ..const import DOMAIN


CONTRACT_VERSION = 2
_QUERY_TIMEOUT_SECONDS = 8
_HORIZON_DAYS = 3


class SFMLAstronomyProvider:
    """Expose complete, entry-scoped astronomy cache snapshots."""

    contract_version = CONTRACT_VERSION

    def __init__(
        self,
        entry_id: str,
        data_manager: Any,
        time_zone: str | None = None,
        now: Callable[[], datetime] | None = None,
    ) -> None:
        self._entry_id = entry_id
        self._data_manager = data_manager
        self._time_zone = self._resolve_time_zone(time_zone)
        self._now = now or (lambda: datetime.now(self._time_zone))
        self._active = True

    async def snapshot(
        self, start_date: date | None = None, days: int = _HORIZON_DAYS
    ) -> Mapping[str, Any] | None:
        """Return a complete local date range snapshot or fail closed."""
        if not self._active:
            return None

        generated_at = self._local_now()
        if not self._valid_range(start_date, days):
            return None
        start = start_date or generated_at.date()
        dates = tuple(
            start.fromordinal(start.toordinal() + offset) for offset in range(days)
        )
        rows = await self._fetch_all(dates[0], dates[-1])
        day_records = self._build_days(rows, dates)
        if day_records is None or not self._active:
            return None

        return MappingProxyType(
            {
                "contract_version": self.contract_version,
                "provider_domain": DOMAIN,
                "entry_id": self._entry_id,
                "time_zone": str(self._time_zone),
                "generated_at": generated_at.isoformat(),
                "start_date": start.isoformat(),
                "day_count": days,
                "complete": True,
                "days": tuple(day_records),
            }
        )

    def invalidate(self) -> None:
        """Disable a held provider reference after its entry is unloaded."""
        self._active = False

    async def _fetch_all(self, start: date, end: date) -> list[Any]:
        return await asyncio.wait_for(
            self._data_manager.fetch_all(
                """
                SELECT cache_date, hour, sun_elevation_deg, sun_azimuth_deg,
                       clear_sky_radiation_wm2, theoretical_max_kwh,
                       sunrise, sunset, solar_noon, daylight_hours
                FROM astronomy_cache
                WHERE cache_date BETWEEN ? AND ?
                ORDER BY cache_date, hour
                """,
                (start.isoformat(), end.isoformat()),
            ),
            timeout=_QUERY_TIMEOUT_SECONDS,
        )

    def _build_days(self, rows: list[Any], dates: tuple[date, ...]) -> list[Mapping[str, Any]] | None:
        rows_by_date: dict[date, dict[int, Any]] = {target_date: {} for target_date in dates}
        for row in rows:
            target_date = self._date_value(row, "cache_date")
            hour = self._int_value(row, "hour")
            if target_date not in rows_by_date or hour is None or hour not in range(24):
                return None
            if hour in rows_by_date[target_date]:
                return None
            rows_by_date[target_date][hour] = row

        result: list[Mapping[str, Any]] = []
        for target_date in dates:
            hourly_rows = rows_by_date[target_date]
            if set(hourly_rows) != set(range(24)):
                return None
            first_row = hourly_rows[0]
            sunrise = self._local_timestamp(self._value(first_row, "sunrise"), target_date)
            sunset = self._local_timestamp(self._value(first_row, "sunset"), target_date)
            solar_noon = self._local_timestamp(self._value(first_row, "solar_noon"), target_date)
            if not sunrise or not sunset or not solar_noon or not sunrise <= solar_noon <= sunset:
                return None
            if any(
                self._local_timestamp(self._value(row, field), target_date) != expected
                for row in hourly_rows.values()
                for field, expected in (
                    ("sunrise", sunrise),
                    ("sunset", sunset),
                    ("solar_noon", solar_noon),
                )
            ):
                return None
            hourly = tuple(self._hourly_row(target_date, hour, hourly_rows[hour]) for hour in range(24))
            if any(item is None for item in hourly):
                return None
            result.append(
                MappingProxyType(
                    {
                        "date": target_date.isoformat(),
                        "sunrise": sunrise.isoformat(),
                        "sunset": sunset.isoformat(),
                        "solar_noon": solar_noon.isoformat(),
                        "hourly": tuple(hourly),
                    }
                )
            )
        return result

    def _hourly_row(self, target_date: date, hour: int, row: Any) -> Mapping[str, Any] | None:
        values = {
            "sun_elevation_deg": self._number_value(
                row, "sun_elevation_deg", minimum=-90.0, maximum=90.0
            ),
            "sun_azimuth_deg": self._number_value(
                row, "sun_azimuth_deg", minimum=0.0, maximum=360.0
            ),
            "clear_sky_radiation_wm2": self._number_value(
                row, "clear_sky_radiation_wm2", minimum=0.0
            ),
            "theoretical_max_kwh": self._number_value(
                row, "theoretical_max_kwh", minimum=0.0
            ),
            "daylight_hours": self._number_value(
                row, "daylight_hours", minimum=0.0, maximum=24.0
            ),
        }
        if any(value is None for value in values.values()):
            return None
        return MappingProxyType(
            {
                "hour": hour,
                "local_date": target_date.isoformat(),
                "local_hour": hour,
                "wall_time": f"{hour:02d}:00:00",
                **values,
            }
        )

    def _local_now(self) -> datetime:
        value = self._now()
        if value.tzinfo is None:
            value = value.replace(tzinfo=self._time_zone)
        return value.astimezone(self._time_zone)

    @staticmethod
    def _valid_range(start_date: date | None, days: int) -> bool:
        return (
            (start_date is None or (isinstance(start_date, date) and not isinstance(start_date, datetime)))
            and isinstance(days, int)
            and not isinstance(days, bool)
            and 1 <= days <= 31
        )

    def _local_timestamp(self, value: Any, target_date: date) -> datetime | None:
        if not isinstance(value, str):
            return None
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=self._time_zone)
        parsed = parsed.astimezone(self._time_zone)
        return parsed if parsed.date() == target_date else None

    @staticmethod
    def _resolve_time_zone(value: str | None) -> ZoneInfo:
        try:
            return ZoneInfo(value) if value else ZoneInfo("UTC")
        except (TypeError, ValueError, ZoneInfoNotFoundError):
            return ZoneInfo("UTC")

    @staticmethod
    def _value(row: Any, key: str) -> Any:
        try:
            return row[key]
        except (KeyError, IndexError, TypeError):
            return None

    @classmethod
    def _date_value(cls, row: Any, key: str) -> date | None:
        value = cls._value(row, key)
        if isinstance(value, date):
            return value
        if not isinstance(value, str):
            return None
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    @classmethod
    def _int_value(cls, row: Any, key: str) -> int | None:
        value = cls._value(row, key)
        return value if isinstance(value, int) and not isinstance(value, bool) else None

    @classmethod
    def _number_value(
        cls,
        row: Any,
        key: str,
        *,
        minimum: float,
        maximum: float | None = None,
    ) -> float | None:
        value = cls._value(row, key)
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            return None
        number = float(value)
        if not math.isfinite(number) or number < minimum:
            return None
        if maximum is not None and number > maximum:
            return None
        return number


def register_provider(
    providers: dict[str, SFMLAstronomyProvider], entry_id: str, provider: SFMLAstronomyProvider
) -> None:
    """Replace an entry provider while invalidating any held predecessor."""
    previous = providers.get(entry_id)
    if previous is not provider and previous is not None:
        previous.invalidate()
    providers[entry_id] = provider
