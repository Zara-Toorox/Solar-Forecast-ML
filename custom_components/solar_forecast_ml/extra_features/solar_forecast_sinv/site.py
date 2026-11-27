# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""S-INV installation ("S-INV Anlage"): system entities sinv_<role> over all devices. @zara

One config entry of its own owns the system entities, so they survive adding or
removing inverter instances. Each system entity follows the device entities of its
role (found through the entity registry by unique_id) and combines them by the
aggregation rule of the contract. A missing device value of a sum is replaced
(last power for a short hold, then 0 W; last counter reading) while another
device still reports; otherwise the system value is unavailable, so totals never
drop. A falling lifetime total in a sum keeps the last accepted contribution
until three readings confirm the new counter, then continues with an offset.
Daily counters and house energy are derived
when no device reports them and their inputs exist. Power flows are derived
the same way from the installation power when no device measures that flow.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, replace
import math
import re
from datetime import date, datetime, timedelta
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.components.sensor import (
    RestoreSensor,
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import SOURCE_SYSTEM, ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_utc_time,
    async_track_state_change_event,
    async_track_state_report_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from . import contract, dc_energy, site_daily, site_flows
from .const import (
    AC_SOURCE_NON_SOLAR,
    CONF_AC_SOURCE,
    CONF_AC_SOURCE_STORAGE,
    AC_SOURCE_STORAGE_NONE,
    CONF_VENDOR,
    DOMAIN,
    LOGGER,
    SIGNAL_SITE_CONFIG_UPDATED,
    VENDOR_HP,
    is_hp_device_vendor,
)
from .entity import async_convert_draft_system_entries, async_reclaim_system_ids
from .vendors.anker import GRID_ENERGY_ROLES, grid_energy_priority

VENDOR_SITE = "site"
SITE_UNIQUE_ID = "sinv_site"
SITE_TITLE = "S-INV Anlage"
SOURCES_ATTR = "sinv_sources"
SOURCE_ATTR = "sinv_source"
OFFSET_ATTR = "sinv_source_offset"
AGGREGATION_ATTR = "sinv_aggregation"
MISSING_ATTR = "sinv_missing_sources"
_FLOW_STARTED = f"{DOMAIN}_site_flow_started"
_SITE_DAILY = f"{DOMAIN}.site_daily"
_SITE_SOURCES = f"{DOMAIN}.site_sources"
_BATTERY_TOTAL_ROLES = ("energy_battery_charge_total", "energy_battery_discharge_total")
_KEPT_ROLES = ("energy_solar_total", "energy_solar_today", *_BATTERY_TOTAL_ROLES)
# Longer than a restart and a few missed Solarbank messages, shorter than
# leaving the counter empty while the smart meter still has a reading.
SOURCE_HOLD = timedelta(minutes=15)
# A short device gap (a DTU blip, a reconnect) keeps the last power. A device
# that stays away longer, e.g. a micro inverter asleep at night, counts as 0 W.
POWER_HOLD = timedelta(minutes=5)
# Persisting counter readings on every update would rewrite the store constantly.
READINGS_SAVE_DELAY = 300.0
# Lifetime totals are published in 0.001 kWh steps. Half of that step is float
# residue around the rounding boundary, not a counter reset.
SUM_DROP_TOLERANCE_KWH = 0.0005
# A lasting reset repeats. One low reading does not. Three that do not fall
# further adopt the new counter.
SUM_RESET_CONFIRMATIONS = 3
_INDEX = re.compile(r"^sinv_[a-z]{2}(\d\d)_")


@dataclass(frozen=True)
class Source:
    """A device entity feeding a system entity. @zara"""

    entity_id: str
    serial: str
    index: int
    entry_id: str = ""
    priority: int = 0


@dataclass(frozen=True)
class SourceCont:
    """Offset that keeps one installation counter continuous across sources. @zara"""

    entity_id: str
    offset: float
    published: float | None
    missing_since: str | None = None
    live: bool = True


@dataclass(frozen=True)
class LastReading:
    """Last live value of one device entity that feeds a sum. @zara"""

    value: float
    day: str
    seen: datetime | None = None
    proven_day: str | None = None


@dataclass(frozen=True)
class SumGuard:
    """Accepted raw reading, offset and reset streak of one summed lifetime counter. @zara"""

    accepted: float
    offset: float = 0.0
    pending: float | None = None
    count: int = 0
    observed: float | None = None
    reported: datetime | None = None

    @property
    def contribution(self) -> float:
        """Value this device adds to the installation total. @zara"""
        return self.accepted + self.offset


@dataclass(frozen=True)
class RetiredSolar:
    """Historical PV contribution from a removed or non-solar source. @zara"""

    serial: str
    entity_id: str
    value: float
    epoch: int = 1
    archived: bool = False
    removed: bool = False
    accepted: float | None = None
    offset: float | None = None


@dataclass(frozen=True)
class RetiredSolarToday:
    """PV share from a removed or non-solar source for its local production day. @zara"""

    serial: str
    entity_id: str
    value: float
    day: str
    epoch: int = 1
    removed: bool = False


@dataclass(frozen=True)
class LinkedStoragePair:
    """Confirmed link between a non-solar AC inverter and an S-INV storage device. @zara"""

    ez1_entry_id: str
    ez1_serial: str
    storage_serial: str
    storage_entry_id: str
    storage_ac_in_entity_id: str | None = None
    requires_ac_in: bool = False


@dataclass(frozen=True)
class TopologyPlan:
    """Snapshot evaluation of non-solar AC inverters and linked storage devices. @zara"""

    has_non_solar_ac: bool = False
    non_solar_entry_ids: frozenset[str] = frozenset()
    non_solar_serials: frozenset[str] = frozenset()
    confirmed_pairs: tuple[LinkedStoragePair, ...] = ()
    linked_storage_serials: frozenset[str] = frozenset()
    linked_storage_entry_ids: frozenset[str] = frozenset()
    unresolved_entry_ids: frozenset[str] = frozenset()
    resolved_entry_ids: frozenset[str] = frozenset()

    @property
    def is_unresolved(self) -> bool:
        """Return True when any non-solar inverter has an unresolved storage target. @zara"""
        return bool(self.unresolved_entry_ids)

    def pair_by_ez1(self, serial: str) -> LinkedStoragePair | None:
        """Return the confirmed pair for one non-solar inverter serial. @zara"""
        for pair in self.confirmed_pairs:
            if pair.ez1_serial == serial:
                return pair
        return None

    def pair_by_storage(self, serial: str) -> LinkedStoragePair | None:
        """Return the confirmed pair for one linked storage serial. @zara"""
        for pair in self.confirmed_pairs:
            if pair.storage_serial == serial:
                return pair
        return None


@dataclass(frozen=True)
class Fill:
    """Device values of a sum after missing ones were replaced. @zara"""

    values: list[float | None]
    substituted: list[str]
    held: bool = False
    changed: bool = False


def fill_missing(
    role: str,
    readings: list[tuple[str, float | None]],
    last: dict[str, LastReading],
    now: datetime,
    day: str,
    proven_days: Mapping[str, str | None] | None = None,
) -> Fill:
    """Replace missing device values of a sum role while another device reports. @zara

    Power keeps the last value for POWER_HOLD, then counts 0 W. A counter keeps its
    last reading; a day counter only on the same local day, afterwards 0. A counter
    without any reading stays missing. Updates ``last`` with every live value.
    """
    if not readings or all(value is None for _, value in readings):
        return Fill([value for _, value in readings], [])
    power = role.startswith("power_")
    today = role.endswith("_today")
    values: list[float | None] = []
    substituted: list[str] = []
    held = False
    changed = False
    for entity_id, value in readings:
        known = last.get(entity_id)
        if value is not None:
            proven_day = proven_days.get(entity_id) if proven_days is not None else None
            if not power and (
                known is None
                or known.value != value
                or known.day != day
                or known.proven_day != proven_day
            ):
                changed = True
            last[entity_id] = LastReading(value, day, now, proven_day)
            values.append(value)
            continue
        if power:
            if (
                known is not None
                and known.seen is not None
                and now - known.seen <= POWER_HOLD
            ):
                values.append(known.value)
                held = True
            else:
                values.append(0.0)
        elif known is None:
            values.append(None)
            continue
        elif today and known.day != day:
            values.append(0.0)
        else:
            values.append(known.value)
        substituted.append(entity_id)
    return Fill(values, substituted, held, changed)


def _sum_lifetime(role: str) -> bool:
    """Return whether an AGG_SUM role is a lifetime energy total. @zara"""
    split = contract.split_role(role)
    if split is None:
        return False
    spec = split[0]
    return (
        contract.aggregation(role) == contract.AGG_SUM
        and spec.device_class == "energy"
        and spec.state_class == "total_increasing"
        and spec.base.endswith("_total")
    )


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if not math.isfinite(value):
        return None
    return float(value)


def apply_sum_guard(
    raw: float, guard: SumGuard | None, reported: datetime | None = None
) -> tuple[float, SumGuard]:
    """Contribution of one lifetime reading to an AGG_SUM total. @zara

    A value below the last accepted reading, beyond rounding, keeps that
    contribution. Three consecutive readings that do not fall further adopt
    the new value with offset last contribution minus the new reading, so it
    does not fall.
    """
    if guard is None:
        return raw, SumGuard(raw, observed=raw, reported=reported)
    stand = guard.contribution
    if raw >= guard.accepted - SUM_DROP_TOLERANCE_KWH:
        if raw > guard.accepted:
            return raw + guard.offset, SumGuard(
                raw, guard.offset, observed=raw, reported=reported
            )
        return stand, SumGuard(
            guard.accepted, guard.offset, observed=raw, reported=reported
        )
    if guard.pending is not None and raw >= guard.pending - SUM_DROP_TOLERANCE_KWH:
        count = guard.count + 1
        pending = raw
    else:
        count = 1
        pending = raw
    if count >= SUM_RESET_CONFIRMATIONS:
        return stand, SumGuard(raw, stand - raw, observed=raw, reported=reported)
    return stand, SumGuard(guard.accepted, guard.offset, pending, count, raw, reported)


def interrupt_sum_guard(guard: SumGuard | None) -> SumGuard | None:
    """End a reset streak. A missing reading does not count toward the three. @zara"""
    if guard is None or (guard.pending is None and guard.count == 0):
        return guard
    return SumGuard(guard.accepted, guard.offset)


def _same_sum_sample(guard: SumGuard, raw: float, reported: datetime | None) -> bool:
    """Return whether this call repeats a sample already counted. @zara"""
    if guard.observed != raw:
        return False
    if reported is None:
        return guard.reported is None
    return guard.reported == reported


def _reported_at(state: Any) -> datetime | None:
    try:
        reported = state.last_reported
    except AttributeError:
        return None
    if isinstance(reported, datetime):
        return reported
    return None


def _guard_changed(before: SumGuard | None, after: SumGuard) -> bool:
    if before is None:
        return True
    return (
        before.accepted,
        before.offset,
        before.pending,
        before.count,
        before.observed,
    ) != (
        after.accepted,
        after.offset,
        after.pending,
        after.count,
        after.observed,
    )


def _guard_sum_readings(
    role: str,
    states: list[tuple[str, Any]],
    tracker: SourceTracker,
    serials: dict[str, str] | None = None,
) -> tuple[list[tuple[str, float | None]], bool, bool]:
    """Replace a falling lifetime reading with the contribution the sum keeps. @zara"""
    readings: list[tuple[str, float | None]] = []
    changed = False
    rebased = False
    for entity_id, state in states:
        raw = _float(state)
        guard = tracker.sum_guards.get(entity_id)
        if raw is None:
            updated = interrupt_sum_guard(guard)
            if updated is not guard and updated is not None:
                tracker.sum_guards[entity_id] = updated
                changed = True
            readings.append((entity_id, None))
            continue
        reported = _reported_at(state)
        serial = (serials or {}).get(entity_id, "")
        if (
            role == "energy_solar_total"
            and serial
            and serial in tracker.pending_solar_rebase
        ):
            updated = SumGuard(
                accepted=raw,
                offset=-raw,
                observed=raw,
                reported=reported,
            )
            tracker.sum_guards[entity_id] = updated
            tracker.pending_solar_rebase.pop(serial, None)
            changed = True
            rebased = True
            readings.append((entity_id, updated.contribution))
            continue
        if serial and guard is None and (
            role == "energy_solar_total" or role in _BATTERY_TOTAL_ROLES
        ):
            retired = (
                tracker.retired_solar
                if role == "energy_solar_total"
                else tracker.retired_sums
            )
            key = contract.role_unique_id(serial, role)
            item = retired.get(key)
            if item is not None and item.removed:
                if item.accepted is not None and item.offset is not None:
                    guard = SumGuard(item.accepted, item.offset)
                else:
                    guard = SumGuard(item.value)
                del retired[key]
                changed = rebased = True
        if guard is not None and _same_sum_sample(guard, raw, reported):
            readings.append((entity_id, guard.contribution))
            continue
        contribution, updated = apply_sum_guard(raw, guard, reported)
        if guard is not None and updated.offset != guard.offset:
            LOGGER.info(
                "Installation %s kept %s after a counter reset, offset %s kWh",
                role,
                entity_id,
                updated.offset,
            )
        if _guard_changed(guard, updated):
            changed = True
        tracker.sum_guards[entity_id] = updated
        readings.append((entity_id, contribution))
    return readings, changed, rebased


def source_now() -> datetime:
    """Clock for the source-hold window. @zara"""
    return dt_util.utcnow()


def _rank_sources(sources: list[Source]) -> list[Source]:
    return sorted(
        sources, key=lambda source: (-source.priority, source.index, source.entity_id)
    )


def valid_energy_seed(value: Any, unit: Any, expected_unit: str) -> float | None:
    """Return a last installation total that may seed an offset, or None. @zara

    The value has to be a finite number of at least 0 and the unit has to be
    the contract unit. Anything else is ignored so the first offset stays 0.
    """
    if not isinstance(unit, str) or unit != expected_unit:
        return None
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if text.lower() in {"", "none", "unknown", "unavailable"}:
            return None
        try:
            number = float(text)
        except ValueError:
            return None
    else:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
    if not math.isfinite(number) or number < 0:
        return None
    return number


def continue_single(
    readings: list[tuple[Source, float | None]],
    memory: SourceCont | None,
    now: datetime,
    seed: float | None,
) -> tuple[float | None, SourceCont | None, str | None]:
    """Publish one lifetime counter without a jump when its source changes. @zara

    The preferred source (highest priority, then device index) is used as soon
    as it has a value. A lower source is adopted only after the current source
    has been missing for ``SOURCE_HOLD``. On the first live reading the offset
    is the restored installation total minus the source when the source is
    lower, and 0 when the source is greater or equal. A later source change
    keeps the last published value. The same source never publishes below that
    value. Returns the published value, the new memory, and the previous
    entity id when the source changed.
    """
    if now.tzinfo is None:
        raise ValueError("source hold requires a timezone-aware datetime")
    ranked = _rank_sources([source for source, _value in readings])
    raw_of = {source.entity_id: value for source, value in readings}
    if not ranked:
        return None, memory, None
    preferred = ranked[0]
    preferred_raw = raw_of.get(preferred.entity_id)

    established = bool(memory and memory.live and memory.published is not None)

    def adopt(
        source: Source, raw: float, base: float | None
    ) -> tuple[float, SourceCont, str | None]:
        previous = memory.entity_id if memory and memory.live else None
        if previous == source.entity_id and memory is not None:
            offset = memory.offset
            switched = None
        elif base is None or (not established and raw >= base):
            # First commissioning, or the restored total is already at or
            # below the source: do not invent a positive offset.
            offset = 0.0
            switched = None
        else:
            offset = base - raw
            switched = previous or ""
        published = round(raw + offset, 3)
        if established and memory is not None and published < memory.published:
            # Home Assistant resets a total_increasing statistic only when the
            # state falls below 90% of the previous state. Keeping the last
            # published value avoids that reset and the smaller dip warning.
            published = memory.published
        return (
            published,
            SourceCont(source.entity_id, offset, published, None, True),
            switched,
        )

    if preferred_raw is not None:
        base = memory.published if memory and memory.published is not None else seed
        published, updated, switched = adopt(preferred, preferred_raw, base)
        return published, updated, switched

    current = preferred
    if memory and memory.entity_id in raw_of:
        current = next(
            source for source in ranked if source.entity_id == memory.entity_id
        )
    current_raw = raw_of.get(current.entity_id)
    if current_raw is not None and current is not preferred:
        base = memory.published if memory and memory.published is not None else seed
        published, updated, switched = adopt(current, current_raw, base)
        since = memory.missing_since if memory else None
        updated = SourceCont(
            updated.entity_id, updated.offset, updated.published, since, True
        )
        return published, updated, switched

    since_text = memory.missing_since if memory and memory.missing_since else None
    if since_text is None:
        since = now
        since_text = now.isoformat()
    else:
        since = datetime.fromisoformat(since_text)
        if since.tzinfo is None:
            since = now
    held = SourceCont(
        current.entity_id,
        memory.offset if memory else 0.0,
        memory.published if memory else seed,
        since_text,
        memory.live if memory else False,
    )
    if now - since < SOURCE_HOLD:
        return None, held, None
    base = held.published
    for source in ranked:
        if source.entity_id == current.entity_id:
            continue
        raw = raw_of.get(source.entity_id)
        if raw is None:
            continue
        published, updated, switched = adopt(source, raw, base)
        return published, updated, switched
    return None, held, None


def aggregate(
    rule: str, values: list[float | None], weights: list[float | None] | None = None
) -> float | None:
    """Combine device values by rule; any missing value gives None. @zara"""
    if not values:
        return None
    if rule == contract.AGG_SINGLE:
        return values[0]
    if any(value is None for value in values):
        return None
    if rule == contract.AGG_SUM:
        return sum(values)
    if rule == contract.AGG_SOC:
        if (
            weights
            and len(weights) == len(values)
            and all(w is not None and w > 0 for w in weights)
        ):
            return sum(v * w for v, w in zip(values, weights, strict=True)) / sum(
                weights
            )
        return sum(values) / len(values)
    return None


def house_balance_plan(
    house: list[Source],
    ac_net: list[Source],
    generators: list[Source],
    owner_vendor: str | None,
) -> list[Source] | None:
    """Net AC sources to add to the meter owner's house value, or None. @zara

    Per-device house values already contain the grid point, so they are never
    summed. With exactly one device reporting the house, generators of other
    config entries are unknown to it; their net AC power is added. Every such
    generator must publish ``power_ac_net`` and the owner's house value must be an
    energy balance (``BALANCE_HOUSE_VENDORS``), otherwise the owner's value is
    used alone (rule ``single``).
    """
    if (
        len(house) != 1
        or not house[0].entry_id
        or owner_vendor not in contract.BALANCE_HOUSE_VENDORS
    ):
        return None
    owner = house[0].entry_id
    foreign = {
        source.serial
        for source in generators
        if source.entry_id and source.entry_id != owner
    }
    if not foreign:
        return None
    nets = {source.serial: source for source in ac_net if source.entry_id != owner}
    if foreign - nets.keys():
        return None
    return [nets[serial] for serial in sorted(foreign)]


def house_balance(
    owner: float | None, nets: list[float | None]
) -> tuple[float | None, bool]:
    """Owner house plus foreign net AC, and whether the foreign values were used. @zara

    A missing foreign value (device offline, stale entity) falls back to the
    owner's value alone, never to a guessed 0; house consumption is never negative.
    """
    if owner is None:
        return None, False
    if any(net is None for net in nets):
        return max(0.0, owner), False
    return max(0.0, owner + sum(net for net in nets if net is not None)), True


def aggregate_state(rule: str, states: list[bool | None]) -> bool | None:
    """Combine on/off device states: any (curtailment) or all (export allowed). @zara"""
    if not states or any(state is None for state in states):
        return None
    return any(states) if rule == contract.AGG_ANY else all(states)


def installation_local_day() -> str:
    """Local calendar day in the Home Assistant time zone. @zara"""
    return site_daily.local_day(dt_util.as_local(dt_util.now()))


def sensor_roles(
    sources: dict[str, list[Source]],
    existing: set[str],
    *,
    topology: TopologyPlan | None = None,
    has_retired_solar: bool = False,
    has_retired_solar_today: bool = False,
) -> set[str]:
    """Sensor roles of the installation, including derived ones whose inputs exist. @zara"""
    roles = set(sources)
    roles.update(existing)
    if has_retired_solar:
        roles.add("energy_solar_total")
    if has_retired_solar_today:
        roles.add("energy_solar_today")
    roles.update(site_daily.derived_roles(sources))
    if topology is not None and topology.has_non_solar_ac:
        excluded = topology.non_solar_serials | topology.linked_storage_serials
        has_gen = any(
            source.serial not in excluded
            for role_name in ("power_solar", "power_inverter_ac_output")
            for source in sources.get(role_name, [])
        )
        roles.update(
            site_flows.derived_flow_roles(
                sources,
                has_generation=has_gen,
                has_non_solar_ac=True,
            )
        )
    else:
        roles.update(site_flows.derived_flow_roles(sources))
    return roles


class SiteDaily:
    """Persisted midnight baselines of one installation. @zara"""

    def __init__(
        self, tracker: site_daily.DailyTracker, store: Store | None = None
    ) -> None:
        """Keep the tracker and the store that reloads it after a restart. @zara"""
        self.tracker = tracker
        self._store = store

    def update(self, role: str, total: float | None, day: str) -> float | None:
        """Record a total and persist the baseline when it changed. @zara"""
        before = self.tracker.snapshot()
        value = self.tracker.update(role, total, day)
        self._save_if_changed(before)
        return value

    def update_house(self, today: float | None, day: str) -> float | None:
        """Record derived house today and persist the monotonic total when it changed. @zara"""
        before = self.tracker.snapshot()
        value = self.tracker.update_house(today, day)
        self._save_if_changed(before)
        return value

    def published_house_today(self, today: float | None, day: str) -> float | None:
        """Persist the derived house day and return its high-water mark. @zara"""
        before = self.tracker.snapshot()
        value = self.tracker.published_house_today(today, day)
        self._save_if_changed(before)
        return value

    def _save_if_changed(self, before: dict[str, Any]) -> None:
        if self._store is not None and self.tracker.snapshot() != before:
            self.save()

    def save(self) -> None:
        """Schedule a save of the daily tracker. @zara"""
        if self._store is not None:
            self._store.async_delay_save(self.tracker.snapshot, 1.0)

    async def async_save_now(self) -> None:
        """Persist the daily tracker immediately. @zara"""
        if self._store is not None:
            await self._store.async_save(self.tracker.snapshot())


class SourceTracker:
    """Persisted source offsets and summed lifetime counters of one installation. @zara"""

    def __init__(self) -> None:
        """Start with no stored source. @zara"""
        self._roles: dict[str, SourceCont] = {}
        # Last counter reading per device entity, so a sum survives a device
        # that is missing after a restart.
        self.readings: dict[str, LastReading] = {}
        # Per device entity of an AGG_SUM lifetime total: accepted raw value,
        # offset and the streak of a candidate reset.
        self.sum_guards: dict[str, SumGuard] = {}
        # Integrated solar energy per device serial that has no vendor counter.
        self.dc_energy: dict[str, dc_energy.Counter] = {}
        # Serials that have reported a vendor energy_solar_total. Never integrated.
        self.vendor_solar: set[str] = set()
        # Midnight baseline of a vendor total that has no vendor day counter.
        self.solar_days: dict[str, site_daily.DailyBaseline] = {}
        # Integrated battery charge and discharge, keyed by serial and role.
        self.battery_energy: dict[str, dc_energy.Counter] = {}
        # Historical PV contributions from removed or non-solar sources.
        self.retired_solar: dict[str, RetiredSolar] = {}
        self.retired_sums: dict[str, RetiredSolar] = {}
        # Same-day PV shares retired for their local production day.
        self.retired_solar_today: dict[str, RetiredSolarToday] = {}
        self.solar_sources: dict[str, dict[str, str]] = {}
        self.non_solar_serials: set[str] = set()
        # Serials explicitly re-added as PV that must start from a fresh 0 offset.
        self.pending_solar_rebase: dict[str, int] = {}

    def get(self, role: str) -> SourceCont | None:
        """Return the stored continuation of one role. @zara"""
        return self._roles.get(role)

    def set(self, role: str, cont: SourceCont) -> None:
        """Remember the continuation of one role. @zara"""
        self._roles[role] = cont

    def snapshot(self) -> dict[str, Any]:
        """JSON-ready source offsets and sum-counter guards. @zara"""
        data: dict[str, Any] = {
            "roles": {
                role: {
                    "entity_id": cont.entity_id,
                    "offset": cont.offset,
                    "published": cont.published,
                    "missing_since": cont.missing_since,
                    "live": cont.live,
                }
                for role, cont in self._roles.items()
            },
            "readings": {
                entity_id: (
                    {
                        "value": reading.value,
                        "day": reading.day,
                        "proven_day": reading.proven_day,
                    }
                    if reading.proven_day is not None
                    else {"value": reading.value, "day": reading.day}
                )
                for entity_id, reading in self.readings.items()
            },
        }
        if self.sum_guards:
            data["sum_guards"] = {
                entity_id: _guard_payload(guard)
                for entity_id, guard in self.sum_guards.items()
            }
        dc_payload = dc_energy.dump_counters(self.dc_energy)
        if dc_payload:
            data["dc_energy"] = dc_payload
        if self.vendor_solar:
            data["vendor_solar"] = sorted(self.vendor_solar)
        if self.solar_days:
            data["solar_days"] = {
                serial: {
                    "day": state.day,
                    "baseline": state.baseline,
                    "last": state.last,
                    "accrued": state.accrued,
                }
                for serial, state in self.solar_days.items()
            }
        battery = dc_energy.dump_counters(self.battery_energy)
        if battery:
            data["battery_energy"] = battery
        for field, items in (
            ("retired_solar", self.retired_solar),
            ("retired_sums", self.retired_sums),
        ):
            if not items:
                continue
            retired = {}
            for key, item in items.items():
                payload = {
                    "serial": item.serial,
                    "entity_id": item.entity_id,
                    "value": item.value,
                    "epoch": item.epoch,
                    "archived": item.archived,
                }
                if item.removed:
                    payload["removed"] = True
                    if item.accepted is not None:
                        payload["accepted"] = item.accepted
                    if item.offset is not None:
                        payload["offset"] = item.offset
                retired[key] = payload
            data[field] = retired
        if self.retired_solar_today:
            data["retired_solar_today"] = {
                key: {
                    "serial": item.serial,
                    "entity_id": item.entity_id,
                    "value": item.value,
                    "day": item.day,
                    "epoch": item.epoch,
                    **({"removed": True} if item.removed else {}),
                }
                for key, item in self.retired_solar_today.items()
            }
        if self.solar_sources:
            data["solar_sources"] = {
                role: sources.copy() for role, sources in self.solar_sources.items()
            }
        if self.non_solar_serials:
            data["non_solar_serials"] = sorted(self.non_solar_serials)
        if self.pending_solar_rebase:
            data["pending_solar_rebase"] = dict(self.pending_solar_rebase)
        return data

    @classmethod
    def from_snapshot(cls, raw: Any) -> SourceTracker:
        """Restore a snapshot written by ``snapshot``. @zara"""
        tracker = cls()
        if not isinstance(raw, dict):
            return tracker
        readings = raw.get("readings")
        if isinstance(readings, dict):
            for entity_id, item in readings.items():
                reading = _parse_reading(entity_id, item)
                if reading is not None:
                    tracker.readings[entity_id] = reading
        guards = raw.get("sum_guards")
        if isinstance(guards, dict):
            for entity_id, item in guards.items():
                guard = _parse_sum_guard(entity_id, item)
                if guard is not None:
                    tracker.sum_guards[entity_id] = guard
        tracker.dc_energy = dc_energy.load_counters(raw.get("dc_energy"))
        tracker.battery_energy = dc_energy.load_counters(raw.get("battery_energy"))
        locked = raw.get("vendor_solar")
        if isinstance(locked, list):
            tracker.vendor_solar = {
                serial for serial in locked if isinstance(serial, str) and serial
            }
        days = raw.get("solar_days")
        if isinstance(days, dict):
            for serial, item in days.items():
                baseline = _parse_solar_day(serial, item)
                if baseline is not None:
                    tracker.solar_days[serial] = baseline
        retired = raw.get("retired_solar")
        if isinstance(retired, dict):
            for key, item in retired.items():
                parsed_retired = _parse_retired_solar(key, item)
                if parsed_retired is not None:
                    tracker.retired_solar[key] = parsed_retired
        tracker.retired_sums = _parse_retired_sums(raw.get("retired_sums"))
        retired_today = raw.get("retired_solar_today")
        if isinstance(retired_today, dict):
            for key, item in retired_today.items():
                parsed_today = _parse_retired_solar_today(key, item)
                if parsed_today is not None:
                    tracker.retired_solar_today[key] = parsed_today
        tracker.solar_sources = _parse_solar_sources(raw.get("solar_sources"))
        non_solar = raw.get("non_solar_serials")
        if isinstance(non_solar, list):
            tracker.non_solar_serials = {
                serial for serial in non_solar if isinstance(serial, str) and serial
            }
        pending = raw.get("pending_solar_rebase")
        if isinstance(pending, dict):
            for serial, epoch in pending.items():
                if (
                    isinstance(serial, str)
                    and serial
                    and isinstance(epoch, int)
                    and not isinstance(epoch, bool)
                    and epoch >= 1
                ):
                    tracker.pending_solar_rebase[serial] = epoch
        roles = raw.get("roles")
        if not isinstance(roles, dict):
            return tracker
        for role, item in roles.items():
            parsed = _parse_source(role, item)
            if parsed is not None:
                tracker._roles[role] = parsed
        return tracker


def _guard_payload(guard: SumGuard) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "accepted": guard.accepted,
        "offset": guard.offset,
    }
    if guard.pending is not None:
        payload["pending"] = guard.pending
    if guard.count:
        payload["count"] = guard.count
    if guard.observed is not None:
        payload["observed"] = guard.observed
    if guard.reported is not None:
        payload["reported"] = guard.reported.isoformat()
    return payload


