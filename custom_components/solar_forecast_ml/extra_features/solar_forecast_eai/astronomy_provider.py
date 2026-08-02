"""Read-only adapter for the bundled Solar Forecast ML astronomy database."""

from __future__ import annotations

import asyncio
import logging
import math
import sqlite3
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Sequence
from zoneinfo import ZoneInfo

SFML_DATABASE_PATH = Path("/config/solar_forecast_ml/solar_forecast.db")
QUERY_TIMEOUT_SECONDS = 10.0
SQLITE_BUSY_TIMEOUT_SECONDS = 1.0

_LOGGER = logging.getLogger(__name__)

_ASTRONOMY_RANGE_SQL = """
    SELECT cache_date, hour, sun_elevation_deg, sun_azimuth_deg,
           clear_sky_radiation_wm2, theoretical_max_kwh,
           sunrise, sunset, solar_noon, daylight_hours
      FROM astronomy_cache
     WHERE cache_date >= ? AND cache_date < ?
     ORDER BY cache_date, hour
"""


class AstronomyProviderAdapter:
    """Read and validate the single bundled SFML astronomy source of truth."""

    def __init__(
        self,
        hass: Any,
        eai_entry: Any | None = None,
        *,
        db_path: str | Path | None = None,
    ) -> None:
        self._hass = hass
        # Kept in the signature for existing consumers. Entry data, including a
        # legacy sfml_entry_id, must not select or alter the bundled SFML source.
        self._db_path = Path(db_path) if db_path is not None else SFML_DATABASE_PATH

    async def async_get_legacy_days(
        self, start_date: date, days: int = 3
    ) -> dict[str, Any]:
        """Return one to 31 complete local astronomy days in the EAI shape."""
        if (
            isinstance(start_date, datetime)
            or not isinstance(start_date, date)
            or type(days) is not int
            or not 1 <= days <= 31
        ):
            return {}
        end_date = start_date + timedelta(days=days)
        try:
            rows = await asyncio.wait_for(
                asyncio.to_thread(self._read_rows, start_date, end_date),
                timeout=QUERY_TIMEOUT_SECONDS,
            )
        except TimeoutError:
            _LOGGER.warning("SFML astronomy database query timed out")
            return {}
        except (OSError, sqlite3.Error):
            _LOGGER.warning(
                "SFML astronomy database is unavailable or invalid", exc_info=True
            )
            return {}
        except Exception:  # noqa: BLE001 - dependency boundary must fail closed
            _LOGGER.exception("SFML astronomy database query failed")
            return {}

        normalized = self._validate_and_normalize(rows, start_date, days)
        return self._to_legacy_days(normalized) if normalized is not None else {}

    async def async_get_day(
        self, target_date: date | datetime
    ) -> dict[str, Any] | None:
        """Return one complete astronomy day, or ``None`` fail-closed."""
        normalized_date = (
            target_date.date() if isinstance(target_date, datetime) else target_date
        )
        if not isinstance(normalized_date, date):
            return None
        days = await self.async_get_legacy_days(normalized_date, days=1)
        return days.get(normalized_date.isoformat()) or None

    def _read_rows(self, start_date: date, end_date: date) -> list[sqlite3.Row]:
        """Execute the bounded range query against SFML in SQLite read-only mode."""
        database_uri = f"file:{self._db_path.as_posix()}?mode=ro"
        deadline = time.monotonic() + QUERY_TIMEOUT_SECONDS
        with sqlite3.connect(
            database_uri,
            uri=True,
            timeout=SQLITE_BUSY_TIMEOUT_SECONDS,
        ) as connection:
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA query_only = ON")
            connection.set_progress_handler(
                lambda: int(time.monotonic() >= deadline), 1000
            )
            return list(
                connection.execute(
                    _ASTRONOMY_RANGE_SQL,
                    (start_date.isoformat(), end_date.isoformat()),
                ).fetchall()
            )

    def _validate_and_normalize(
        self, rows: Sequence[sqlite3.Row], start_date: date, day_count: int
    ) -> list[dict[str, Any]] | None:
        """Require a finite, timezone-correct and complete 24-row set per day."""
        if len(rows) != day_count * 24:
            return None
        expected_tz_name = str(self._hass.config.time_zone)
        try:
            expected_tz = ZoneInfo(expected_tz_name)
        except (KeyError, ValueError):
            _LOGGER.error("Home Assistant timezone %s is invalid", expected_tz_name)
            return None

        normalized: list[dict[str, Any]] = []
        row_index = 0
        for offset in range(day_count):
            expected_date = start_date + timedelta(days=offset)
            hourly: list[dict[str, Any]] = []
            daily_values: tuple[str, str, str, float] | None = None
            for expected_hour in range(24):
                row = rows[row_index]
                row_index += 1
                current_daily = (
                    row["sunrise"],
                    row["sunset"],
                    row["solar_noon"],
                    row["daylight_hours"],
                )
                if daily_values is None:
                    daily_values = current_daily
                if (
                    row["cache_date"] != expected_date.isoformat()
                    or type(row["hour"]) is not int
                    or row["hour"] != expected_hour
                    or current_daily != daily_values
                    or not all(
                        self._is_aware_in_timezone(value, expected_tz, expected_date)
                        for value in current_daily[:3]
                    )
                    or not self._valid_number(current_daily[3], 0, 24)
                    or not self._valid_number(row["sun_elevation_deg"], -90, 90)
                    or not self._valid_number(row["sun_azimuth_deg"], 0, 360)
                    or not self._valid_number(
                        row["clear_sky_radiation_wm2"], 0
                    )
                    or not self._valid_number(row["theoretical_max_kwh"], 0)
                ):
                    return None
                hourly.append(
                    {
                        "hour": expected_hour,
                        "sun_elevation_deg": row["sun_elevation_deg"],
                        "sun_azimuth_deg": row["sun_azimuth_deg"],
                        "clear_sky_radiation_wm2": row[
                            "clear_sky_radiation_wm2"
                        ],
                        "theoretical_max_kwh": row["theoretical_max_kwh"],
                    }
                )
            assert daily_values is not None
            normalized.append(
                {
                    "date": expected_date.isoformat(),
                    "sunrise": daily_values[0],
                    "sunset": daily_values[1],
                    "solar_noon": daily_values[2],
                    "daylight_hours": daily_values[3],
                    "hourly": hourly,
                }
            )
        return normalized

    @staticmethod
    def _valid_number(
        value: Any, minimum: float, maximum: float | None = None
    ) -> bool:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return False
        try:
            return (
                math.isfinite(value)
                and value >= minimum
                and (maximum is None or value <= maximum)
            )
        except (OverflowError, TypeError):
            return False

    @staticmethod
    def _is_aware_in_timezone(
        value: Any, expected_tz: ZoneInfo, expected_date: date
    ) -> bool:
        if not isinstance(value, str):
            return False
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return False
        if parsed.tzinfo is None:
            return False
        local = parsed.astimezone(expected_tz)
        expected_offset = expected_tz.utcoffset(local.replace(tzinfo=None))
        return local.date() == expected_date and parsed.utcoffset() == expected_offset

    @staticmethod
    def _to_legacy_days(days: Sequence[dict[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for day in days:
            date_str = day["date"]
            result[date_str] = {
                "sunrise_local": day["sunrise"],
                "sunset_local": day["sunset"],
                "solar_noon_local": day["solar_noon"],
                "daylight_hours": day["daylight_hours"],
            }
            for hour_data in day["hourly"]:
                result[f"{date_str}_{hour_data['hour']:02d}"] = {
                    key: hour_data[key]
                    for key in (
                        "sun_elevation_deg",
                        "sun_azimuth_deg",
                        "clear_sky_radiation_wm2",
                        "theoretical_max_kwh",
                    )
                }
        first_date = days[0]["date"]
        result.update(result[first_date])
        for hour in range(24):
            result[str(hour)] = result[f"{first_date}_{hour:02d}"]
        return result
