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
drop. Daily counters and house energy are derived
when no device reports them and their inputs exist. Power flows are derived
the same way from the installation power when no device measures that flow.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
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
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from . import contract, site_daily, site_flows
from .const import CONF_VENDOR, DOMAIN, LOGGER, VENDOR_HP, is_hp_device_vendor
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
# Longer than a restart and a few missed Solarbank messages, shorter than
# leaving the counter empty while the smart meter still has a reading.
SOURCE_HOLD = timedelta(minutes=15)
# A short device gap (a DTU blip, a reconnect) keeps the last power. A device
# that stays away longer, e.g. a micro inverter asleep at night, counts as 0 W.
POWER_HOLD = timedelta(minutes=5)
# Persisting counter readings on every update would rewrite the store constantly.
READINGS_SAVE_DELAY = 300.0
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
            if not power and (
                known is None or known.value != value or known.day != day
            ):
                changed = True
            last[entity_id] = LastReading(value, day, now)
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


def sensor_roles(sources: dict[str, list[Source]], existing: set[str]) -> set[str]:
    """Sensor roles of the installation, including derived ones whose inputs exist. @zara"""
    roles = set(sources)
    roles.update(existing)
    roles.update(site_daily.derived_roles(sources))
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
            self._store.async_delay_save(self.tracker.snapshot, 1.0)


class SourceTracker:
    """Persisted source and offset of every continued installation counter. @zara"""

    def __init__(self) -> None:
        """Start with no stored source. @zara"""
        self._roles: dict[str, SourceCont] = {}
        # Last counter reading per device entity, so a sum survives a device
        # that is missing after a restart.
        self.readings: dict[str, LastReading] = {}

    def get(self, role: str) -> SourceCont | None:
        """Return the stored continuation of one role. @zara"""
        return self._roles.get(role)

    def set(self, role: str, cont: SourceCont) -> None:
        """Remember the continuation of one role. @zara"""
        self._roles[role] = cont

    def snapshot(self) -> dict[str, Any]:
        """JSON-ready source offsets. @zara"""
        return {
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
                entity_id: {"value": reading.value, "day": reading.day}
                for entity_id, reading in self.readings.items()
            },
        }

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
        roles = raw.get("roles")
        if not isinstance(roles, dict):
            return tracker
        for role, item in roles.items():
            parsed = _parse_source(role, item)
            if parsed is not None:
                tracker._roles[role] = parsed
        return tracker


def _parse_reading(entity_id: Any, item: Any) -> LastReading | None:
    if not isinstance(entity_id, str) or not isinstance(item, dict):
        return None
    value = item.get("value")
    day = item.get("day")
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if not math.isfinite(value) or not isinstance(day, str):
        return None
    return LastReading(float(value), day)


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


def collect_sources(entities, device_of=None) -> dict[str, list[Source]]:
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