def _parse_sum_guard(entity_id: Any, item: Any) -> SumGuard | None:
    if not isinstance(entity_id, str) or not isinstance(item, dict):
        return None
    accepted = _finite_number(item.get("accepted"))
    offset = _finite_number(item.get("offset", 0.0))
    if accepted is None or offset is None:
        return None
    pending = None
    if "pending" in item and item.get("pending") is not None:
        pending = _finite_number(item.get("pending"))
        if pending is None:
            return None
    count = item.get("count", 0)
    if isinstance(count, bool) or not isinstance(count, int) or count < 0:
        return None
    observed = None
    if "observed" in item and item.get("observed") is not None:
        observed = _finite_number(item.get("observed"))
        if observed is None:
            return None
    reported = None
    raw_reported = item.get("reported")
    if raw_reported is not None:
        if not isinstance(raw_reported, str):
            return None
        try:
            reported = datetime.fromisoformat(raw_reported)
        except ValueError:
            return None
    return SumGuard(accepted, offset, pending, count, observed, reported)


def _parse_solar_day(serial: Any, item: Any) -> site_daily.DailyBaseline | None:
    """Restore one device-total day baseline. Broken items are dropped. @zara"""
    if not isinstance(serial, str) or not serial or not isinstance(item, dict):
        return None
    day = item.get("day")
    if not isinstance(day, str):
        return None
    try:
        datetime.fromisoformat(day)
    except ValueError:
        return None
    last = _finite_number(item.get("last"))
    if last is None:
        return None
    baseline = item.get("baseline")
    if baseline is not None:
        baseline = _finite_number(baseline)
        if baseline is None:
            return None
    accrued = _finite_number(item.get("accrued"))
    if accrued is None:
        accrued = 0.0
    return site_daily.DailyBaseline(day, baseline, last, max(0.0, accrued))


