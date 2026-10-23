# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Derived installation power flows. Pure functions, no Home Assistant. @zara"""

from __future__ import annotations

import math
from collections.abc import Iterable

from . import site_daily

FLOW_ROLES = (
    "power_solar_to_house",
    "power_solar_to_battery",
    "power_grid_to_battery",
    "power_battery_to_house",
    "power_grid_to_house",
)
BATTERY_FLOW_ROLES = frozenset(
    {
        "power_solar_to_battery",
        "power_grid_to_battery",
        "power_battery_to_house",
    }
)


def _non_negative(value: float | None) -> float | None:
    """Return a finite input clamped at 0, or None when it is missing. @zara"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if not math.isfinite(value):
        return None
    return max(0.0, float(value))


def flow_inputs(role: str, has_battery: bool) -> tuple[str, ...]:
    """Device roles one derived flow reads. Empty when that flow is not derived. @zara"""
    if role in BATTERY_FLOW_ROLES and not has_battery:
        return ()
    if role == "power_solar_to_house":
        return ("power_solar", "power_house")
    if role in ("power_solar_to_battery", "power_grid_to_battery"):
        return ("power_solar", "power_house", "power_battery_charge")
    if role == "power_battery_to_house":
        return ("power_solar", "power_house", "power_battery_discharge")
    if role == "power_grid_to_house":
        if has_battery:
            return ("power_solar", "power_house", "power_battery_discharge")
        return ("power_solar", "power_house")
    return ()


def derived_flow_roles(roles: Iterable[str]) -> frozenset[str]:
    """Flows to publish because no device reports them and their inputs exist. @zara"""
    present = set(roles)
    has_battery = site_daily.battery_present(present)
    derived: set[str] = set()
    for role in FLOW_ROLES:
        if role in present:
            continue
        needed = flow_inputs(role, has_battery)
        if needed and all(item in present for item in needed):
            derived.add(role)
    return frozenset(derived)


def derive_power_flows(
    solar: float | None,
    charge: float | None,
    discharge: float | None,
    house: float | None,
    *,
    has_battery: bool,
) -> dict[str, float | None]:
    """Split installation power. A missing input stays None, never 0. @zara

    Priority is PV to the house, then the remaining PV to the battery, then the
    grid. Every finite input is clamped at 0 before the split. Without a battery
    the charge and discharge terms are 0 and the battery flows are omitted.
    """
    produced = _non_negative(solar)
    consumed = _non_negative(house)
    if has_battery:
        charging = _non_negative(charge)
        discharging = _non_negative(discharge)
    else:
        charging = 0.0
        discharging = 0.0
    if produced is None or consumed is None:
        solar_to_house = None
    else:
        solar_to_house = min(produced, consumed)
    if solar_to_house is None or charging is None or produced is None:
        solar_to_battery = None
        grid_to_battery = None
    else:
        solar_to_battery = min(charging, produced - solar_to_house)
        grid_to_battery = max(0.0, charging - solar_to_battery)
    if solar_to_house is None or discharging is None or consumed is None:
        battery_to_house = None
        grid_to_house = None
    else:
        battery_to_house = min(discharging, consumed - solar_to_house)
        grid_to_house = max(0.0, consumed - solar_to_house - battery_to_house)
    flows: dict[str, float | None] = {
        "power_solar_to_house": solar_to_house,
        "power_grid_to_house": grid_to_house,
    }
    if has_battery:
        flows["power_solar_to_battery"] = solar_to_battery
        flows["power_grid_to_battery"] = grid_to_battery
        flows["power_battery_to_house"] = battery_to_house
    return flows
