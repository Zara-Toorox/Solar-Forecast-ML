import math
from datetime import date, datetime
from typing import Optional


DEFAULT_SFML_WEIGHT = 0.65
DEFAULT_TFS_P10_WEIGHT = 0.35
P10_PERSISTENCE_MAX_AGE_HOURS = 30.0
P10_MORNING_RECOMPUTE_WINDOW_MINUTES = 45.0
P10_TRACKING_COLUMNS = (
    "conservative_planning_forecast_kwh",
    "conservative_planning_forecast_updated_at",
    "conservative_planning_forecast_hours_json",
    "conservative_planning_forecast_panel_groups_json",
    "conservative_planning_forecast_group_totals_json",
)


def _non_negative_float(value: object) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return max(0.0, number)


def _parse_date(value: object) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)[:10]).date()
    except (TypeError, ValueError):
        return None


def parse_p10_timestamp(value: object) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def p10_age_hours(updated_at: object, now: Optional[datetime] = None) -> Optional[float]:
    parsed = parse_p10_timestamp(updated_at)
    if parsed is None:
        return None
    now_dt = now or datetime.now(parsed.tzinfo)
    if parsed.tzinfo is None and now_dt.tzinfo is not None:
        now_dt = now_dt.replace(tzinfo=None)
    elif parsed.tzinfo is not None and now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=parsed.tzinfo)
    return round((now_dt - parsed).total_seconds() / 3600.0, 3)


def persisted_p10_freshness(
    forecast_date: object,
    updated_at: object,
    *,
    now: Optional[datetime] = None,
    max_age_hours: float = P10_PERSISTENCE_MAX_AGE_HOURS,
) -> dict:
    target_date = _parse_date(forecast_date)
    parsed_updated_at = parse_p10_timestamp(updated_at)
    age_hours = p10_age_hours(parsed_updated_at, now)

    if target_date is None:
        return {"fresh": False, "reason": "missing_forecast_date", "age_hours": age_hours}
    if parsed_updated_at is None:
        return {"fresh": False, "reason": "missing_p10_updated_at", "age_hours": age_hours}
    if parsed_updated_at.date() != target_date:
        return {"fresh": False, "reason": "stale_persisted_p10", "age_hours": age_hours}
    if age_hours is not None and age_hours > max_age_hours:
        return {"fresh": False, "reason": "expired_persisted_p10", "age_hours": age_hours}
    return {"fresh": True, "reason": "fresh_persisted_p10", "age_hours": age_hours}


def p10_morning_recompute_allowed(
    forecast_date: object,
    lock_source: object,
    locked_at: object,
    *,
    now: Optional[datetime] = None,
    window_minutes: float = P10_MORNING_RECOMPUTE_WINDOW_MINUTES,
) -> bool:
    if str(lock_source or "") != "morning_routine":
        return False

    target_date = _parse_date(forecast_date)
    locked_at_dt = parse_p10_timestamp(locked_at)
    if target_date is None or locked_at_dt is None:
        return False
    if locked_at_dt.date() != target_date:
        return False

    now_dt = now or datetime.now(locked_at_dt.tzinfo)
    if locked_at_dt.tzinfo is None and now_dt.tzinfo is not None:
        now_dt = now_dt.replace(tzinfo=None)
    elif locked_at_dt.tzinfo is not None and now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=locked_at_dt.tzinfo)

    age_minutes = (now_dt - locked_at_dt).total_seconds() / 60.0
    return 0.0 <= age_minutes <= window_minutes


def round_not_above(value: float, upper_bound: float, precision: int) -> float:
    upper = max(0.0, float(upper_bound or 0.0))
    rounded = round(max(0.0, float(value or 0.0)), precision)
    if rounded <= upper:
        return rounded

    factor = 10 ** precision
    return round(math.floor(upper * factor) / factor, precision)


def conservative_planning_value(
    sfml_value: object,
    tfs_p10_value: object,
    *,
    sfml_weight: float = DEFAULT_SFML_WEIGHT,
    tfs_weight: float = DEFAULT_TFS_P10_WEIGHT,
    precision: int = 4,
) -> float:
    sfml = _non_negative_float(sfml_value) or 0.0
    safe_tfs_p10 = _non_negative_float(tfs_p10_value)
    if safe_tfs_p10 is None:
        safe_tfs_p10 = sfml

    raw_blend = (sfml * sfml_weight) + (safe_tfs_p10 * tfs_weight)
    conservative = max(0.0, min(sfml, raw_blend))
    return round_not_above(conservative, sfml, precision)


def cap_persisted_conservative_value(
    persisted_value: object,
    full_day_sfml_cap: object,
    *,
    precision: int = 2,
) -> Optional[float]:
    value = _non_negative_float(persisted_value)
    cap = _non_negative_float(full_day_sfml_cap)
    if value is None:
        return None
    if cap is None:
        return round(value, precision)
    return round_not_above(min(value, cap), cap, precision)


def remaining_conservative_value(
    conservative_full_day: object,
    actual_today: object,
    today_forecast_cap: object,
    *,
    precision: int = 2,
) -> Optional[float]:
    full_day = _non_negative_float(conservative_full_day)
    if full_day is None:
        return None

    actual = _non_negative_float(actual_today) or 0.0
    remaining = max(0.0, full_day - actual)
    cap = _non_negative_float(today_forecast_cap)
    if cap is not None:
        remaining = min(remaining, cap)
        return round_not_above(remaining, cap, precision)
    return round(remaining, precision)