def _parse_reading(entity_id: Any, item: Any) -> LastReading | None:
    if not isinstance(entity_id, str) or not isinstance(item, dict):
        return None
    value = item.get("value")
    day = item.get("day")
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if not math.isfinite(value) or not isinstance(day, str):
        return None
    raw_proven = item.get("proven_day")
    proven_day: str | None = None
    if isinstance(raw_proven, str):
        candidate = raw_proven.strip()
        if len(candidate) == 10:
            try:
                date.fromisoformat(candidate)
            except ValueError:
                proven_day = None
            else:
                proven_day = candidate
    return LastReading(float(value), day, proven_day=proven_day)


def _parse_source(role: Any, item: Any) -> SourceCont | None:
    if not isinstance(role, str) or not contract.continues_total(role):
        return None
    if not isinstance(item, dict):
        return None
    entity_id = item.get("entity_id")
    offset = item.get("offset")
    if not isinstance(entity_id, str) or isinstance(offset, bool):
        return None
    try:
        offset_value = float(offset)
    except (TypeError, ValueError):
        return None
    published = item.get("published")
    if published is not None:
        try:
            published = float(published)
        except (TypeError, ValueError):
            return None
    missing = item.get("missing_since")
    if missing is not None and not isinstance(missing, str):
        return None
    live = item.get("live", True)
    if not isinstance(live, bool):
        live = True
    return SourceCont(entity_id, offset_value, published, missing, live)


class SiteSources:
    """Persisted source offsets of one installation. @zara"""

    def __init__(self, tracker: SourceTracker, store: Store | None = None) -> None:
        """Keep the tracker and the store that reloads it after a restart. @zara"""
        self.tracker = tracker
        self._store = store
        # Runtime only. A stored continuation is never replaced from here.
        self.seeds: dict[str, float | None] = {}
        # Runtime only: a held power is worthless after a restart.
        self.power_seen: dict[str, LastReading] = {}
        self._readings_pending = False

    def forget_installation(self) -> None:
        """Clear stored and runtime source state for the installation. @zara"""
        self.tracker = SourceTracker()
        self.seeds.clear()
        self.power_seen.clear()

    def save(self) -> None:
        """Persist the tracker when a store is attached. @zara"""
        if self._store is not None:
            self._store.async_delay_save(self._snapshot, 1.0)

    def save_readings(self) -> None:
        """Persist counter readings once per delay, not on every update. @zara"""
        if self._store is None or self._readings_pending:
            return
        self._readings_pending = True
        self._store.async_delay_save(self._snapshot, READINGS_SAVE_DELAY)

    def _snapshot(self) -> dict[str, Any]:
        self._readings_pending = False
        return self.tracker.snapshot()

    async def async_save_now(self) -> None:
        """Persist tracker state immediately for crash-safe mode transitions. @zara"""
        if self._store is None:
            return
        self._readings_pending = False
        await self._store.async_save(self.tracker.snapshot())


def _parse_retired_sums(raw: Any) -> dict[str, RetiredSolar]:
    """Restore kept battery totals; other roles and invalid items are skipped. @zara"""
    if not isinstance(raw, dict):
        return {}
    kept: dict[str, RetiredSolar] = {}
    for key, item in raw.items():
        parsed = contract.parse_unique_id(key)
        if parsed is None or parsed.get("role") not in _BATTERY_TOTAL_ROLES:
            continue
        retired = _parse_retired_solar(key, item)
        if retired is not None:
            kept[key] = retired
    return kept


def _parse_solar_sources(raw: Any) -> dict[str, dict[str, str]]:
    """Restore the stored solar and battery sources per role. @zara"""
    if not isinstance(raw, dict):
        return {}
    parsed: dict[str, dict[str, str]] = {}
    for role in _KEPT_ROLES:
        sources = raw.get(role)
        if not isinstance(sources, dict):
            continue
        known = {
            unique_id: entity_id
            for unique_id, entity_id in sources.items()
            if isinstance(unique_id, str)
            and unique_id
            and isinstance(entity_id, str)
            and entity_id
        }
        if known:
            parsed[role] = known
    return parsed


def _parse_retired_solar(key: Any, raw: Any) -> RetiredSolar | None:
    if not isinstance(key, str) or not key or not isinstance(raw, dict):
        return None
    serial = raw.get("serial")
    entity_id = raw.get("entity_id", "")
    value = _finite_number(raw.get("value"))
    epoch = raw.get("epoch", 1)
    archived = raw.get("archived", False)
    if (
        not isinstance(serial, str)
        or not serial
        or not isinstance(entity_id, str)
        or value is None
        or value < 0
        or isinstance(epoch, bool)
        or not isinstance(epoch, int)
        or epoch < 1
        or not isinstance(archived, bool)
    ):
        return None
    removed = raw.get("removed") is True
    return RetiredSolar(
        serial,
        entity_id,
        value,
        epoch,
        archived,
        removed=removed,
        accepted=_finite_number(raw.get("accepted")) if removed else None,
        offset=_finite_number(raw.get("offset")) if removed else None,
    )


def _parse_retired_solar_today(key: Any, raw: Any) -> RetiredSolarToday | None:
    if not isinstance(key, str) or not key or not isinstance(raw, dict):
        return None
    serial = raw.get("serial")
    entity_id = raw.get("entity_id", "")
    value = _finite_number(raw.get("value"))
    day = raw.get("day")
    epoch = raw.get("epoch", 1)
    if (
        not isinstance(serial, str)
        or not serial
        or not isinstance(entity_id, str)
        or value is None
        or value < 0
        or not isinstance(day, str)
        or not day
        or isinstance(epoch, bool)
        or not isinstance(epoch, int)
        or epoch < 1
    ):
        return None
    return RetiredSolarToday(
        serial, entity_id, value, day, epoch, removed=raw.get("removed") is True
    )


async def _ensure_site_sources_safe(hass: HomeAssistant | None) -> SiteSources | None:
    if hass is None:
        return None
    data = getattr(hass, "data", None)
    if not isinstance(data, dict):
        return None
    holder = data.get(_SITE_SOURCES)
    if isinstance(holder, SiteSources):
        return holder
    if getattr(hass, "config", None) is None:
        holder = SiteSources(SourceTracker())
        data[_SITE_SOURCES] = holder
        return holder
    return await ensure_site_sources(hass)


_PROVEN_DAY_ATTRS = ("sinv_production_day", "production_day")


