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


def _input_present(role: str, present: set[str]) -> bool:
    """Return whether a flow input exists. Solar also accepts AC output. @zara"""
    if role == "power_solar":
        return "power_inverter_ac_output" in present or "power_solar" in present
    return role in present


def _group_key(entry_id: str, serial: str) -> tuple[str, str]:
    """Return the entry key, or the serial when the entry id is missing. @zara"""
    if entry_id:
        return ("entry", entry_id)
    return ("serial", serial)


def _first_per_serial(
    rows: list[tuple[str, str, str]],
) -> list[tuple[str, str, str]]:
    """Keep the first entity of each serial. @zara"""
    seen: set[str] = set()
    kept: list[tuple[str, str, str]] = []
    for row in rows:
        if row[1] in seen:
            continue
        seen.add(row[1])
        kept.append(row)
    return kept


def generation_groups(
    ac: list[tuple[str, str, str]],
    discharge: list[tuple[str, str, str]],
    solar: list[tuple[str, str, str]],
    charge: list[tuple[str, str, str]] | None = None,
) -> list[tuple[list[str], list[str], list[str], list[str], list[str]]]:
    """Group generation by config entry. @zara

    Each row is ``(entry_id, serial, entity_id)``. The tuple is AC, discharge,
    solar fallback, charge, and PV (``power_solar`` of devices that also have
    AC). An empty entry id groups by serial, so one device that publishes both
    roles stays together. Discharge and charge belong to the group only when
    that group has an AC output. A serial that already has an AC output does
    not also contribute its solar power as generation; that solar is the PV
    cap for the charge.
    """
    ac_rows = _first_per_serial(ac)
    buckets: dict[
        tuple[str, str], tuple[list[str], list[str], list[str], list[str], list[str]]
    ] = {}
    order: list[tuple[str, str]] = []

    def bucket(
        entry_id: str, serial: str
    ) -> tuple[list[str], list[str], list[str], list[str], list[str]]:
        key = _group_key(entry_id, serial)
        found = buckets.get(key)
        if found is None:
            found = ([], [], [], [], [])
            buckets[key] = found
            order.append(key)
        return found

    charge_rows = _first_per_serial(charge or [])
    ac_serials: set[str] = set()
    for entry_id, serial, entity_id in ac_rows:
        bucket(entry_id, serial)[0].append(entity_id)
        ac_serials.add(serial)
    for entry_id, serial, entity_id in _first_per_serial(discharge):
        found = buckets.get(_group_key(entry_id, serial))
        if found is not None and found[0]:
            found[1].append(entity_id)
    for entry_id, serial, entity_id in charge_rows:
        found = buckets.get(_group_key(entry_id, serial))
        if found is not None and found[0]:
            found[3].append(entity_id)
    for entry_id, serial, entity_id in _first_per_serial(solar):
        found = buckets.get(_group_key(entry_id, serial))
        if serial in ac_serials:
            if found is not None and found[0]:
                found[4].append(entity_id)
            continue
        bucket(entry_id, serial)[2].append(entity_id)
    return [buckets[key] for key in order]


def generation_entity_ids(
    groups: list[tuple[list[str], list[str], list[str], list[str], list[str]]],
) -> list[str]:
    """Return the AC, discharge, solar and PV entities the groups use. @zara

    PV is listed only for a group that also has charge, because that is when
    the cap changes generation. Charge itself is an ordinary flow input.
    """
    entity_ids: list[str] = []
    for ac_ids, discharge_ids, solar_ids, charge_ids, pv_ids in groups:
        entity_ids.extend(ac_ids)
        entity_ids.extend(discharge_ids)
        entity_ids.extend(solar_ids)
        if charge_ids:
            entity_ids.extend(pv_ids)
    return entity_ids


def flow_entity_ids(generation: Iterable[str], extra: Iterable[str]) -> list[str]:
    """Return generation entities, then the other inputs, without duplicates. @zara"""
    ordered: list[str] = []
    seen: set[str] = set()

    def add(entity_id: str | None) -> None:
        if not entity_id or entity_id in seen:
            return
        seen.add(entity_id)
        ordered.append(entity_id)

    for entity_id in generation:
        add(entity_id)
    for entity_id in extra:
        add(entity_id)
    return ordered


