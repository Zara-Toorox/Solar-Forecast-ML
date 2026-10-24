# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Derived daily energy and house energy for the installation. @zara

Pure helpers: no Home Assistant imports. A measured device value always wins;
these functions only describe the value used when no device reports the role.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Any

from . import contract

# one update above this is not added to the day (meter glitch, unit error)
JUMP_LIMIT_KWH = 100.0

# today role -> installation total it is derived from
TODAY_FROM_TOTAL: dict[str, str] = {
    "energy_solar_today": "energy_solar_total",
    "energy_grid_import_today": "energy_grid_import_total",
    "energy_grid_export_today": "energy_grid_export_total",
    "energy_battery_charge_today": "energy_battery_charge_total",
    "energy_battery_discharge_today": "energy_battery_discharge_total",
    "energy_house_today": "energy_house_total",
}
# heat-pump day counters share this tracker; inverter derived_roles ignores them
HP_TODAY_FROM_TOTAL: dict[str, str] = {
    "hp_energy_electric_today": "hp_energy_electric_total",
    "hp_energy_electric_heating_today": "hp_energy_electric_heating_total",
    "hp_energy_electric_dhw_today": "hp_energy_electric_dhw_total",
    "hp_energy_thermal_today": "hp_energy_thermal_total",
    "hp_energy_thermal_heating_today": "hp_energy_thermal_heating_total",
    "hp_energy_thermal_dhw_today": "hp_energy_thermal_dhw_total",
    "hp_aux_heater_energy_today": "hp_aux_heater_energy_total",
}
DERIVED_ROLES = frozenset(TODAY_FROM_TOTAL) | {"energy_house_total"}
# derived day counters rewrite their state at the next local midnight
MIDNIGHT_ROLES = frozenset(TODAY_FROM_TOTAL)
HP_MIDNIGHT_ROLES = frozenset(HP_TODAY_FROM_TOTAL)
HOUSE_REQUIRED = (
    "energy_solar_total",
    "energy_grid_import_total",
    "energy_grid_export_total",
)
HOUSE_BATTERY = (
    "energy_battery_charge_total",
    "energy_battery_discharge_total",
)
# device roles that mean the installation has a battery, even without energy totals
BATTERY_BASES = frozenset(
    {
        "battery_soc",
        "battery_soh",
        "power_battery",
        "power_battery_charge",
        "power_battery_discharge",
        "capacity_battery",
        "temperature_battery",
        "battery_pack_soc",
        "battery_pack_soh",
        "temperature_battery_pack",
        "energy_battery_charge_total",
        "energy_battery_discharge_total",
        "energy_battery_charge_today",
        "energy_battery_discharge_today",
        "power_solar_to_battery",
        "power_grid_to_battery",
        "power_battery_to_house",
    }
)
_TRACKED_TOTALS = frozenset(TODAY_FROM_TOTAL.values()) | frozenset(
    HP_TODAY_FROM_TOTAL.values()
)


@dataclass(frozen=True)
class HouseAccum:
    """Monotonic house total built from derived house-today increases. @zara"""

    total: float
    last_today: float
    day: str


def apply_house_total(
    state: HouseAccum | None, today: float | None, day: str
) -> tuple[HouseAccum | None, float | None]:
    """Add only a rise of house today. None until the first day with a value. @zara"""
    if today is None:
        if state is None:
            return None, None
        return state, state.total
    today = max(0.0, today)
    if state is None or state.day != day:
        # first day with a baseline, or a new local day: count from 0, not from yesterday
        carried = state.total if state is not None else 0.0
        return HouseAccum(carried + today, today, day), carried + today
    if today > state.last_today:
        total = state.total + (today - state.last_today)
        return HouseAccum(total, today, day), total
    return state, state.total


@dataclass(frozen=True)
class DailyBaseline:
    """Midnight baseline of one installation total. @zara"""

    day: str
    baseline: float | None
    last: float | None
    accrued: float = 0.0


def local_day(moment: datetime) -> str:
    """ISO date of a timezone-aware local moment. @zara"""
    if moment.tzinfo is None:
        raise ValueError("local day requires a timezone-aware datetime")
    return moment.date().isoformat()