def _state_proven_local_day(state: Any) -> str | None:
    """Return the proven local YYYY-MM-DD production day of a state, or None. @zara

    Never relies on ``last_updated`` or ``last_changed`` because a restored or
    unreset daily state can carry today's timestamp with yesterday's energy.
    """
    if state is None:
        return None
    attrs = getattr(state, "attributes", None)
    if not isinstance(attrs, Mapping):
        return None
    for attr in _PROVEN_DAY_ATTRS:
        raw = attrs.get(attr)
        if isinstance(raw, str):
            candidate = raw.strip()
            if len(candidate) == 10:
                try:
                    date.fromisoformat(candidate)
                except ValueError:
                    pass
                else:
                    return candidate
    raw_reset = attrs.get("last_reset")
    if isinstance(raw_reset, datetime) and raw_reset.tzinfo is not None:
        return site_daily.local_day(dt_util.as_local(raw_reset))
    if isinstance(raw_reset, str) and raw_reset.strip():
        try:
            parsed = datetime.fromisoformat(raw_reset.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is not None:
            return site_daily.local_day(dt_util.as_local(parsed))
    return None


def _resolve_retire_today_kwh(
    hass: HomeAssistant | None,
    tracker: SourceTracker,
    serial: str,
    today_entity: str,
    local_day: str,
) -> float | None:
    """Resolve same-day PV energy for retirement only from day-proven sources. @zara"""
    if (
        today_entity
        and hass is not None
        and getattr(hass, "states", None) is not None
    ):
        today_state = hass.states.get(today_entity)
        if _state_proven_local_day(today_state) == local_day:
            raw_today = _float(today_state)
            if raw_today is not None and math.isfinite(raw_today) and raw_today >= 0:
                return raw_today
    if today_entity:
        reading_today = tracker.readings.get(today_entity)
        if (
            reading_today is not None
            and reading_today.proven_day == local_day
            and math.isfinite(reading_today.value)
            and reading_today.value >= 0
        ):
            return reading_today.value
    day_baseline = tracker.solar_days.get(serial) or tracker.solar_days.get(
        serial.lower()
    )
    if (
        day_baseline is not None
        and day_baseline.day == local_day
        and day_baseline.baseline is not None
        and day_baseline.last is not None
    ):
        derived_today = max(
            0.0,
            day_baseline.accrued
            + max(0.0, day_baseline.last - day_baseline.baseline),
        )
        if math.isfinite(derived_today):
            return derived_today
    dc_counter = tracker.dc_energy.get(serial) or tracker.dc_energy.get(
        serial.lower()
    )
    if (
        dc_counter is not None
        and dc_counter.day == local_day
        and math.isfinite(dc_counter.today)
        and dc_counter.today >= 0
    ):
        return dc_counter.today
    return None


def _drop_solar_day(tracker: SourceTracker, serial: str) -> bool:
    """Remove the day baseline of a serial in any spelling; True when one existed. @zara"""
    wanted = serial.lower()
    stale = [key for key in tracker.solar_days if key.lower() == wanted]
    for key in stale:
        del tracker.solar_days[key]
    return bool(stale)


def _remember_non_solar(tracker: SourceTracker, serial: str) -> bool:
    wanted = serial.lower()
    if any(stored.lower() == wanted for stored in tracker.non_solar_serials):
        return False
    tracker.non_solar_serials.add(serial)
    return True


async def async_mark_non_solar(hass: HomeAssistant | None, serial: str) -> None:
    """Record a non-solar serial and discard its stale PV day baseline. @zara"""
    if not serial:
        return
    holder = await _ensure_site_sources_safe(hass)
    if holder is None:
        return
    changed = _remember_non_solar(holder.tracker, serial)
    if _drop_solar_day(holder.tracker, serial) or changed:
        await holder.async_save_now()


async def async_retire_solar_source(
    hass: HomeAssistant | None,
    entry: ConfigEntry | None,
    serial: str,
    entity_id: str | None = None,
) -> float | None:
    """Idempotently freeze a source's PV total and same-day share before non_solar. @zara"""
    if not serial:
        return None
    holder = await _ensure_site_sources_safe(hass)
    if holder is None:
        return None
    registry = None
    if hass is not None:
        try:
            registry = er.async_get(hass)
        except (AttributeError, KeyError, TypeError, ValueError):
            registry = None
    changed = _remember_non_solar(holder.tracker, serial)
    key = contract.role_unique_id(serial, "energy_solar_total")
    existing = holder.tracker.retired_solar.get(key)
    retired_total: float | None = existing.value if existing is not None else None
    if existing is not None and existing.removed:
        holder.tracker.retired_solar[key] = replace(
            existing, removed=False, accepted=None, offset=None
        )
        changed = True
    elif existing is None:
        resolved_entity = entity_id or ""
        if not resolved_entity and registry is not None:
            resolved_entity = (
                registry.async_get_entity_id("sensor", DOMAIN, key) or ""
            )
        value: float | None = None
        if resolved_entity:
            guard = holder.tracker.sum_guards.get(resolved_entity)
            if guard is not None:
                value = guard.contribution
            elif (reading := holder.tracker.readings.get(resolved_entity)) is not None:
                value = reading.value
            elif hass is not None and getattr(hass, "states", None) is not None:
                raw = _float(hass.states.get(resolved_entity))
                if raw is not None and raw >= 0:
                    value = raw
        if value is not None and math.isfinite(value) and value >= 0:
            next_epoch = (
                max(
                    (
                        item.epoch
                        for item in holder.tracker.retired_solar.values()
                        if item.serial == serial
                    ),
                    default=0,
                )
                + 1
            )
            holder.tracker.pending_solar_rebase.pop(serial, None)
            holder.tracker.retired_solar[key] = RetiredSolar(
                serial=serial,
                entity_id=resolved_entity,
                value=float(value),
                epoch=next_epoch,
                archived=False,
            )
            if resolved_entity:
                holder.tracker.sum_guards.pop(resolved_entity, None)
                holder.tracker.readings.pop(resolved_entity, None)
            retired_total = float(value)
            changed = True

    today_key = contract.role_unique_id(serial, "energy_solar_today")
    existing_today = holder.tracker.retired_solar_today.get(today_key)
    if existing_today is not None and existing_today.removed:
        holder.tracker.retired_solar_today[today_key] = replace(
            existing_today, removed=False
        )
        changed = True
    elif existing_today is None:
        today_entity = (
            registry.async_get_entity_id("sensor", DOMAIN, today_key) or ""
            if registry is not None
            else ""
        )
        local_day = installation_local_day()
        today_value = _resolve_retire_today_kwh(
            hass, holder.tracker, serial, today_entity, local_day
        )
        if today_value is not None and math.isfinite(today_value) and today_value >= 0:
            today_epoch = (
                max(
                    (
                        item.epoch
                        for item in holder.tracker.retired_solar_today.values()
                        if item.serial == serial
                    ),
                    default=0,
                )
                + 1
            )
            holder.tracker.retired_solar_today[today_key] = RetiredSolarToday(
                serial=serial,
                entity_id=today_entity,
                value=float(today_value),
                day=local_day,
                epoch=today_epoch,
            )
            if today_entity:
                holder.tracker.readings.pop(today_entity, None)
            changed = True

    # The counter keeps rising with battery energy, so the PV baseline must not survive.
    if _drop_solar_day(holder.tracker, serial):
        changed = True
    if changed:
        await holder.async_save_now()
    return retired_total


async def async_prepare_solar_rebase(
    hass: HomeAssistant | None, serial: str
) -> None:
    """Archive retired PV history and arm a 0-based rebase for explicit PV re-setup. @zara"""
    if not serial:
        return
    holder = await _ensure_site_sources_safe(hass)
    if holder is None:
        return
    key = contract.role_unique_id(serial, "energy_solar_total")
    today_key = contract.role_unique_id(serial, "energy_solar_today")
    retired = holder.tracker.retired_solar.get(key)
    retired_today = holder.tracker.retired_solar_today.get(today_key)
    wanted = serial.lower()
    markers = {
        stored for stored in holder.tracker.non_solar_serials if stored.lower() == wanted
    }
    if not markers:
        if retired is not None and retired.removed:
            retired = None
        if retired_today is not None and retired_today.removed:
            retired_today = None
        if retired is None and retired_today is None:
            return
    _drop_solar_day(holder.tracker, serial)
    if retired is not None:
        archive_key = f"{key}#e{retired.epoch}"
        holder.tracker.retired_solar[archive_key] = RetiredSolar(
            serial=retired.serial,
            entity_id=retired.entity_id,
            value=retired.value,
            epoch=retired.epoch,
            archived=True,
        )
        holder.tracker.retired_solar.pop(key, None)
        if retired.entity_id:
            holder.tracker.sum_guards.pop(retired.entity_id, None)
            holder.tracker.readings.pop(retired.entity_id, None)
        epoch = retired.epoch
    else:
        epoch = max(
            (
                item.epoch
                for item in holder.tracker.retired_solar.values()
                if item.serial.lower() == wanted and (markers or not item.removed)
            ),
            default=0,
        )
    holder.tracker.pending_solar_rebase[serial] = epoch + 1
    holder.tracker.non_solar_serials.difference_update(markers)
    if retired_today is not None:
        holder.tracker.retired_solar_today.pop(today_key, None)
        if retired_today.entity_id:
            holder.tracker.readings.pop(retired_today.entity_id, None)
    if hass is not None:
        try:
            registry = er.async_get(hass)
        except (AttributeError, KeyError, TypeError, ValueError):
            registry = None
        if registry is not None:
            current_eid = registry.async_get_entity_id("sensor", DOMAIN, key)
            if current_eid:
                holder.tracker.sum_guards.pop(current_eid, None)
                holder.tracker.readings.pop(current_eid, None)
            current_today_eid = registry.async_get_entity_id(
                "sensor", DOMAIN, today_key
            )
            if current_today_eid:
                holder.tracker.readings.pop(current_today_eid, None)
    await holder.async_save_now()


async def ensure_site_sources(hass: HomeAssistant) -> SiteSources:
    """Load the installation source-offset store once. @zara"""
    holder = hass.data.get(_SITE_SOURCES)
    if isinstance(holder, SiteSources):
        return holder
    store: Store = Store(hass, 1, _SITE_SOURCES)
    holder = SiteSources(SourceTracker.from_snapshot(await store.async_load()), store)
    hass.data[_SITE_SOURCES] = holder
    return holder


async def ensure_site_daily(hass: HomeAssistant) -> SiteDaily:
    """Load the installation baseline store once. @zara"""
    holder = hass.data.get(_SITE_DAILY)
    if isinstance(holder, SiteDaily):
        return holder
    store: Store = Store(hass, 1, _SITE_DAILY)
    holder = SiteDaily(
        site_daily.DailyTracker.from_snapshot(await store.async_load()), store
    )
    hass.data[_SITE_DAILY] = holder
    return holder


def _device_facts(hass: HomeAssistant, entry):
    """Return the part number and registry identifiers of the entity's device. @zara"""
    device_id = getattr(entry, "device_id", None)
    if not device_id:
        return None
    device = dr.async_get(hass).async_get(device_id)
    if device is None:
        return None
    return device.model_id, device.identifiers


def _config_entries(
    hass: HomeAssistant | None, *, include_disabled: bool = False
) -> list[ConfigEntry]:
    config_entries = getattr(hass, "config_entries", None)
    getter = getattr(config_entries, "async_entries", None)
    if not callable(getter):
        return []
    try:
        return list(getter(DOMAIN, include_disabled=include_disabled))
    except TypeError:
        return [
            entry
            for entry in getter(DOMAIN)
            if include_disabled or getattr(entry, "disabled_by", None) is None
        ]


def non_solar_entry_ids(hass: HomeAssistant | None) -> set[str]:
    """Active config entries locked to non-solar AC mode. @zara"""
    return {
        entry.entry_id
        for entry in _config_entries(hass, include_disabled=False)
        if isinstance(getattr(entry, "data", None), Mapping)
        and entry.data.get(CONF_AC_SOURCE) == AC_SOURCE_NON_SOLAR
    }


def _entry_serial(entry: ConfigEntry) -> str:
    raw_data = getattr(entry, "data", None)
    data = raw_data if isinstance(raw_data, Mapping) else {}
    raw = data.get("device_serial")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    unique_id = getattr(entry, "unique_id", None)
    if isinstance(unique_id, str) and "_" in unique_id:
        return unique_id.split("_", 1)[1].strip()
    return ""


def collect_ac_inputs(entities) -> dict[str, Source]:
    """Separately measured vendor AC input power entities keyed by device serial. @zara"""
    inputs: dict[str, Source] = {}
    for entry in entities:
        if entry.platform != DOMAIN or entry.disabled_by is not None:
            continue
        parsed = contract.parse_unique_id(entry.unique_id)
        if (
            not parsed
            or parsed.get("key") != "grid_input_power"
            or parsed["serial"] == contract.SITE_SERIAL
        ):
            continue
        serial = parsed["serial"]
        inputs[serial] = Source(
            entry.entity_id,
            serial,
            0,
            getattr(entry, "config_entry_id", None) or "",
        )
    return inputs


def _battery_serials_by_entry(
    all_sources: dict[str, list[Source]],
) -> dict[str, str]:
    """Return active battery serial -> config_entry_id from enabled sources. @zara"""
    result: dict[str, str] = {}
    for role, items in all_sources.items():
        if not site_daily.battery_present((role,)):
            continue
        for source in items:
            result.setdefault(source.serial, source.entry_id)
    return result


def storage_candidates(
    hass: HomeAssistant | None, *, exclude_entry_id: str | None = None
) -> dict[str, str]:
    """Active S-INV storage devices selectable as AC source for an EZ1 _b. @zara"""
    if hass is None:
        return {}
    try:
        registry = er.async_get(hass)
    except (AttributeError, KeyError, TypeError, ValueError):
        return {}
    active_entries = {
        entry.entry_id: entry
        for entry in _config_entries(hass, include_disabled=False)
    }
    sources = collect_sources(
        registry.entities.values(),
        lambda item: _device_facts(hass, item),
        non_solar_entries=non_solar_entry_ids(hass),
    )
    devices_reg = None
    try:
        devices_reg = dr.async_get(hass)
    except (AttributeError, KeyError, TypeError, ValueError):
        devices_reg = None
    candidates: dict[str, str] = {}
    for serial, entry_id in sorted(_battery_serials_by_entry(sources).items()):
        if exclude_entry_id and entry_id == exclude_entry_id:
            continue
        if entry_id and entry_id not in active_entries:
            continue
        label = serial
        if devices_reg is not None:
            device = next(
                (
                    dev
                    for dev in devices_reg.devices.values()
                    if (DOMAIN, serial) in dev.identifiers
                ),
                None,
            )
            if device is not None and (device.name_by_user or device.name):
                label = f"{device.name_by_user or device.name} ({serial})"
        elif entry_id in active_entries and active_entries[entry_id].title:
            label = f"{active_entries[entry_id].title} ({serial})"
        candidates[serial] = label
    return candidates


def evaluate_topology(
    hass: HomeAssistant | None,
    all_sources: dict[str, list[Source]],
    ac_inputs: dict[str, Source] | None = None,
) -> TopologyPlan:
    """Evaluate non-solar AC inverters, confirmed storage links and unresolved targets. @zara"""
    entries = _config_entries(hass, include_disabled=False)
    if not entries:
        return TopologyPlan()
    active_by_id = {entry.entry_id: entry for entry in entries}
    non_solar_entries = [
        entry
        for entry in entries
        if isinstance(getattr(entry, "data", None), Mapping)
        and entry.data.get(CONF_AC_SOURCE) == AC_SOURCE_NON_SOLAR
    ]
    if not non_solar_entries:
        return TopologyPlan()
    battery_map = _battery_serials_by_entry(all_sources)
    ac_net_serials = {source.serial for source in all_sources.get("power_ac_net", [])}
    ac_input_map = ac_inputs or {}
    # Detect duplicate storage targets across active non-solar entries
    target_counts: dict[str, int] = {}
    for entry in non_solar_entries:
        target = entry.data.get(CONF_AC_SOURCE_STORAGE)
        if (
            isinstance(target, str)
            and target
            and target != AC_SOURCE_STORAGE_NONE
        ):
            target_counts[target] = target_counts.get(target, 0) + 1

    non_solar_ids: set[str] = set()
    non_solar_serials: set[str] = set()
    confirmed: list[LinkedStoragePair] = []
    unresolved: set[str] = set()
    resolved: set[str] = set()

    for entry in non_solar_entries:
        non_solar_ids.add(entry.entry_id)
        ez1_serial = _entry_serial(entry)
        if not ez1_serial:
            for items in all_sources.values():
                for source in items:
                    if source.entry_id == entry.entry_id:
                        ez1_serial = source.serial
                        break
                if ez1_serial:
                    break
        if ez1_serial:
            non_solar_serials.add(ez1_serial)
        target = entry.data.get(CONF_AC_SOURCE_STORAGE)
        foreign_batteries = {
            serial
            for serial, b_entry_id in battery_map.items()
            if b_entry_id != entry.entry_id
            and (not b_entry_id or b_entry_id in active_by_id)
        }
        if target is None or target == "":
            if foreign_batteries:
                unresolved.add(entry.entry_id)
            else:
                resolved.add(entry.entry_id)
            continue
        if target == AC_SOURCE_STORAGE_NONE:
            resolved.add(entry.entry_id)
            continue
        if not isinstance(target, str):
            unresolved.add(entry.entry_id)
            continue
        if target_counts.get(target, 0) > 1:
            unresolved.add(entry.entry_id)
            continue
        if target not in foreign_batteries or target == ez1_serial:
            unresolved.add(entry.entry_id)
            continue
        storage_entry_id = battery_map[target]
        storage_entry = active_by_id.get(storage_entry_id)
        storage_vendor = (
            storage_entry.data.get(CONF_VENDOR)
            if storage_entry is not None and isinstance(storage_entry.data, Mapping)
            else None
        )
        ac_in_source = ac_input_map.get(target)
        requires_ac_in = (
            ac_in_source is not None
            or target in ac_net_serials
            or storage_vendor == "zendure"
        )
        confirmed.append(
            LinkedStoragePair(
                ez1_entry_id=entry.entry_id,
                ez1_serial=ez1_serial,
                storage_serial=target,
                storage_entry_id=storage_entry_id,
                storage_ac_in_entity_id=(
                    ac_in_source.entity_id if ac_in_source is not None else None
                ),
                requires_ac_in=requires_ac_in,
            )
        )
        resolved.add(entry.entry_id)

    return TopologyPlan(
        has_non_solar_ac=True,
        non_solar_entry_ids=frozenset(non_solar_ids),
        non_solar_serials=frozenset(non_solar_serials),
        confirmed_pairs=tuple(confirmed),
        linked_storage_serials=frozenset(pair.storage_serial for pair in confirmed),
        linked_storage_entry_ids=frozenset(
            pair.storage_entry_id for pair in confirmed if pair.storage_entry_id
        ),
        unresolved_entry_ids=frozenset(unresolved),
        resolved_entry_ids=frozenset(resolved),
    )


def _sync_topology_issues(
    hass: HomeAssistant | None, topology: TopologyPlan
) -> None:
    """Create or clear repair issues for unresolved EZ1 storage links. @zara"""
    if hass is None or getattr(hass, "data", None) is None:
        return
    entries = {
        entry.entry_id: entry
        for entry in _config_entries(hass, include_disabled=True)
    }
    try:
        for entry_id in topology.unresolved_entry_ids:
            entry = entries.get(entry_id)
            name = entry.title if entry is not None else entry_id
            ir.async_create_issue(
                hass,
                DOMAIN,
                f"apsystems_storage_unresolved_{entry_id}",
                is_fixable=False,
                is_persistent=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key="apsystems_storage_unresolved",
                translation_placeholders={"name": name},
            )
        for entry_id in topology.resolved_entry_ids:
            ir.async_delete_issue(
                hass, DOMAIN, f"apsystems_storage_unresolved_{entry_id}"
            )
        for entry_id, entry in entries.items():
            if entry_id not in topology.unresolved_entry_ids and (
                entry.disabled_by is not None
                or entry.data.get(CONF_AC_SOURCE) != AC_SOURCE_NON_SOLAR
            ):
                ir.async_delete_issue(
                    hass, DOMAIN, f"apsystems_storage_unresolved_{entry_id}"
                )
    except (AttributeError, KeyError, TypeError, ValueError):
        return


def collect_sources(
    entities,
    device_of=None,
    *,
    non_solar_entries: set[str] | None = None,
) -> dict[str, list[Source]]:
    """Device entities per role with a system entity, ordered by device index. @zara"""
    sources: dict[str, list[Source]] = {}
    for entry in entities:
        if entry.platform != DOMAIN or entry.disabled_by is not None:
            continue
        parsed = contract.parse_unique_id(entry.unique_id)
        if (
            not parsed
            or not parsed.get("role")
            or parsed["serial"] == contract.SITE_SERIAL
        ):
            continue
        role = parsed["role"]
        entry_id = getattr(entry, "config_entry_id", None) or ""
        if non_solar_entries and entry_id in non_solar_entries:
            split = contract.split_role(role)
            if split is not None and split[0].base in contract.SOLAR_ROLE_BASES:
                continue
        if (
            not contract.has_system_entity(role)
            and role not in contract.BALANCE_SOURCE_BASES
        ):
            continue
        match = _INDEX.match(entry.entity_id.split(".", 1)[1])
        index = int(match.group(1)) if match else 99
        model_id, identifiers = (None, None)
        if device_of is not None:
            facts = device_of(entry)
            if facts:
                model_id, identifiers = facts
        priority = (
            grid_energy_priority(model_id=model_id, identifiers=identifiers)
            if role in GRID_ENERGY_ROLES
            else 0
        )
        sources.setdefault(role, []).append(
            Source(
                entry.entity_id,
                parsed["serial"],
                index,
                getattr(entry, "config_entry_id", None) or "",
                priority,
            )
        )
    for role, items in sources.items():
        items.sort(
            key=lambda source, role=role: (
                -source.priority if contract.continues_total(role) else 0,
                source.index,
                source.entity_id,
            )
        )
    if (
        "power_grid" not in sources
        and "power_grid_import" in sources
        and "power_grid_export" in sources
    ):
        sources["power_grid"] = [
            *sources.get("power_grid_import", [])[:1],
            *sources.get("power_grid_export", [])[:1],
        ]
    return sources


def _float(state: Any) -> float | None:
    try:
        return float(state.state)
    except (AttributeError, TypeError, ValueError):
        return None


def _onoff(state: Any) -> bool | None:
    value = getattr(state, "state", None)
    if value == "on":
        return True
    if value == "off":
        return False
    return None


@callback
def async_ensure_site_entry(hass: HomeAssistant) -> None:
    """Create the installation entry once, when the first device instance starts. @zara"""
    if any(
        entry.unique_id == SITE_UNIQUE_ID
        for entry in hass.config_entries.async_entries(DOMAIN, include_ignore=True)
    ) or hass.data.get(_FLOW_STARTED):
        return
    hass.data[_FLOW_STARTED] = True
    hass.async_create_task(
        hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_SYSTEM}, data={CONF_VENDOR: VENDOR_SITE}
        )
    )


