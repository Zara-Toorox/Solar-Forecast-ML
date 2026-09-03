"""Shared blending math for circular wind and numeric scaling."""

from __future__ import annotations

from math import atan2, cos, degrees, radians, sin
from typing import Iterable, Optional, Sequence, Tuple


def circular_average(values: Iterable[float]) -> float:
    """Return the circular mean of wind directions in degrees [0, 360)."""
    items = list(values)
    if not items:
        return 0.0
    sin_sum = sum(sin(radians(value)) for value in items)
    cos_sum = sum(cos(radians(value)) for value in items)
    return round((degrees(atan2(sin_sum, cos_sum)) + 360.0) % 360.0, 3)


def circular_weighted_average(pairs: Sequence[Tuple[float, float]]) -> float:
    """Return the weighted circular mean of (degrees, weight) pairs."""
    sin_sum = 0.0
    cos_sum = 0.0
    for value, weight in pairs:
        sin_sum += sin(radians(value)) * weight
        cos_sum += cos(radians(value)) * weight
    return round((degrees(atan2(sin_sum, cos_sum)) + 360.0) % 360.0, 2)


def circular_delta(forecast: float, actual: float) -> float:
    """Return the shortest signed arc from actual to forecast, in [-180, 180]."""
    return ((forecast - actual + 180.0) % 360.0) - 180.0


def wrap_degrees(value: float) -> float:
    """Wrap a wind direction into [0, 360)."""
    return value % 360.0


def scale_or_none(value: object, factor: float) -> Optional[float]:
    """Multiply a numeric value, preserving explicit zeros."""
    if value is None:
        return None
    try:
        return float(value) * factor
    except (TypeError, ValueError):
        return None


def km_to_meters(value: object) -> Optional[float]:
    """Convert a kilometre visibility value to metres."""
    return scale_or_none(value, 1000.0)
