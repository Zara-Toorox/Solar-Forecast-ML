# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Solar energy integrated from live DC power where a vendor counter is missing. @zara

A sample is one successful coordinator update. The sleep wrapper sits outside
this mixin, so a night substitute never reaches ``integrate``. A serial that
has ever reported a vendor ``energy_solar_total`` is never integrated.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, time, timedelta
import math
from typing import Any

from .site_daily import apply_reading

SOLAR_TOTAL = "energy_solar_total"
SOLAR_TODAY = "energy_solar_today"
CHARGE_POWER = "power_battery_charge"
DISCHARGE_POWER = "power_battery_discharge"
CHARGE_ENERGY = "energy_battery_charge_total"
DISCHARGE_ENERGY = "energy_battery_discharge_total"
_BATTERY_PAIRS = (
    (CHARGE_POWER, CHARGE_ENERGY),
    (DISCHARGE_POWER, DISCHARGE_ENERGY),
)
SOURCE_MPPT = "dc_mppt"
SOURCE_SOLAR = "power_solar"
SOURCE_ATTR = "sinv_dc_source"
# A gap longer than this adds nothing. Three scan intervals apply when shorter.
MAX_GAP_S = 180.0
# Same step as the installation sum guard: float residue is not a drop.
TOLERANCE_KWH = 0.0005
_MPPT_PREFIX = "power_solar_mppt_"


@dataclass
class Counter:
    """One integrated energy counter. @zara"""

    kwh: float = 0.0
    at: datetime | None = None
    watts: float | None = None
    source: str = ""
    today: float = 0.0
    day: str = ""


def gap_seconds(scan: timedelta | None) -> float:
    """Return the gap above which the next sample adds no energy. @zara

    Without a scan interval only the absolute cap applies.
    """
    if scan is None or scan.total_seconds() <= 0:
        return MAX_GAP_S
    return min(MAX_GAP_S, 3.0 * scan.total_seconds())


def live_dc(device: Any) -> tuple[str, float] | None:
    """Return live DC watts and the source that supplied them. @zara

    The sum of live MPPT power wins. Archive MPPT is skipped. A missing value
    is not a sample. Negative watts count as zero.
    """
    roles = getattr(device, "roles", None)
    if not isinstance(roles, dict):
        return None
    archive = _archive(device)
    total = 0.0
    seen = False
    for role, value in roles.items():
        if not isinstance(role, str) or not role.startswith(_MPPT_PREFIX):
            continue
        if role in archive:
            continue
        watts = _watts(value)
        if watts is None:
            continue
        seen = True
        total += watts
    if seen:
        return SOURCE_MPPT, total
    watts = _watts(roles.get("power_solar"))
    if watts is None:
        return None
    return SOURCE_SOLAR, watts


def integrate(
    devices: Mapping[Any, Any],
    now: datetime,
    scan: timedelta | None,
    counters: dict[str, Counter],
    locked: set[str] | None = None,
    days: dict[str, Any] | None = None,
) -> bool:
    """Integrate live DC power for generators without a vendor solar total. @zara

    The first sample of a device starts the counter at its stored value and
    adds nothing. A gap above ``gap_seconds`` adds nothing and becomes the new
    anchor. A missing value does not move the anchor. The day counter resets
    when the local day changes and only receives the part of the trapezoid
    that falls on the new day. A serial in ``locked``, or one that reports a
    vendor ``energy_solar_total`` on this sample, is not integrated. Return
    whether something changed and has to be stored.
    """
    if now.tzinfo is None:
        return False
    if locked is None:
        locked = set()
    if days is None:
        days = {}
    changed = False
    limit = gap_seconds(scan)
    for key, device in devices.items():
        roles = getattr(device, "roles", None)
        if not isinstance(roles, dict):
            continue
        serial = _serial(device, key)
        if serial is None:
            continue
        owned = _owned(device)
        if SOLAR_TOTAL in roles and SOLAR_TOTAL not in owned:
            if serial not in locked:
                locked.add(serial)
                changed = True
            if _fill_vendor_today(device, serial, now, days, owned):
                changed = True
            continue
        if serial in locked:
            continue
        sample = live_dc(device)
        counter = counters.get(serial)
        if sample is None:
            if counter is not None and _roll_today(counter, now):
                changed = True
                _publish(device, counter)
            elif counter is not None:
                _publish(device, counter)
            continue
        kind, watts = sample
        if counter is None:
            counter = Counter(day=_local_day(now))
            counters[serial] = counter
            changed = True
        if counter.at is not None and counter.watts is not None:
            elapsed = (now - counter.at).total_seconds()
            if 0 < elapsed <= limit:
                added = (counter.watts + watts) / 2.0 * elapsed / 3_600_000.0
                today_added = added * (_seconds_today(counter.at, now) / elapsed)
                if _roll_today(counter, now):
                    changed = True
                counter.kwh += added
                counter.today += today_added
                changed = True
            elif _roll_today(counter, now):
                changed = True
            if elapsed > 0 and (
                counter.at != now or counter.watts != watts or counter.source != kind
            ):
                counter.at = now
                counter.watts = watts
                counter.source = kind
                changed = True
        else:
            counter.at = now
            counter.watts = watts
            counter.source = kind
            if not counter.day:
                counter.day = _local_day(now)
            changed = True
        _publish(device, counter)
    return changed