def _keeps_inverter_site(entry: ConfigEntry) -> bool:
    """Return True for an inverter instance. Heat-pump entries do not count. @zara"""
    vendor = entry.data.get(CONF_VENDOR)
    return (
        vendor != VENDOR_SITE
        and vendor != VENDOR_HP
        and not is_hp_device_vendor(vendor)
    )


def has_inverter_instance(hass: HomeAssistant) -> bool:
    """Return whether an inverter config entry still exists. @zara"""
    return any(
        _keeps_inverter_site(entry)
        for entry in hass.config_entries.async_entries(DOMAIN, include_ignore=False)
    )


def _keep_removed_solar_source(
    tracker: SourceTracker, role: str, serial: str, entity_id: str
) -> None:
    reading = tracker.readings.pop(entity_id, None)
    guard = tracker.sum_guards.pop(entity_id, None)
    key = contract.role_unique_id(serial, role)
    if role in _BATTERY_TOTAL_ROLES:
        if reading is not None:
            value = reading.value
        elif guard is not None:
            value = guard.contribution
        else:
            return
        if math.isfinite(value) and value >= 0:
            tracker.retired_sums[key] = RetiredSolar(
                serial,
                entity_id,
                value,
                removed=True,
                accepted=guard.accepted if guard is not None else None,
                offset=guard.offset if guard is not None else None,
            )
        return
    is_total = role == "energy_solar_total"
    retired = tracker.retired_solar if is_total else tracker.retired_solar_today
    existing = retired.get(key)
    if existing is not None and not existing.removed:
        return
    day = installation_local_day() if not is_total else ""
    if reading is not None and (is_total or reading.day == day):
        value = reading.value
    elif is_total and guard is not None:
        value = guard.contribution
    else:
        return
    if not math.isfinite(value) or value < 0:
        return
    if existing is not None:
        epoch = existing.epoch
    else:
        wanted = serial.lower()
        epoch = 1 + max(
            (item.epoch for item in retired.values() if item.serial.lower() == wanted),
            default=0,
        )
    if is_total:
        tracker.retired_solar[key] = RetiredSolar(
            serial,
            entity_id,
            value,
            epoch,
            removed=True,
            accepted=guard.accepted if guard is not None else None,
            offset=guard.offset if guard is not None else None,
        )
    else:
        tracker.retired_solar_today[key] = RetiredSolarToday(
            serial, entity_id, value, day, epoch, removed=True
        )


def keep_removed_solar(
    hass: HomeAssistant, holder: SiteSources, all_sources: dict[str, list[Source]]
) -> bool:
    """Keep contributions of removed sources and move readings on rename. @zara"""
    tracker = holder.tracker
    current = {
        role: {
            contract.role_unique_id(source.serial, role): source.entity_id
            for source in all_sources[role]
        }
        for role in _KEPT_ROLES
        if all_sources.get(role)
    }
    if current == tracker.solar_sources:
        return False

    if tracker.solar_sources:
        try:
            keeps_site = has_inverter_instance(hass)
        except (AttributeError, KeyError, TypeError, ValueError):
            keeps_site = False
        registry = er.async_get(hass)
        moved_guards: dict[str, SumGuard] = {}
        moved_readings: dict[str, LastReading] = {}
        for role, known in tracker.solar_sources.items():
            active = current.get(role, {})
            for unique_id, entity_id in known.items():
                now = registry.async_get_entity_id("sensor", DOMAIN, unique_id)
                entry = registry.entities.get(now) if now is not None else None
                if now is None or getattr(entry, "disabled_by", None) is not None:
                    if not keeps_site:
                        continue
                    parsed = contract.parse_unique_id(unique_id)
                    if parsed and parsed.get("role") == role and parsed["serial"]:
                        _keep_removed_solar_source(
                            tracker, role, parsed["serial"], entity_id
                        )
                elif now != entity_id and active.get(unique_id) == now:
                    guard = tracker.sum_guards.pop(entity_id, None)
                    reading = tracker.readings.pop(entity_id, None)
                    if guard is not None:
                        moved_guards[now] = guard
                    if reading is not None:
                        moved_readings[now] = reading
        tracker.sum_guards.update(moved_guards)
        tracker.readings.update(moved_readings)

    tracker.solar_sources = current
    return True


async def _async_forget_stored_installation(
    hass: HomeAssistant, *, sources: bool, daily: bool
) -> None:
    """Reset and save the installation stores that were not loaded. @zara"""
    if sources:
        holder = await ensure_site_sources(hass)
        holder.forget_installation()
        await holder.async_save_now()
    if daily:
        daily_holder = await ensure_site_daily(hass)
        if daily_holder.tracker.forget_installation():
            await daily_holder.async_save_now()


@callback
def async_remove_unused_site_entry(hass: HomeAssistant, removed: ConfigEntry) -> None:
    """Remove the installation entry together with the last device instance. @zara

    Called after ``removed`` left ``hass.config_entries``. Disabled device
    instances still count, so the installation stays while any instance exists.
    Heat-pump entries do not keep or remove this installation.
    """
    keeps_site = has_inverter_instance(hass)
    if removed.data.get(CONF_VENDOR) != VENDOR_SITE and keeps_site:
        return
    entries = hass.config_entries.async_entries(DOMAIN, include_ignore=False)
    if not keeps_site and _keeps_inverter_site(removed):
        holder = hass.data.get(_SITE_SOURCES)
        daily_holder = hass.data.get(_SITE_DAILY)
        has_sources = isinstance(holder, SiteSources)
        has_daily = isinstance(daily_holder, SiteDaily)
        if has_sources:
            holder.forget_installation()
            holder.save()
        if has_daily and daily_holder.tracker.forget_installation():
            daily_holder.save()
        if not has_sources or not has_daily:
            hass.async_create_task(
                _async_forget_stored_installation(
                    hass, sources=not has_sources, daily=not has_daily
                )
            )
    # a later first instance creates the installation entry again
    hass.data.pop(_FLOW_STARTED, None)
    for entry in entries:
        if entry.unique_id == SITE_UNIQUE_ID:
            hass.async_create_task(hass.config_entries.async_remove(entry.entry_id))