def battery_present(roles: Iterable[str]) -> bool:
    """Return True when any device role belongs to a battery. @zara"""
    for role in roles:
        split = contract.split_role(role)
        if split is not None and split[0].base in BATTERY_BASES:
            return True
    return False


def next_local_midnight(now: datetime) -> datetime:
    """Return the next local midnight strictly after ``now``. @zara"""
    if now.tzinfo is None:
        raise ValueError("local midnight requires a timezone-aware datetime")
    tomorrow = now.date() + timedelta(days=1)
    return datetime.combine(tomorrow, time.min, tzinfo=now.tzinfo)


def house_energy_today(
    solar: float | None,
    grid_import: float | None,
    grid_export: float | None,
    battery_charge: float | None,
    battery_discharge: float | None,
    has_battery: bool,
) -> float | None:
    """House energy today from day values, or None if an input is missing. @zara

    No battery: the battery terms are 0. A battery without both day values has
    no value. The result is never negative.
    """
    if solar is None or grid_import is None or grid_export is None:
        return None
    if has_battery:
        if battery_charge is None or battery_discharge is None:
            return None
    else:
        battery_charge = 0.0
        battery_discharge = 0.0
    return max(
        0.0,
        solar + grid_import + battery_discharge - grid_export - battery_charge,
    )


def house_total_ready(roles: Iterable[str]) -> bool:
    """Return True when every total the house formula needs is present. @zara"""
    present = set(roles)
    if any(role not in present for role in HOUSE_REQUIRED):
        return False
    if battery_present(present):
        return all(role in present for role in HOUSE_BATTERY)
    return True


def hp_derived_today(roles: Iterable[str]) -> frozenset[str]:
    """Heat-pump day roles whose total exists and no device reports the day. @zara"""
    present = set(roles)
    return frozenset(
        today
        for today, total in HP_TODAY_FROM_TOTAL.items()
        if today not in present and total in present
    )


def derived_roles(roles: Iterable[str]) -> frozenset[str]:
    """Roles to publish because their inputs exist and no device reports them. @zara"""
    present = set(roles)
    derived: set[str] = set()
    if "energy_house_total" not in present and house_total_ready(present):
        derived.add("energy_house_total")
    for today, total in TODAY_FROM_TOTAL.items():
        if today in present:
            continue
        if total in present or total in derived:
            derived.add(today)
    return frozenset(derived)


def input_roles(role: str, roles: Iterable[str]) -> tuple[str, ...]:
    """Device roles a derived installation entity follows. @zara"""
    present = set(roles)
    if role == "energy_house_total" or (
        role == "energy_house_today" and "energy_house_total" not in present
    ):
        required = list(HOUSE_REQUIRED)
        if battery_present(present):
            required.extend(HOUSE_BATTERY)
        return tuple(required)
    total = TODAY_FROM_TOTAL.get(role)
    if total is None:
        return ()
    return (total,)


def apply_reading(
    state: DailyBaseline | None, total: float | None, day: str
) -> tuple[DailyBaseline | None, float | None]:
    """Apply one total reading; today's energy is None without a baseline or a total. @zara"""
    if total is None:
        return state, None
    if state is None:
        return DailyBaseline(day, None, total, 0.0), None
    if state.day != day:
        rolled = _roll_day(state, day)
        if rolled is None:
            return DailyBaseline(day, None, total, 0.0), None
        state = rolled
    if state.baseline is None or state.last is None:
        return DailyBaseline(day, None, total, 0.0), None
    delta = total - state.last
    if delta < 0 or delta > JUMP_LIMIT_KWH:
        # reset, or an implausible step: keep the day so far, do not add the step
        accrued = state.accrued + max(0.0, state.last - state.baseline)
        updated = DailyBaseline(day, total, total, accrued)
        return updated, max(0.0, accrued)
    updated = DailyBaseline(day, state.baseline, total, state.accrued)
    return updated, max(0.0, updated.accrued + (total - updated.baseline))