def dump_counters(counters: Mapping[str, Counter]) -> dict[str, Any]:
    """JSON-ready counters. @zara"""
    payload: dict[str, Any] = {}
    for serial, counter in counters.items():
        if not isinstance(serial, str):
            continue
        item: dict[str, Any] = {"kwh": counter.kwh, "source": counter.source}
        if counter.at is not None:
            item["at"] = counter.at.isoformat()
        if counter.watts is not None:
            item["watts"] = counter.watts
        if counter.day:
            item["day"] = counter.day
            item["today"] = counter.today
        payload[serial] = item
    return payload


def load_counters(raw: Any) -> dict[str, Counter]:
    """Restore counters written by ``dump_counters``; broken items are dropped. @zara"""
    counters: dict[str, Counter] = {}
    if not isinstance(raw, dict):
        return counters
    for serial, item in raw.items():
        counter = _parse_counter(serial, item)
        if counter is not None:
            counters[serial] = counter
    return counters


def _advance(
    counters: dict[str, Counter],
    key: str,
    watts: float,
    now: datetime,
    limit: float,
    source: str,
) -> bool:
    """Add one signed trapezoid. The first sample and a gap add nothing. @zara"""
    counter = counters.get(key)
    if counter is None:
        counters[key] = Counter(0.0, now, watts, source)
        return True
    changed = False
    if counter.at is not None and counter.watts is not None:
        elapsed = (now - counter.at).total_seconds()
        if 0 < elapsed <= limit:
            counter.kwh += (counter.watts + watts) / 2.0 * elapsed / 3_600_000.0
            changed = True
        if elapsed > 0 and (counter.at != now or counter.watts != watts):
            counter.at = now
            counter.watts = watts
            counter.source = source
            changed = True
        return changed
    counter.at = now
    counter.watts = watts
    counter.source = source
    return True


def integrate_battery(
    devices: Mapping[Any, Any],
    now: datetime,
    scan: timedelta | None,
    counters: dict[str, Counter],
) -> bool:
    """Integrate measured battery power into missing energy counters. @zara

    A power role in ``device.derived`` is not measured. A counter the device
    already reports, and does not mark derived, is left as it is. The gap is
    ``gap_seconds``. A missing power value does not move the anchor.
    """
    if now.tzinfo is None:
        return False
    changed = False
    limit = gap_seconds(scan)
    for key, device in devices.items():
        roles = getattr(device, "roles", None)
        if not isinstance(roles, dict):
            continue
        serial = _serial(device, key)
        if serial is None:
            continue
        derived = getattr(device, "derived", None)
        owned = derived if isinstance(derived, set) else None
        for power, energy in _BATTERY_PAIRS:
            if power not in roles or (owned is not None and power in owned):
                continue
            if energy in roles and (owned is None or energy not in owned):
                continue
            slot = f"{serial}:{energy}"
            watts = _watts(roles.get(power))
            counter = counters.get(slot)
            if watts is None:
                if counter is not None:
                    _publish_battery(device, energy, counter)
                continue
            if counter is None:
                counter = Counter(source=energy)
                counters[slot] = counter
                changed = True
            if _advance(counters, slot, watts, now, limit, energy):
                changed = True
            _publish_battery(device, energy, counters[slot])
    return changed


def _publish_battery(device: Any, role: str, counter: Counter) -> None:
    device.roles[role] = counter.kwh
    derived = getattr(device, "derived", None)
    if isinstance(derived, set):
        derived.add(role)


