# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Home Assistant local time helpers for forecast and billing data. @zara"""
from __future__ import annotations

from datetime import date as date_cls, datetime, time, timedelta, timezone
from typing import Any, Iterator
import zoneinfo


def ha_timezone(hass: Any | None) -> zoneinfo.ZoneInfo:
    """Return the configured Home Assistant timezone, never the process timezone. @zara"""
    timezone_name = getattr(getattr(hass, "config", None), "time_zone", None) or "UTC"
    try:
        return zoneinfo.ZoneInfo(timezone_name)
    except zoneinfo.ZoneInfoNotFoundError:
        return zoneinfo.ZoneInfo("UTC")


def ha_now(hass: Any | None) -> datetime:
    """Return an aware datetime in the Home Assistant timezone. @zara"""
    return datetime.now(ha_timezone(hass))


def ha_today(hass: Any | None) -> date_cls:
    """Return today's date in the Home Assistant timezone. @zara"""
    return ha_now(hass).date()


def parse_datetime(value: datetime | str) -> datetime:
    """Parse a datetime value while accepting Home Assistant/ISO Z suffixes. @zara"""
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def as_ha_local(value: datetime | str, hass: Any | None) -> datetime:
    """Interpret naive values as HA-local and convert aware values to HA-local. @zara"""
    dt = parse_datetime(value)
    tz = ha_timezone(hass)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def naive_ha_local(value: datetime | str, hass: Any | None) -> datetime:
    """Return a naive HA-local datetime for local-naive database contracts. @zara"""
    return as_ha_local(value, hass).replace(tzinfo=None)


def format_local_hour_key(value: datetime | str, hass: Any | None = None) -> str:
    """Format a value as a local hour key without browser or SQLite timezone shifts. @zara"""
    if hass is None and isinstance(value, datetime) and value.tzinfo is None:
        local_dt = value
    else:
        local_dt = naive_ha_local(value, hass)
    return local_dt.replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:00")


def local_hour_key(value: datetime | str | None, hass: Any | None) -> str | None:
    """Return the HA-local hour key for optional timestamp values. @zara"""
    if value is None or value == "":
        return None
    try:
        return format_local_hour_key(value, hass)
    except (TypeError, ValueError, zoneinfo.ZoneInfoNotFoundError):
        return None


def local_date_range_strings(local_date: date_cls | str) -> tuple[str, str]:
    """Return local-naive [start, end) strings for DB rows stored as local time. @zara"""
    if isinstance(local_date, str):
        day = date_cls.fromisoformat(local_date)
    else:
        day = local_date
    start = datetime.combine(day, time.min)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def local_dates_range_strings(local_dates: list[str]) -> tuple[str, str]:
    """Return a local-naive DB range covering multiple local dates. @zara"""
    parsed = [date_cls.fromisoformat(d) for d in local_dates]
    start = datetime.combine(min(parsed), time.min)
    end = datetime.combine(max(parsed), time.min) + timedelta(days=1)
    return start.isoformat(), end.isoformat()


def previous_ha_local_hour(hass: Any | None, now: datetime | None = None) -> tuple[datetime, datetime]:
    """Return the previous complete local hour as aware (start, end). @zara"""
    local_now = as_ha_local(now, hass) if now is not None else ha_now(hass)
    end_local = local_now.replace(minute=0, second=0, microsecond=0)
    start_utc = end_local.astimezone(timezone.utc) - timedelta(hours=1)
    start_local = start_utc.astimezone(ha_timezone(hass))
    return start_local, end_local


def iter_ha_local_hours(start: datetime, end: datetime, hass: Any | None) -> Iterator[datetime]:
    """Iterate real elapsed hours and render each instant in HA-local time. @zara"""
    start_local = as_ha_local(start, hass).replace(minute=0, second=0, microsecond=0)
    end_local = as_ha_local(end, hass).replace(minute=0, second=0, microsecond=0)
    current_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)
    while current_utc <= end_utc:
        yield current_utc.astimezone(ha_timezone(hass))
        current_utc += timedelta(hours=1)