def site_device_info() -> DeviceInfo:
    """Device of the installation. @zara"""
    return DeviceInfo(
        identifiers={(DOMAIN, contract.SITE_SERIAL)},
        translation_key="site",
        manufacturer="S-INV",
        model="Installation",
    )


async def async_setup_site_entities(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    domain: str,
) -> None:
    """Create system entities for roles with device sources, now and when new ones appear. @zara"""
    if domain == "sensor":
        await ensure_site_daily(hass)
        await ensure_site_sources(hass)
    async_convert_draft_system_entries(hass)
    async_reclaim_system_ids(hass)
    registry = er.async_get(hass)
    known: set[str] = set()

    @callback
    def refresh(_event: Event | None = None) -> None:
        non_solar = non_solar_entry_ids(hass)
        sources = collect_sources(
            registry.entities.values(),
            lambda item: _device_facts(hass, item),
            non_solar_entries=non_solar,
        )
        ac_inputs = collect_ac_inputs(registry.entities.values())
        topology = evaluate_topology(hass, sources, ac_inputs)
        _sync_topology_issues(hass, topology)
        holder = hass.data.get(_SITE_SOURCES) if isinstance(getattr(hass, "data", None), dict) else None
        has_retired = bool(
            isinstance(holder, SiteSources) and holder.tracker.retired_solar
        )
        today = installation_local_day()
        has_retired_today = bool(
            isinstance(holder, SiteSources)
            and any(
                item.day == today
                for item in holder.tracker.retired_solar_today.values()
            )
        )
        existing: set[str] = set()
        # system entries converted from first-draft ids still belong to the device
        # entry until this entry adopts them, so the whole registry is scanned
        for item in registry.entities.values():
            parsed = (
                contract.parse_unique_id(item.unique_id)
                if item.platform == DOMAIN
                else None
            )
            if (
                parsed
                and parsed.get("role")
                and parsed["serial"] == contract.SITE_SERIAL
            ):
                existing.add(parsed["role"])
        roles = (
            sensor_roles(
                sources,
                existing,
                topology=topology,
                has_retired_solar=has_retired,
                has_retired_solar_today=has_retired_today,
            )
            if domain == "sensor"
            else set(sources) | existing
        )
        new: list[Any] = []
        if domain == "sensor" and contract.ROLE_FLOW_STATUS not in known:
            known.add(contract.ROLE_FLOW_STATUS)
            new.append(SiteFlowStatusSensor())
        for role in sorted(roles):
            if (
                role not in known
                and role != contract.ROLE_FLOW_STATUS
                and contract.system_domain(role) == domain
                and contract.has_system_entity(role)
            ):
                known.add(role)
                new.append(
                    (SiteBinarySensor if domain == "binary_sensor" else SiteSensor)(
                        role
                    )
                )
        if new:
            async_add_entities(new)

    refresh()
    entry.async_on_unload(
        hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, refresh)
    )
    entry.async_on_unload(
        async_dispatcher_connect(hass, SIGNAL_SITE_CONFIG_UPDATED, refresh)
    )