def _finite(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if not math.isfinite(value):
        return None
    return float(value)


class _DcEnergy:
    """Mixin under the sleep wrapper: integrate only a successful live update. @zara"""

    async def _async_update_data(self) -> Any:
        data = await super()._async_update_data()  # type: ignore[misc]
        if isinstance(data, dict):
            from homeassistant.util import dt as dt_util  # noqa: PLC0415

            from .site import ensure_site_sources  # noqa: PLC0415

            holder = await ensure_site_sources(self.hass)  # type: ignore[attr-defined]
            # A night substitute publishes power as available 0 W, so a state
            # change cannot tell a live zero from sleep. This mixin sits under
            # SleepAware and therefore only sees a successful live update.
            now = dt_util.utcnow()
            changed = integrate(
                data,
                now,
                self.update_interval,  # type: ignore[attr-defined]
                holder.tracker.dc_energy,
                holder.tracker.vendor_solar,
                holder.tracker.solar_days,
            )
            changed = (
                integrate_battery(
                    data,
                    now,
                    self.update_interval,  # type: ignore[attr-defined]
                    holder.tracker.battery_energy,
                )
                or changed
            )
            if changed:
                holder.save_readings()
        return data


_AWARE: dict[type, type] = {}


def aware(coordinator_class: type) -> type:
    """Return the coordinator class with DC integration in front of it. @zara"""
    cls = _AWARE.get(coordinator_class)
    if cls is None:
        cls = type(coordinator_class.__name__, (_DcEnergy, coordinator_class), {})
        _AWARE[coordinator_class] = cls
    return cls


def _archive(device: Any) -> set[str]:
    marked = getattr(device, "archive_mppt", None)
    if isinstance(marked, set):
        return marked
    return set()


def _watts(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    if not math.isfinite(value):
        return None
    return max(0.0, float(value))


def _serial(device: Any, key: Any) -> str | None:
    serial = getattr(device, "serial", None)
    if isinstance(serial, str) and serial:
        return serial
    if isinstance(key, str) and key:
        return key
    return None


def _local_day(moment: datetime) -> str:
    """Local calendar day of an aware timestamp. @zara"""
    from homeassistant.util import dt as dt_util  # noqa: PLC0415

    return dt_util.as_local(moment).date().isoformat()


def _roll_today(counter: Counter, now: datetime) -> bool:
    """Zero the day counter when the local day changed. @zara"""
    day = _local_day(now)
    if counter.day == day:
        return False
    counter.today = 0.0
    counter.day = day
    return True


def _seconds_today(start: datetime, end: datetime) -> float:
    """Seconds of ``start`` → ``end`` that fall on the local day of ``end``. @zara"""
    from homeassistant.util import dt as dt_util  # noqa: PLC0415

    end_local = dt_util.as_local(end)
    start_local = dt_util.as_local(start)
    elapsed = (end - start).total_seconds()
    if start_local.date() == end_local.date():
        return elapsed
    midnight = datetime.combine(
        end_local.date(), time.min, tzinfo=end_local.tzinfo
    )
    after = (end - midnight.astimezone(end.tzinfo)).total_seconds()
    return max(0.0, min(elapsed, after))


def _owned(device: Any) -> set[str]:
    derived = getattr(device, "derived", None)
    if isinstance(derived, set):
        return derived
    return set()


def _fill_vendor_today(
    device: Any,
    serial: str,
    now: datetime,
    days: dict[str, Any],
    owned: set[str],
) -> bool:
    """Publish the rise of a vendor total since local midnight. @zara

    The first local day has no baseline, so no day value is published. A vendor
    ``energy_solar_today`` is left as it is.
    """
    roles = device.roles
    if SOLAR_TODAY in roles and SOLAR_TODAY not in owned:
        return False
    total = _finite(roles.get(SOLAR_TOTAL))
    if total is None or total < 0:
        return False
    state, value = apply_reading(days.get(serial), total, _local_day(now))
    changed = False
    if state is not None and state != days.get(serial):
        days[serial] = state
        changed = True
    if value is None:
        return changed
    if roles.get(SOLAR_TODAY) != value:
        roles[SOLAR_TODAY] = value
        changed = True
    if SOLAR_TODAY not in owned:
        owned.add(SOLAR_TODAY)
        changed = True
    return changed


def _publish(device: Any, counter: Counter) -> None:
    device.roles[SOLAR_TOTAL] = counter.kwh
    device.roles[SOLAR_TODAY] = counter.today
    derived = getattr(device, "derived", None)
    if isinstance(derived, set):
        derived.add(SOLAR_TOTAL)
        derived.add(SOLAR_TODAY)
    if counter.source:
        device.dc_source = counter.source


def _parse_counter(serial: Any, item: Any) -> Counter | None:
    if not isinstance(serial, str) or not serial or not isinstance(item, dict):
        return None
    kwh = item.get("kwh")
    if isinstance(kwh, bool) or not isinstance(kwh, int | float):
        return None
    if not math.isfinite(kwh) or kwh < 0:
        return None
    source = item.get("source", "")
    if source not in ("", SOURCE_MPPT, SOURCE_SOLAR, CHARGE_ENERGY, DISCHARGE_ENERGY):
        return None
    has_at = "at" in item and item.get("at") is not None
    has_watts = "watts" in item and item.get("watts") is not None
    if has_at != has_watts:
        return None
    at = _parse_time(item.get("at")) if has_at else None
    parsed_watts = _watts(item.get("watts")) if has_watts else None
    if has_at and (at is None or parsed_watts is None):
        return None
    today = 0.0
    day = ""
    if "day" in item or "today" in item:
        raw_day = item.get("day", "")
        raw_today = item.get("today", 0.0)
        if not isinstance(raw_day, str) or not raw_day:
            return None
        try:
            datetime.fromisoformat(raw_day)
        except ValueError:
            return None
        if isinstance(raw_today, bool) or not isinstance(raw_today, int | float):
            return None
        if not math.isfinite(raw_today) or raw_today < 0:
            return None
        today = float(raw_today)
        day = raw_day
    return Counter(float(kwh), at, parsed_watts, source, today, day)


def _parse_time(value: Any) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return None
    return parsed
