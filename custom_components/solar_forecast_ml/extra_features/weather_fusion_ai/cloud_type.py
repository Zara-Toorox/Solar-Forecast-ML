"""Single cloud-type classifier used by blend, learning, and sensors."""

from __future__ import annotations

from typing import Optional

from .const import (
    CLOUD_CIRRUS_HIGH_MIN,
    CLOUD_CIRRUS_LOW_MAX,
    CLOUD_CLEAR_MAX,
    CLOUD_FAIR_MAX,
    CLOUD_MIXED_MAX,
    CLOUD_OVERCAST_HIGH_MIN,
    CLOUD_OVERCAST_LOW_MIN,
    CLOUD_OVERCAST_MID_MIN,
    CLOUD_STRATUS_LOW_MIN,
    CLOUD_TYPES,
)


def classify_cloud_type(
    cloud_low: Optional[float] = None,
    cloud_mid: Optional[float] = None,
    cloud_high: Optional[float] = None,
    cloud_total: Optional[float] = None,
) -> str:
    """Classify cloud type from layer data, with a total-cover fallback."""
    if cloud_low is None or cloud_mid is None or cloud_high is None:
        return _from_total_cover(cloud_total)

    max_layer = max(cloud_low, cloud_mid, cloud_high)
    if max_layer < CLOUD_CLEAR_MAX:
        return "clear"

    if cloud_high > CLOUD_CIRRUS_HIGH_MIN and cloud_low < CLOUD_CIRRUS_LOW_MAX:
        return "cirrus"

    if (
        cloud_low > CLOUD_OVERCAST_LOW_MIN
        and cloud_mid > CLOUD_OVERCAST_MID_MIN
        and cloud_high > CLOUD_OVERCAST_HIGH_MIN
    ):
        return "overcast"

    if cloud_low > CLOUD_STRATUS_LOW_MIN:
        return "stratus"

    if max_layer <= CLOUD_FAIR_MAX:
        return "fair"

    return "mixed"


def _from_total_cover(cloud_total: Optional[float]) -> str:
    """Map total cloud cover to the types that do not require layer data."""
    if cloud_total is None:
        return "mixed"
    if cloud_total <= CLOUD_CLEAR_MAX:
        return "clear"
    if cloud_total <= CLOUD_FAIR_MAX:
        return "fair"
    if cloud_total <= CLOUD_MIXED_MAX:
        return "mixed"
    return "overcast"


def is_known_cloud_type(value: object) -> bool:
    """Return True when value is one of the six public cloud-type keys."""
    return isinstance(value, str) and value in CLOUD_TYPES
