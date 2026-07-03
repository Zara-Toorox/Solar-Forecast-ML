import math
from typing import Optional


DEFAULT_SFML_WEIGHT = 0.65
DEFAULT_TFS_P10_WEIGHT = 0.35


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