def _roll_day(state: DailyBaseline, day: str) -> DailyBaseline | None:
    """Start today from yesterday's last reading; a larger gap has no baseline. @zara"""
    if state.last is None:
        return None
    try:
        previous = date.fromisoformat(state.day)
        current = date.fromisoformat(day)
    except ValueError:
        return None
    if current != previous + timedelta(days=1):
        return None
    return DailyBaseline(day, state.last, state.last, 0.0)


class DailyTracker:
    """Baselines of every derived daily counter, one installation. @zara"""

    def __init__(self) -> None:
        """Start with no baselines. @zara"""
        self._roles: dict[str, DailyBaseline] = {}
        self._house: HouseAccum | None = None

    @classmethod
    def from_snapshot(cls, raw: Any) -> DailyTracker:
        """Restore a snapshot written by ``snapshot``. @zara"""
        tracker = cls()
        if not isinstance(raw, dict):
            return tracker
        roles = raw.get("roles")
        if isinstance(roles, dict):
            for role, item in roles.items():
                parsed = _parse_baseline(role, item)
                if parsed is not None:
                    tracker._roles[role] = parsed
        tracker._house = _parse_house(raw.get("house"))
        return tracker

    def update(self, role: str, total: float | None, day: str) -> float | None:
        """Record ``total`` on local ``day`` and return today's energy. @zara"""
        if role not in _TRACKED_TOTALS:
            raise ValueError(f"not a tracked total {role}")
        current = self._roles.get(role)
        state, value = apply_reading(current, total, day)
        if state is not None and state != current:
            self._roles[role] = state
        return value

    def update_house(self, today: float | None, day: str) -> float | None:
        """Record derived house today and return the monotonic house total. @zara"""
        state, value = apply_house_total(self._house, today, day)
        if state is not None and state != self._house:
            self._house = state
        return value

    def published_house_today(self, today: float | None, day: str) -> float | None:
        """High-water mark of the derived house day, or None if it cannot be computed. @zara

        ``HouseAccum.last_today`` is already that mark: ``apply_house_total``
        raises it only when the new sum is higher and replaces it on a new
        local day. The same state feeds the monotonic house total, so the
        total grows only by a new high. A missing sum is not a reading: the
        stored mark is not returned, because an unavailable state is left out
        of statistics while a repeated stale value would be stored as measured.
        """
        if today is None:
            return None
        self.update_house(today, day)
        state = self._house
        if state is None or state.day != day:
            return None
        return state.last_today

    def snapshot(self) -> dict[str, Any]:
        """JSON-ready baselines. @zara"""
        data: dict[str, Any] = {
            "roles": {
                role: {
                    "day": state.day,
                    "baseline": state.baseline,
                    "last": state.last,
                    "accrued": state.accrued,
                }
                for role, state in self._roles.items()
            }
        }
        if self._house is not None:
            data["house"] = {
                "total": self._house.total,
                "last_today": self._house.last_today,
                "day": self._house.day,
            }
        return data


def _parse_baseline(role: Any, item: Any) -> DailyBaseline | None:
    if role not in _TRACKED_TOTALS or not isinstance(item, Mapping):
        return None
    day = item.get("day")
    if not isinstance(day, str):
        return None
    try:
        date.fromisoformat(day)
    except ValueError:
        return None
    last = _optional_float(item.get("last"))
    if last is None:
        return None
    baseline = item.get("baseline")
    if baseline is not None:
        baseline = _optional_float(baseline)
        if baseline is None:
            return None
    accrued = _optional_float(item.get("accrued"))
    if accrued is None:
        accrued = 0.0
    return DailyBaseline(day, baseline, last, max(0.0, accrued))


def _parse_house(item: Any) -> HouseAccum | None:
    if not isinstance(item, Mapping):
        return None
    total = _optional_float(item.get("total"))
    last_today = _optional_float(item.get("last_today"))
    day = item.get("day")
    if total is None or last_today is None or not isinstance(day, str):
        return None
    try:
        date.fromisoformat(day)
    except ValueError:
        return None
    return HouseAccum(max(0.0, total), max(0.0, last_today), day)


def _optional_float(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    return float(value)
