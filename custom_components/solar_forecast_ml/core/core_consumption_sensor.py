# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# ******************************************************************************

"""Accept the household consumption sensor only as energy in kWh. @zara

Pure helpers without Home Assistant imports. The config flow carries a small
copy of the same rule (it cannot import from the runtime package); a test keeps
both in step.
"""

import math
from typing import Any, Optional, Tuple

REASON_NOT_ENERGY = "consumption_sensor_not_energy"
REASON_UNAVAILABLE = "consumption_state_unavailable"
REASON_NOT_NUMERIC = "consumption_state_not_numeric"
REASON_NEGATIVE = "consumption_state_negative"

# Unit string (exact case, "mWh" would be milliwatt-hours) -> factor to kWh
ENERGY_UNIT_TO_KWH = {
    "kWh": 1.0,
    "Wh": 0.001,
    "MWh": 1000.0,
}

_UNAVAILABLE_STATES = (None, "", "unknown", "unavailable", "None")


def _text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def consumption_sensor_problem(state: Any) -> Optional[str]:
    """Return REASON_NOT_ENERGY when the entity cannot be a daily energy counter.

    Only the attributes are judged, the current value is irrelevant. A missing
    state returns None (the entity may simply not be loaded yet).
    """
    if state is None:
        return None
    attributes = getattr(state, "attributes", None) or {}
    if _text(attributes.get("device_class")).lower() == "power":
        return REASON_NOT_ENERGY
    if _text(attributes.get("unit_of_measurement")) not in ENERGY_UNIT_TO_KWH:
        return REASON_NOT_ENERGY
    return None


def consumption_kwh_from_state(state: Any) -> Tuple[Optional[float], Optional[str]]:
    """Convert the consumption sensor state to kWh.

    Returns (kwh, None) on success, otherwise (None, reason).
    """
    if state is None or getattr(state, "state", None) in _UNAVAILABLE_STATES:
        return None, REASON_UNAVAILABLE
    if consumption_sensor_problem(state) is not None:
        return None, REASON_NOT_ENERGY
    try:
        value = float(_text(state.state).replace(",", "."))
    except (ValueError, TypeError):
        return None, REASON_NOT_NUMERIC
    if not math.isfinite(value):
        return None, REASON_NOT_NUMERIC
    if value < 0:
        return None, REASON_NEGATIVE
    unit = _text(state.attributes.get("unit_of_measurement"))
    # rounding removes float noise such as 8550 * 0.001
    return round(value * ENERGY_UNIT_TO_KWH[unit], 6), None