class _SiteEntity:
    """Shared behaviour of system entities. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, role: str) -> None:
        """Bind to a role. @zara"""
        spec, channel = contract.split_role(role)
        self.role = role
        self._rule = contract.aggregation(role)
        self._sources: list[Source] = []
        self._capacity: dict[str, str] = {}
        # power_house: net AC sources of generators outside the meter owner's system
        self._balance: list[Source] | None = None
        self._balance_used = False
        self._all_sources: dict[str, list[Source]] = {}
        self._ac_inputs: dict[str, Source] = {}
        self._topology: TopologyPlan = TopologyPlan()
        # device entities whose missing value was replaced in the last read
        self._missing: set[str] = set()
        self._unsub_states = None
        self._unsub_reports = None
        self._unsub_midnight = None
        self._unsub_hold = None
        self._attr_unique_id = contract.system_unique_id(role)
        self._attr_translation_key = f"sinv_{spec.base}"
        self._attr_translation_placeholders = (
            {"nn": f"{channel:02d}"} if channel is not None else {}
        )
        self._attr_device_info = site_device_info()

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Suggest sinv_<role> before core registers the entity. @zara"""
        registry = er.async_get(hass)
        if (
            registry.async_get_entity_id(platform.domain, DOMAIN, self.unique_id)
            is None
        ):
            self.entity_id = f"{platform.domain}.{contract.system_object_id(self.role)}"
        super().add_to_platform_start(hass, platform, parallel_updates)

    async def async_added_to_hass(self) -> None:
        """Follow the device entities of the role. @zara"""
        self._resubscribe()
        self.async_on_remove(
            self.hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._registry_changed
            )
        )
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_SITE_CONFIG_UPDATED, self._registry_changed
            )
        )
        self.async_on_remove(self._unsubscribe)
        self.async_on_remove(self._cancel_midnight)
        self.async_on_remove(self._cancel_hold)

    @callback
    def _registry_changed(self, _event: Event | None = None) -> None:
        self._resubscribe()
        self.async_write_ha_state()

    @callback
    def _unsubscribe(self) -> None:
        if self._unsub_states is not None:
            self._unsub_states()
            self._unsub_states = None
        if self._unsub_reports is not None:
            self._unsub_reports()
            self._unsub_reports = None

    @callback
    def _resubscribe(self) -> None:
        registry = er.async_get(self.hass)
        non_solar = non_solar_entry_ids(self.hass)
        all_sources = collect_sources(
            registry.entities.values(),
            lambda entry: _device_facts(self.hass, entry),
            non_solar_entries=non_solar,
        )
        holder = self._site_sources()
        if keep_removed_solar(self.hass, holder, all_sources):
            holder.save()
        ac_inputs = collect_ac_inputs(registry.entities.values())
        topology = evaluate_topology(self.hass, all_sources, ac_inputs)
        self._all_sources = all_sources
        self._ac_inputs = ac_inputs
        self._topology = topology
        self._sources = all_sources.get(self.role, [])
        self._capacity = {
            source.serial: source.entity_id
            for source in all_sources.get("capacity_battery", [])
        }
        house = all_sources.get("power_house", [])
        if self.role == "power_house" or (
            not self._sources and self.role in site_flows.FLOW_ROLES
        ):
            if topology.is_unresolved:
                self._balance = None
            else:
                generators = [
                    source
                    for base in sorted(contract.GENERATOR_BASES)
                    for source in all_sources.get(base, [])
                    if source.serial not in topology.linked_storage_serials
                ]
                ac_nets = [
                    source
                    for source in all_sources.get("power_ac_net", [])
                    if source.serial not in topology.linked_storage_serials
                ]
                owner = (
                    self.hass.config_entries.async_get_entry(house[0].entry_id)
                    if len(house) == 1 and house[0].entry_id
                    else None
                )
                self._balance = house_balance_plan(
                    house,
                    ac_nets,
                    generators,
                    owner.data.get(CONF_VENDOR) if owner is not None else None,
                )
        else:
            self._balance = None
        self._unsubscribe()
        tracked = [source.entity_id for source in self._sources]
        if self.role == "battery_soc":
            tracked.extend(self._capacity.values())
        tracked.extend(source.entity_id for source in self._balance or [])
        for pair in topology.confirmed_pairs:
            if (
                pair.storage_ac_in_entity_id
                and pair.storage_ac_in_entity_id not in tracked
            ):
                tracked.append(pair.storage_ac_in_entity_id)
        if not self._sources and self.role in site_daily.DERIVED_ROLES:
            for input_role in site_daily.input_roles(self.role, self._all_sources):
                tracked.extend(
                    source.entity_id
                    for source in self._all_sources.get(input_role, [])
                )
        if not self._sources and self.role in site_flows.FLOW_ROLES:
            tracked.extend(
                entity_id
                for entity_id in self._derived_source_ids()
                if entity_id not in tracked
            )
        if tracked:

            @callback
            def changed(_event: Event) -> None:
                self.async_write_ha_state()

            self._unsub_states = async_track_state_change_event(
                self.hass, tracked, changed
            )
            # An unchanged lifetime total still has to count toward a reset.
            # Home Assistant reports that poll without a state change.
            if _sum_lifetime(self.role) and self._sources:
                self._unsub_reports = async_track_state_report_event(
                    self.hass, tracked, changed
                )
        self._arm_midnight()

    @callback
    def _arm_midnight(self) -> None:
        """Schedule the next local midnight for a derived or retired-today day counter. @zara"""
        needs_midnight = (
            (self._is_derived() and self.role in site_daily.MIDNIGHT_ROLES)
            or (
                self.role == "energy_solar_today"
                and self._retired_solar_today({s.serial for s in self._sources})
                is not None
            )
        )
        if not needs_midnight:
            self._cancel_midnight()
            return
        if self._unsub_midnight is not None:
            return
        when = site_daily.next_local_midnight(dt_util.as_local(dt_util.now()))
        self._unsub_midnight = async_track_point_in_utc_time(
            self.hass, self._on_local_midnight, dt_util.as_utc(when)
        )

    @callback
    def _on_local_midnight(self, _now) -> None:
        """Rewrite the day counter at local midnight, then schedule the next one. @zara"""
        self._unsub_midnight = None
        self._arm_midnight()
        self.async_write_ha_state()

    @callback
    def _cancel_midnight(self) -> None:
        if self._unsub_midnight is not None:
            self._unsub_midnight()
            self._unsub_midnight = None

    @callback
    def _arm_hold(self) -> None:
        """Re-read once a held power expires, even if no other device changes. @zara"""
        if self._unsub_hold is not None:
            return
        self._unsub_hold = async_call_later(
            self.hass, POWER_HOLD.total_seconds() + 1, self._on_hold_expired
        )

    @callback
    def _on_hold_expired(self, _now) -> None:
        self._unsub_hold = None
        self.async_write_ha_state()

    @callback
    def _cancel_hold(self) -> None:
        if self._unsub_hold is not None:
            self._unsub_hold()
            self._unsub_hold = None

    def _sum_values(self, role: str, sources: list[Source]) -> list[float | None]:
        """Device values of a sum role with missing devices replaced. @zara"""
        holder = self._site_sources()
        power = role.startswith("power_")
        states = [
            (source.entity_id, self.hass.states.get(source.entity_id))
            for source in sources
        ]
        guards_changed = False
        rebased = False
        if _sum_lifetime(role):
            serials = {source.entity_id: source.serial for source in sources}
            numeric, guards_changed, rebased = _guard_sum_readings(
                role, states, holder.tracker, serials
            )
        else:
            numeric = [(entity_id, _float(state)) for entity_id, state in states]
        proven_days = (
            {
                entity_id: _state_proven_local_day(state)
                for entity_id, state in states
            }
            if role.endswith("_today")
            else None
        )
        fill = fill_missing(
            role,
            numeric,
            holder.power_seen if power else holder.tracker.readings,
            source_now(),
            installation_local_day(),
            proven_days=proven_days,
        )
        if rebased:
            holder.save()
        elif fill.changed or guards_changed:
            holder.save_readings()
        if fill.held:
            self._arm_hold()
        self._missing.update(fill.substituted)
        return fill.values

    def _site_sources(self) -> SiteSources:
        data = getattr(self.hass, "data", None)
        if not isinstance(data, dict):
            data = {}
            self.hass.data = data
        holder = data.get(_SITE_SOURCES)
        if isinstance(holder, SiteSources):
            return holder
        holder = SiteSources(SourceTracker())
        data[_SITE_SOURCES] = holder
        return holder

    @property
    def available(self) -> bool:
        """Available while every source reports a value. @zara"""
        return self._current() is not None

    def _is_derived(self) -> bool:
        if self._sources:
            return False
        return (
            self.role in site_daily.DERIVED_ROLES or self.role in site_flows.FLOW_ROLES
        )

    def _derived_source_ids(self) -> list[str]:
        """Device entities a derived installation value follows. @zara"""
        if self.role in site_flows.FLOW_ROLES:
            has_battery = site_daily.battery_present(self._all_sources)
            extra = [
                source.entity_id
                for input_role in site_flows.flow_inputs(self.role, has_battery)
                if input_role != "power_solar"
                for source in self._all_sources.get(input_role, [])
            ]
            if self._balance:
                extra.extend(source.entity_id for source in self._balance)
            if self._topology.has_non_solar_ac:
                for source in self._all_sources.get("power_inverter_ac_output", []):
                    if (
                        source.serial in self._topology.non_solar_serials
                        or source.entry_id in self._topology.non_solar_entry_ids
                    ):
                        extra.append(source.entity_id)
                for pair in self._topology.confirmed_pairs:
                    if pair.storage_ac_in_entity_id:
                        extra.append(pair.storage_ac_in_entity_id)
            return site_flows.flow_entity_ids(
                site_flows.generation_entity_ids(self._generation_groups()), extra
            )
        return [
            source.entity_id
            for input_role in site_daily.input_roles(self.role, self._all_sources)
            for source in self._all_sources.get(input_role, [])
        ]

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract attributes plus the device entities combined. @zara"""
        if self._is_derived():
            sources = self._derived_source_ids()
            attributes: dict[str, Any] = {
                contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
                contract.ATTR_ROLE: self.role,
                AGGREGATION_ATTR: contract.AGG_DERIVED,
                SOURCES_ATTR: sources,
                contract.ATTR_DERIVED: True,
            }
        else:
            balance = self._balance if self._balance_used else []
            attributes = {
                contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
                contract.ATTR_ROLE: self.role,
                AGGREGATION_ATTR: contract.AGG_HOUSE_BALANCE if balance else self._rule,
                SOURCES_ATTR: [
                    source.entity_id for source in [*self._sources, *balance]
                ],
            }
        if self._missing:
            attributes[MISSING_ATTR] = sorted(self._missing)
        return attributes

    def _current(self):
        raise NotImplementedError


class SiteSensor(_SiteEntity, RestoreSensor, SensorEntity):
    """Numeric system value of the installation. @zara"""

    def __init__(self, role: str) -> None:
        """Set unit and classes from the contract. @zara"""
        super().__init__(role)
        self._source_seed: float | None = None
        self._source_cont: SourceCont | None = None
        spec, _channel = contract.split_role(role)
        self._attr_native_unit_of_measurement = spec.unit
        self._attr_device_class = (
            SensorDeviceClass(spec.device_class) if spec.device_class else None
        )
        self._attr_state_class = (
            SensorStateClass(spec.state_class) if spec.state_class else None
        )

    async def async_added_to_hass(self) -> None:
        """Restore the last total before the first reading can store offset 0. @zara"""
        if contract.continues_total(self.role):
            await RestoreSensor.async_added_to_hass(self)
            holder = self._site_sources()
            if holder.tracker.get(self.role) is None and self.role not in holder.seeds:
                holder.seeds[self.role] = await self._restore_seed()
            self._source_seed = holder.seeds.get(self.role)
        await super().async_added_to_hass()

    async def _restore_seed(self) -> float | None:
        """Return the last published total of this entity, or None. @zara"""
        expected = self._attr_native_unit_of_measurement
        if not isinstance(expected, str):
            return None
        restored = await self.async_get_last_sensor_data()
        if restored is not None:
            return valid_energy_seed(
                restored.native_value,
                restored.native_unit_of_measurement,
                expected,
            )
        last = await self.async_get_last_state()
        if last is None:
            return None
        attributes = getattr(last, "attributes", None)
        unit = (
            attributes.get("unit_of_measurement")
            if isinstance(attributes, Mapping)
            else None
        )
        return valid_energy_seed(getattr(last, "state", None), unit, expected)

    def _resolve_seed(self, role: str) -> float | None:
        """Return the restored total for a role without a live continuation. @zara"""
        holder = self._site_sources()
        if role in holder.seeds:
            return holder.seeds[role]
        if self.role == role and self._source_seed is not None:
            return self._source_seed
        return self._seed_from_state(role)

    def _seed_from_state(self, role: str) -> float | None:
        """Return the last state still held for this installation entity. @zara"""
        split = contract.split_role(role)
        if split is None:
            return None
        state = self.hass.states.get(self._installation_entity_id(role))
        if state is None:
            return None
        attributes = getattr(state, "attributes", None)
        unit = (
            attributes.get("unit_of_measurement")
            if isinstance(attributes, Mapping)
            else None
        )
        return valid_energy_seed(getattr(state, "state", None), unit, split[0].unit)

    def _installation_entity_id(self, role: str) -> str:
        fallback = f"sensor.{contract.system_object_id(role)}"
        try:
            registry = er.async_get(self.hass)
        except (AttributeError, KeyError, TypeError, ValueError):
            return fallback
        return (
            registry.async_get_entity_id(
                "sensor", DOMAIN, contract.system_unique_id(role)
            )
            or fallback
        )

    def _retired_solar_total(self, active_serials: set[str]) -> float | None:
        """Sum of retired PV contributions disjoint from active solar serials. @zara"""
        holder = self._site_sources()
        eligible = [
            item.value
            for item in holder.tracker.retired_solar.values()
            if item.archived or item.serial not in active_serials
        ]
        if not eligible:
            return None
        return float(sum(eligible))

    def _retired_solar_today(
        self, active_serials: set[str], today: str | None = None
    ) -> float | None:
        """Sum of retired daily PV shares valid for the current local production day. @zara"""
        current_day = today or installation_local_day()
        holder = self._site_sources()
        eligible = [
            item.value
            for item in holder.tracker.retired_solar_today.values()
            if item.day == current_day and item.serial not in active_serials
        ]
        if not eligible:
            return None
        return float(sum(eligible))

    def _pair_ac_input(self, pair: LinkedStoragePair) -> float | None:
        """Measured separate AC input of a linked storage, or None when required and missing. @zara"""
        if not pair.requires_ac_in:
            return 0.0
        if not pair.storage_ac_in_entity_id:
            return None
        raw = _float(self.hass.states.get(pair.storage_ac_in_entity_id))
        if raw is None or raw < 0:
            return None
        return raw

    def _effective_ac_output_value(self, sources: list[Source]) -> float | None:
        """Sum inverter AC output with topology deduplication and strict non-solar reads. @zara"""
        topology = self._topology
        if topology.is_unresolved:
            return None
        effective = [
            source
            for source in sources
            if source.serial not in topology.linked_storage_serials
        ]
        if not effective:
            return None
        non_solar_sources = [
            source
            for source in effective
            if source.serial in topology.non_solar_serials
            or source.entry_id in topology.non_solar_entry_ids
        ]
        regular_sources = [
            source for source in effective if source not in non_solar_sources
        ]
        total = 0.0
        for source in non_solar_sources:
            raw = _float(self.hass.states.get(source.entity_id))
            if raw is None:
                return None
            total += raw
        if regular_sources:
            reg_values = self._sum_values("power_inverter_ac_output", regular_sources)
            reg_sum = aggregate(contract.AGG_SUM, reg_values)
            if reg_sum is None:
                return None
            total += reg_sum
        return total

    def _effective_net_value(self, source: Source) -> float | None:
        """Net AC value of one foreign source; linked EZ1 subtracts storage AC input. @zara"""
        raw = _float(self.hass.states.get(source.entity_id))
        if raw is None:
            return None
        pair = self._topology.pair_by_ez1(source.serial)
        if pair is None:
            return raw
        ac_in = self._pair_ac_input(pair)
        if ac_in is None:
            return None
        return raw - ac_in

    def _current(self) -> float | None:
        self._missing = set()
        if self.role == "energy_solar_total":
            return self._solar_total_value(self._sources)
        if self.role == "energy_solar_today":
            return self._solar_today_value(self._sources)
        if self.role in _BATTERY_TOTAL_ROLES:
            return self._kept_sum_value(self.role, self._sources)
        if self._sources and contract.continues_total(self.role):
            return self._continued(self.role, self._sources)
        if not self._sources:
            if self._is_derived():
                return self._derived_current()
            return None
        get = self.hass.states.get
        if self.role == "power_grid" and self._derived_grid():
            # no signed grid meter value: import minus export of the grid meter
            imported, exported = (
                _float(get(source.entity_id)) for source in self._sources
            )
            if imported is None or exported is None:
                return None
            return imported - exported
        if self.role == "power_house":
            return self._house_power()
        if self.role == "power_inverter_ac_output" and self._topology.has_non_solar_ac:
            self._balance_used = False
            return self._effective_ac_output_value(self._sources)
        self._balance_used = False
        if self._rule == contract.AGG_SUM:
            values = self._sum_values(self.role, self._sources)
        else:
            values = [_float(get(source.entity_id)) for source in self._sources]
        weights = None
        if self.role == "battery_soc":
            weights = [
                _float(get(self._capacity[source.serial]))
                if source.serial in self._capacity
                else None
                for source in self._sources
            ]
        return aggregate(self._rule, values, weights)

    def _solar_total_value(self, sources: list[Source]) -> float | None:
        """Sum active solar totals plus disjoint retired solar contributions. @zara"""
        active_serials = {source.serial for source in sources}
        retired = self._retired_solar_total(active_serials)
        if not sources:
            return retired
        values = self._sum_values("energy_solar_total", sources)
        active_sum = aggregate(contract.AGG_SUM, values)
        if active_sum is None:
            return None
        return active_sum + (retired or 0.0)

    def _solar_today_value(self, sources: list[Source]) -> float | None:
        """Sum active daily solar shares plus retired shares of the current local day. @zara"""
        active_serials = {source.serial for source in sources}
        retired = self._retired_solar_today(active_serials)
        if not sources:
            if retired is not None:
                return retired
            if self._is_derived():
                return self._derived_current()
            return None
        values = self._sum_values("energy_solar_today", sources)
        active_sum = aggregate(contract.AGG_SUM, values)
        if active_sum is None:
            return None
        return active_sum + (retired or 0.0)

    def _kept_sum_value(self, role: str, sources: list[Source]) -> float | None:
        """Sum active battery totals and kept contributions of absent serials. @zara"""
        active_sum = None
        if sources:
            active_sum = aggregate(contract.AGG_SUM, self._sum_values(role, sources))
            if active_sum is None:
                return None
        active_serials = {source.serial for source in sources}
        retired = [
            item.value
            for key, item in self._site_sources().tracker.retired_sums.items()
            if key.endswith(f":{role}") and item.serial not in active_serials
        ]
        if active_sum is None:
            return sum(retired) if retired else None
        return active_sum + sum(retired)

    def _house_power(self) -> float | None:
        """Installation house power after the existing house rule, clamped at 0. @zara"""
        house = self._all_sources.get("power_house")
        if not house and self.role == "power_house":
            house = self._sources
        if not house:
            self._balance_used = False
            return None
        get = self.hass.states.get
        if self._balance:
            value, self._balance_used = house_balance(
                _float(get(house[0].entity_id)),
                [self._effective_net_value(source) for source in self._balance],
            )
            return value
        self._balance_used = False
        raw = aggregate(
            contract.aggregation("power_house"),
            [_float(get(house[0].entity_id))],
        )
        return None if raw is None else max(0.0, raw)

    def _flow_house_power(self) -> float | None:
        """House power for the derived flows; None while a non-solar net value is missing. @zara"""
        topology = self._topology
        if topology.is_unresolved:
            return None
        for source in self._balance or []:
            if (
                source.serial in topology.non_solar_serials
                or source.entry_id in topology.non_solar_entry_ids
            ) and self._effective_net_value(source) is None:
                return None
        return self._house_power()

    def _role_value(self, role: str) -> float | None:
        sources = self._all_sources.get(role, [])
        if role == "energy_solar_total":
            val = self._solar_total_value(sources)
            return None if val is None else round(float(val), 3)
        if role == "energy_solar_today":
            val = self._solar_today_value(sources)
            return None if val is None else round(float(val), 3)
        if role in _BATTERY_TOTAL_ROLES:
            val = self._kept_sum_value(role, sources)
            return None if val is None else round(float(val), 3)
        if not sources:
            return None
        if role == "power_inverter_ac_output" and self._topology.has_non_solar_ac:
            val = self._effective_ac_output_value(sources)
            return None if val is None else round(float(val), 3)
        if contract.continues_total(role):
            return self._continued(role, sources)
        rule = contract.aggregation(role)
        if rule == contract.AGG_SUM:
            values = self._sum_values(role, sources)
        else:
            values = [
                _float(self.hass.states.get(source.entity_id)) for source in sources
            ]
        value = aggregate(rule, values)
        if value is None:
            return None
        return round(float(value), 3)

    def _continued(self, role: str, sources: list[Source]) -> float | None:
        """Value of a lifetime counter after its stored source offset. @zara"""
        holder = self._site_sources()
        memory = holder.tracker.get(role)
        fresh = memory is None
        seeded = not (memory and memory.live and memory.published is not None)
        seed = self._resolve_seed(role) if seeded else None
        readings = [
            (source, _float(self.hass.states.get(source.entity_id)))
            for source in sources
        ]
        published, updated, switched = continue_single(
            readings, memory, source_now(), seed
        )
        # A derived reader must not lock a live offset of 0 before this
        # entity restores. A hold placeholder still has to be stored, or the
        # fallback timer would start over on every read.
        locks_unseeded = (
            fresh
            and self.role != role
            and seed is None
            and updated is not None
            and updated.live
            and updated.offset == 0.0
        )
        if updated is not None and updated != memory and not locks_unseeded:
            holder.tracker.set(role, updated)
            holder.save()
        if (
            updated is not None
            and switched is not None
            and not (switched == "" and abs(updated.offset) < 0.0005)
        ):
            LOGGER.info(
                "Installation %s source changed from %s to %s, offset %s kWh",
                role,
                switched or "previous value",
                updated.entity_id,
                updated.offset,
            )
        if self.role == role:
            self._source_cont = updated
        return published

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract attributes, and the continued source when this counter has one. @zara"""
        if contract.continues_total(self.role) and self._sources:
            self._continued(self.role, self._sources)
        attributes = dict(super().extra_state_attributes)
        if contract.continues_total(self.role) and self._source_cont is not None:
            attributes[SOURCE_ATTR] = self._source_cont.entity_id
            attributes[OFFSET_ATTR] = self._source_cont.offset
        return attributes

    def _today_from_total(self, total_role: str) -> float | None:
        return self._site_daily().update(
            total_role, self._role_value(total_role), installation_local_day()
        )

    def _derived_house_today(self) -> float | None:
        # a device lifetime counter still feeds the day; the component sum does not
        if self._all_sources.get("energy_house_total"):
            return self._today_from_total("energy_house_total")
        if self._topology.has_non_solar_ac:
            return None
        has_battery = site_daily.battery_present(self._all_sources)
        solar = self._today_from_total("energy_solar_total")
        imported = self._today_from_total("energy_grid_import_total")
        exported = self._today_from_total("energy_grid_export_total")
        if has_battery:
            charge = self._today_from_total("energy_battery_charge_total")
            discharge = self._today_from_total("energy_battery_discharge_total")
        else:
            charge = 0.0
            discharge = 0.0
        return site_daily.house_energy_today(
            solar, imported, exported, charge, discharge, has_battery
        )

    def _site_daily(self) -> SiteDaily:
        holder = self.hass.data.get(_SITE_DAILY)
        if isinstance(holder, SiteDaily):
            return holder
        holder = SiteDaily(site_daily.DailyTracker())
        self.hass.data[_SITE_DAILY] = holder
        return holder

    def _generation_rows(self, role: str) -> list[tuple[str, str, str]]:
        excluded = (
            self._topology.non_solar_serials | self._topology.linked_storage_serials
        )
        return [
            (source.entry_id, source.serial, source.entity_id)
            for source in self._all_sources.get(role, [])
            if source.serial not in excluded
            and source.entry_id not in self._topology.non_solar_entry_ids
        ]

    def _generation_groups(
        self,
    ) -> list[tuple[list[str], list[str], list[str]]]:
        """AC generation by config entry. A missing entry id groups by serial. @zara"""
        return site_flows.generation_groups(
            self._generation_rows("power_inverter_ac_output"),
            self._generation_rows("power_battery_discharge"),
            self._generation_rows("power_solar"),
            self._generation_rows("power_battery_charge"),
        )

    def _filled_entities(
        self, role: str, entity_ids: list[str]
    ) -> dict[str, float | None]:
        """Return filled power. Missing siblings hold, then count 0. @zara"""
        if not entity_ids:
            return {}
        wanted = set(entity_ids)
        sources = [
            source
            for source in self._all_sources.get(role, [])
            if source.entity_id in wanted
        ]
        if not sources:
            return {}
        values = self._sum_values(role, sources)
        return {
            source.entity_id: value
            for source, value in zip(sources, values, strict=True)
        }

    def _generation_power(self) -> float | None:
        """Installation P: per entry, AC after discharge, plus PV-covered charge. @zara"""
        groups = self._generation_groups()
        if not groups:
            return None
        ac_values = self._filled_entities(
            "power_inverter_ac_output",
            [
                entity_id
                for ac_ids, _discharge, _solar, _charge, _pv in groups
                for entity_id in ac_ids
            ],
        )
        solar_values = self._filled_entities(
            "power_solar",
            [
                entity_id
                for _ac, _discharge, solar_ids, _charge, pv_ids in groups
                for entity_id in (*solar_ids, *pv_ids)
            ],
        )
        discharge_values = self._filled_entities(
            "power_battery_discharge",
            [
                entity_id
                for _ac, discharge_ids, _solar, _charge, _pv in groups
                for entity_id in discharge_ids
            ],
        )
        charge_values = self._filled_entities(
            "power_battery_charge",
            [
                entity_id
                for _ac, _discharge, _solar, charge_ids, _pv in groups
                for entity_id in charge_ids
            ],
        )
        parts = [
            site_flows.entry_generation(
                [ac_values.get(entity_id) for entity_id in ac_ids],
                [discharge_values.get(entity_id) for entity_id in discharge_ids],
                [solar_values.get(entity_id) for entity_id in solar_ids],
                [charge_values.get(entity_id) for entity_id in charge_ids],
                [solar_values.get(entity_id) for entity_id in pv_ids],
            )
            for ac_ids, discharge_ids, solar_ids, charge_ids, pv_ids in groups
        ]
        return site_flows.generation_total(parts)

    def _non_solar_ac_power(self) -> float | None:
        """Strict sum of non-solar AC outputs without hold or zero replacement. @zara"""
        topology = self._topology
        if not topology.has_non_solar_ac:
            return 0.0
        ac_sources = {
            source.serial: source
            for source in self._all_sources.get("power_inverter_ac_output", [])
            if source.serial in topology.non_solar_serials
            or source.entry_id in topology.non_solar_entry_ids
        }
        if len(ac_sources) < len(topology.non_solar_entry_ids):
            return None
        total = 0.0
        for source in ac_sources.values():
            raw = _float(self.hass.states.get(source.entity_id))
            if raw is None or raw < 0:
                return None
            total += raw
        for pair in topology.confirmed_pairs:
            if self._pair_ac_input(pair) is None:
                return None
        return total

    def _flow_battery_charge(self) -> float | None:
        """Battery charge demand for flow derivation (linked storage uses AC input). @zara"""
        topology = self._topology
        if not topology.confirmed_pairs:
            return self._role_value("power_battery_charge")
        regular = [
            source
            for source in self._all_sources.get("power_battery_charge", [])
            if source.serial not in topology.linked_storage_serials
        ]
        total = 0.0
        if regular:
            values = self._sum_values("power_battery_charge", regular)
            reg_sum = aggregate(contract.AGG_SUM, values)
            if reg_sum is None:
                return None
            total += reg_sum
        for pair in topology.confirmed_pairs:
            ac_in = self._pair_ac_input(pair)
            if ac_in is None:
                return None
            total += ac_in
        return total

    def _flow_battery_discharge(self) -> float | None:
        """Proven AC battery discharge excluding linked DC-side storages. @zara"""
        topology = self._topology
        if not topology.linked_storage_serials:
            return self._role_value("power_battery_discharge")
        regular = [
            source
            for source in self._all_sources.get("power_battery_discharge", [])
            if source.serial not in topology.linked_storage_serials
        ]
        if not regular:
            return 0.0
        values = self._sum_values("power_battery_discharge", regular)
        return aggregate(contract.AGG_SUM, values)

    def _derived_flow(self) -> float | None:
        topology = self._topology
        if topology.is_unresolved:
            return None
        has_battery = site_daily.battery_present(self._all_sources)
        groups = self._generation_groups()
        has_solar = bool(groups)
        solar = self._generation_power() if has_solar else None
        other = self._non_solar_ac_power() if topology.has_non_solar_ac else 0.0
        flows = site_flows.derive_power_flows(
            solar,
            self._flow_battery_charge() if has_battery else 0.0,
            self._flow_battery_discharge() if has_battery else 0.0,
            self._flow_house_power(),
            has_battery=has_battery,
            other=other,
            has_solar=has_solar,
            linked_discharge_unknown=bool(topology.linked_storage_serials),
        )
        return flows.get(self.role)

    def _derived_current(self) -> float | None:
        if self.role in site_flows.FLOW_ROLES:
            return self._derived_flow()
        if self.role == "energy_house_today":
            # a device lifetime counter's day does not dip; the component sum does
            if self._all_sources.get("energy_house_total"):
                return self._today_from_total("energy_house_total")
            if self._topology.has_non_solar_ac:
                return None
            raw = self._derived_house_today()
            return self._site_daily().published_house_today(
                raw, installation_local_day()
            )
        if self.role == "energy_house_total":
            if self._all_sources.get("energy_house_total"):
                return self._role_value("energy_house_total")
            if self._topology.has_non_solar_ac:
                return None
            return self._site_daily().update_house(
                self._derived_house_today(), installation_local_day()
            )
        total_role = site_daily.TODAY_FROM_TOTAL.get(self.role)
        if total_role is None:
            return None
        if total_role == "energy_solar_total" and not self._all_sources.get(
            "energy_solar_total"
        ):
            return None
        return self._today_from_total(total_role)

    def _derived_grid(self) -> bool:
        registry = er.async_get(self.hass)
        roles = []
        for source in self._sources:
            entry = registry.async_get(source.entity_id)
            parsed = contract.parse_unique_id(entry.unique_id) if entry else None
            roles.append(parsed.get("role") if parsed else None)
        return roles == ["power_grid_import", "power_grid_export"]

    @property
    def native_value(self) -> float | None:
        """Aggregated value. @zara"""
        value = self._current()
        if value is None:
            return None
        return round(value, 3 if self.role.startswith(("energy", "capacity")) else 1)