def device_generation(
    ac: float | None,
    discharge: float | None,
    solar: float | None,
    *,
    has_ac: bool,
    has_battery: bool,
) -> float | None:
    """AC generation of one device. None when its chosen input is missing. @zara

    With a battery on the device, discharge is removed from the AC output and
    the result stays at or above 0. A missing discharge is not removed, so the
    device still counts. Without an AC output the device uses its solar power.
    """
    if has_ac:
        produced = _non_negative(ac)
        if produced is None:
            return None
        drawn = _non_negative(discharge) if has_battery else None
        if drawn is not None:
            return max(0.0, produced - drawn)
        return produced
    return _non_negative(solar)


def entry_generation(
    ac: list[float | None],
    discharge: list[float | None],
    solar: list[float | None],
    charge: list[float | None] | None = None,
    pv: list[float | None] | None = None,
) -> float | None:
    """Return one group's AC generation. @zara

    AC output of a hybrid is already after DC charging, so the part of the
    charge that this group's PV can cover is added back:
    max(0, sum of AC minus discharge plus min(charge, PV)). PV is
    ``power_solar`` of the devices that have AC output. Charge above that PV
    stays grid charge and is not generation. Devices without an AC output add
    their solar power. A missing AC or solar-fallback value keeps the group
    missing. A missing discharge is not removed. A missing charge is not
    added. A missing PV value while a charge is present keeps the group
    missing.
    """
    produced: list[float] = []
    for value in ac:
        number = _non_negative(value)
        if number is None:
            return None
        produced.append(number)
    fallback: list[float] = []
    for value in solar:
        number = _non_negative(value)
        if number is None:
            return None
        fallback.append(number)
    if not produced and not fallback:
        return None
    total = sum(produced)
    subtracted = 0.0
    if produced and discharge:
        drawn: list[float] = []
        for value in discharge:
            number = _non_negative(value)
            if number is None:
                drawn = []
                break
            drawn.append(number)
        if drawn:
            subtracted = sum(drawn)
    added = 0.0
    if produced and charge:
        charged: list[float] = []
        for value in charge:
            number = _non_negative(value)
            if number is None:
                charged = []
                break
            charged.append(number)
        if charged and sum(charged) > 0:
            if not pv:
                covered = 0.0
            else:
                covered_parts: list[float] = []
                for value in pv:
                    number = _non_negative(value)
                    if number is None:
                        return None
                    covered_parts.append(number)
                covered = sum(covered_parts)
            added = min(sum(charged), covered)
    if produced and (subtracted or added):
        total = max(0.0, total - subtracted + added)
    return total + sum(fallback)


def generation_total(parts: list[float | None]) -> float | None:
    """Sum device generation. One missing device keeps P missing. @zara"""
    if not parts or any(part is None for part in parts):
        return None
    return float(sum(parts))


def flow_inputs(role: str, has_battery: bool) -> tuple[str, ...]:
    """Device roles one derived flow reads. Empty when that flow is not derived. @zara

    ``power_solar`` stands for generation. A device uses its AC output when it
    has one, and its solar power otherwise.
    """
    if role in BATTERY_FLOW_ROLES and not has_battery:
        return ()
    if role == "power_solar_to_house":
        if has_battery:
            return ("power_solar", "power_house", "power_battery_charge")
        return ("power_solar", "power_house")
    if role in ("power_solar_to_battery", "power_grid_to_battery"):
        return ("power_solar", "power_house", "power_battery_charge")
    if role == "power_battery_to_house":
        return (
            "power_solar",
            "power_house",
            "power_battery_charge",
            "power_battery_discharge",
        )
    if role == "power_grid_to_house":
        if has_battery:
            return (
                "power_solar",
                "power_house",
                "power_battery_charge",
                "power_battery_discharge",
            )
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
        if needed and all(_input_present(item, present) for item in needed):
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

    While the battery charges, PV fills the battery first and the rest goes to
    the house. Otherwise PV goes to the house first. The grid covers what
    remains. Every finite input is clamped at 0 before the split. Without a
    battery the charge and discharge terms are 0 and the battery flows are
    omitted.
    """
    produced = _non_negative(solar)
    consumed = _non_negative(house)
    if has_battery:
        charging = _non_negative(charge)
        discharging = _non_negative(discharge)
    else:
        charging = 0.0
        discharging = 0.0
    charging_first = charging is not None and charging > 0
    if produced is None or consumed is None:
        solar_to_house = None
        solar_to_battery = None
        grid_to_battery = None
    elif charging_first:
        solar_to_battery = min(charging, produced)
        solar_to_house = min(produced - solar_to_battery, consumed)
        grid_to_battery = max(0.0, charging - solar_to_battery)
    else:
        solar_to_house = min(produced, consumed)
        if charging is None:
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