@callback
def async_remove_unused_site_entry(hass: HomeAssistant, removed: ConfigEntry) -> None:
    """Remove the installation entry together with the last device instance. @zara

    Called after ``removed`` left ``hass.config_entries``. Disabled device
    instances still count, so the installation stays while any instance exists.
    Heat-pump entries do not keep or remove this installation.
    """
    entries = hass.config_entries.async_entries(DOMAIN, include_ignore=False)
    if removed.data.get(CONF_VENDOR) != VENDOR_SITE and any(
        _keeps_inverter_site(entry) for entry in entries
    ):
        return
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
        sources = collect_sources(
            registry.entities.values(), lambda entry: _device_facts(hass, entry)
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
            sensor_roles(sources, existing)
            if domain == "sensor"
            else set(sources) | existing
        )
        new = [
            (SiteBinarySensor if domain == "binary_sensor" else SiteSensor)(role)
            for role in sorted(roles)
            if role not in known
            and contract.system_domain(role) == domain
            and contract.has_system_entity(role)
        ]
        known.update(entity.role for entity in new)
        if new:
            async_add_entities(new)

    refresh()
    entry.async_on_unload(
        hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, refresh)
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
        # device entities whose missing value was replaced in the last read
        self._missing: set[str] = set()
        self._unsub_states = None
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
        self.async_on_remove(self._unsubscribe)
        self.async_on_remove(self._cancel_midnight)
        self.async_on_remove(self._cancel_hold)

    @callback
    def _registry_changed(self, _event: Event) -> None:
        self._resubscribe()
        self.async_write_ha_state()

    @callback
    def _unsubscribe(self) -> None:
        if self._unsub_states is not None:
            self._unsub_states()
            self._unsub_states = None

    @callback
    def _resubscribe(self) -> None:
        registry = er.async_get(self.hass)
        all_sources = collect_sources(
            registry.entities.values(),
            lambda entry: _device_facts(self.hass, entry),
        )
        self._all_sources = all_sources
        self._sources = all_sources.get(self.role, [])
        self._capacity = {
            source.serial: source.entity_id
            for source in all_sources.get("capacity_battery", [])
        }
        house = all_sources.get("power_house", [])
        if self.role == "power_house" or (
            not self._sources and self.role in site_flows.FLOW_ROLES
        ):
            generators = [
                source
                for base in sorted(contract.GENERATOR_BASES)
                for source in all_sources.get(base, [])
            ]
            owner = (
                self.hass.config_entries.async_get_entry(house[0].entry_id)
                if len(house) == 1 and house[0].entry_id
                else None
            )
            self._balance = house_balance_plan(
                house,
                all_sources.get("power_ac_net", []),
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
        if not self._sources and self.role in site_daily.DERIVED_ROLES:
            for input_role in site_daily.input_roles(self.role, self._all_sources):
                tracked.extend(
                    source.entity_id for source in self._all_sources.get(input_role, [])
                )
        if not self._sources and self.role in site_flows.FLOW_ROLES:
            has_battery = site_daily.battery_present(self._all_sources)
            for input_role in site_flows.flow_inputs(self.role, has_battery):
                tracked.extend(
                    source.entity_id for source in self._all_sources.get(input_role, [])
                )
        if tracked:

            @callback
            def changed(_event: Event) -> None:
                self.async_write_ha_state()

            self._unsub_states = async_track_state_change_event(
                self.hass, tracked, changed
            )
        self._arm_midnight()

    @callback
    def _arm_midnight(self) -> None:
        """Schedule the next local midnight for a derived day counter. @zara"""
        if not self._is_derived() or self.role not in site_daily.MIDNIGHT_ROLES:
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
        fill = fill_missing(
            role,
            [
                (source.entity_id, _float(self.hass.states.get(source.entity_id)))
                for source in sources
            ],
            holder.power_seen if power else holder.tracker.readings,
            source_now(),
            installation_local_day(),
        )
        if fill.changed:
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
            sources = [
                source.entity_id
                for input_role in site_flows.flow_inputs(self.role, has_battery)
                for source in self._all_sources.get(input_role, [])
            ]
            if self._balance:
                sources.extend(source.entity_id for source in self._balance)
            return sources
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
            if isinstance(attributes, dict)
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
            if isinstance(attributes, dict)
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

    def _current(self) -> float | None:
        self._missing = set()
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
                [_float(get(source.entity_id)) for source in self._balance],
            )
            return value
        self._balance_used = False
        raw = aggregate(
            contract.aggregation("power_house"),
            [_float(get(house[0].entity_id))],
        )
        return None if raw is None else max(0.0, raw)

    def _role_value(self, role: str) -> float | None:
        sources = self._all_sources.get(role, [])
        if not sources:
            return None
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

    def _derived_flow(self) -> float | None:
        has_battery = site_daily.battery_present(self._all_sources)
        flows = site_flows.derive_power_flows(
            self._role_value("power_solar"),
            self._role_value("power_battery_charge"),
            self._role_value("power_battery_discharge"),
            self._house_power(),
            has_battery=has_battery,
        )
        return flows.get(self.role)

    def _derived_current(self) -> float | None:
        if self.role in site_flows.FLOW_ROLES:
            return self._derived_flow()
        if self.role == "energy_house_today":
            raw = self._derived_house_today()
            # a device lifetime counter's day does not dip; the component sum does
            if self._all_sources.get("energy_house_total"):
                return raw
            return self._site_daily().published_house_today(
                raw, installation_local_day()
            )
        if self.role == "energy_house_total":
            if self._all_sources.get("energy_house_total"):
                return self._role_value("energy_house_total")
            return self._site_daily().update_house(
                self._derived_house_today(), installation_local_day()
            )
        total_role = site_daily.TODAY_FROM_TOTAL.get(self.role)
        if total_role is None:
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