class SiteBinarySensor(_SiteEntity, BinarySensorEntity):
    """On/off system state of the installation. @zara"""

    def _current(self) -> bool | None:
        if not self._sources:
            return None
        states = [
            _onoff(self.hass.states.get(source.entity_id)) for source in self._sources
        ]
        return aggregate_state(self._rule, states)

    @property
    def is_on(self) -> bool | None:
        """Aggregated state. @zara"""
        return self._current()


class SiteFlowStatusSensor(SensorEntity):
    """System-level flow allocation status readable even when devices are offline. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False
    _attr_entity_registry_enabled_default = True
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = list(contract.FLOW_STATUS_OPTIONS)

    def __init__(self) -> None:
        """Bind to the installation flow_status contract role. @zara"""
        self.role = contract.ROLE_FLOW_STATUS
        self._attr_unique_id = contract.system_unique_id(contract.ROLE_FLOW_STATUS)
        self._attr_translation_key = f"sinv_{contract.ROLE_FLOW_STATUS}"
        self._attr_device_info = site_device_info()
        self._all_sources: dict[str, list[Source]] = {}
        self._ac_inputs: dict[str, Source] = {}
        self._topology: TopologyPlan = TopologyPlan()
        self._unsub_states = None

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Suggest sensor.sinv_flow_status before core registers the entity. @zara"""
        registry = er.async_get(hass)
        if (
            registry.async_get_entity_id(platform.domain, DOMAIN, self.unique_id)
            is None
        ):
            self.entity_id = f"{platform.domain}.{contract.system_object_id(self.role)}"
        super().add_to_platform_start(hass, platform, parallel_updates)

    async def async_added_to_hass(self) -> None:
        """Follow registry, config and non-solar AC source updates. @zara"""
        self._resubscribe()
        self.async_on_remove(
            self.hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._refresh
            )
        )
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_SITE_CONFIG_UPDATED, self._refresh
            )
        )
        self.async_on_remove(self._unsubscribe)

    @callback
    def _unsubscribe(self) -> None:
        if self._unsub_states is not None:
            self._unsub_states()
            self._unsub_states = None

    @callback
    def _refresh(self, _event: Event | None = None) -> None:
        self._resubscribe()
        self.async_write_ha_state()

    @callback
    def _resubscribe(self) -> None:
        registry = er.async_get(self.hass)
        non_solar = non_solar_entry_ids(self.hass)
        all_sources = collect_sources(
            registry.entities.values(),
            lambda item: _device_facts(self.hass, item),
            non_solar_entries=non_solar,
        )
        ac_inputs = collect_ac_inputs(registry.entities.values())
        topology = evaluate_topology(self.hass, all_sources, ac_inputs)
        _sync_topology_issues(self.hass, topology)
        self._all_sources = all_sources
        self._ac_inputs = ac_inputs
        self._topology = topology
        self._unsubscribe()
        tracked: list[str] = []
        for source in all_sources.get("power_inverter_ac_output", []):
            if (
                source.serial in topology.non_solar_serials
                or source.entry_id in topology.non_solar_entry_ids
            ):
                tracked.append(source.entity_id)
        for pair in topology.confirmed_pairs:
            if (
                pair.storage_ac_in_entity_id
                and pair.storage_ac_in_entity_id not in tracked
            ):
                tracked.append(pair.storage_ac_in_entity_id)
        if tracked:

            @callback
            def changed(_event: Event) -> None:
                self.async_write_ha_state()

            self._unsub_states = async_track_state_change_event(
                self.hass, tracked, changed
            )

    def _evaluate(self) -> tuple[str, bool, bool]:
        """Return (status, allocation_complete, has_non_solar_ac). @zara"""
        topology = self._topology
        has_non_solar = bool(topology.has_non_solar_ac)
        if topology.is_unresolved:
            return contract.FLOW_STATUS_UNRESOLVED, False, has_non_solar
        if not has_non_solar:
            return contract.FLOW_STATUS_COMPLETE, True, False
        if topology.confirmed_pairs:
            return contract.FLOW_STATUS_INCOMPLETE, False, True
        ac_sources = [
            source
            for source in self._all_sources.get("power_inverter_ac_output", [])
            if source.serial in topology.non_solar_serials
            or source.entry_id in topology.non_solar_entry_ids
        ]
        if len(ac_sources) < len(topology.non_solar_entry_ids):
            return contract.FLOW_STATUS_INCOMPLETE, False, True
        for source in ac_sources:
            raw = _float(self.hass.states.get(source.entity_id))
            if raw is None or raw < 0 or raw > 0:
                return contract.FLOW_STATUS_INCOMPLETE, False, True
        return contract.FLOW_STATUS_COMPLETE, True, True

    @property
    def available(self) -> bool:
        """System status stays readable even when individual devices are offline. @zara"""
        return True

    @property
    def native_value(self) -> str:
        """Current flow allocation state. @zara"""
        status, _, _ = self._evaluate()
        return status

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract version, flow status version and explicit boolean flags. @zara"""
        _, complete, has_non_solar = self._evaluate()
        return {
            contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
            contract.ATTR_ROLE: self.role,
            contract.ATTR_FLOW_STATUS_VERSION: contract.FLOW_STATUS_VERSION,
            contract.ATTR_FLOW_ALLOCATION_COMPLETE: bool(complete),
            contract.ATTR_HAS_NON_SOLAR_AC: bool(has_non_solar),
        }
