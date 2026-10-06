# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

"""Derive today's energy from counters that only publish a running total.

Many heat-pump sources never expose a daily value.  EMS-ESP publishes
``metertotal`` and ``nrgconscomptotal`` as ``state_class: total_increasing``,
and most Modbus bridges, Shellys and Tasmota meters behave the same way.  EAI
needs "today", so such a counter is tracked against a local-midnight baseline
instead of being rejected during setup.

The module stays free of Home Assistant imports so the derivation is unit
testable on its own, exactly like :mod:`setup_state` and :mod:`sensor_mapping`.

@zara
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from math import isfinite
from typing import Any

from .const import (
    CONF_ENERGY_COUNTER_MODE,
    CUMULATIVE_ENERGY_STATE_CLASSES,
    DEFAULT_ENERGY_COUNTER_MODE,
    ENERGY_COUNTER_MODE_AUTO,
    ENERGY_COUNTER_MODE_CUMULATIVE,
    ENERGY_COUNTER_MODE_DAILY,
    SUPPORTED_ENERGY_COUNTER_MODES,
)

STATE_SCHEMA_VERSION = 1
MAX_TRACKED_ENTITIES = 16

# Home Assistant treats a drop below 90 % of the previous value of a
# ``total_increasing`` sensor as a counter restart.  Mirroring that threshold
# keeps EAI consistent with the recorder and ignores rounding jitter, which a
# strict ``value < previous`` test would misread as a meter replacement.
_RESET_RATIO = 0.9

# A rise faster than the plant can deliver is a sensor glitch, not consumption.
# Electrical ceilings use the heating capacity in kW, not capacity/COP, plus
# room for a heating element. Heat meters are allowed much more. An unknown
# plant keeps a high fixed ceiling so a short spike is still rejected.
_ELECTRICAL_CAPACITY_FACTOR = 2.0
_HEATING_ELEMENT_RESERVE_KW = 9.0
_THERMAL_CAPACITY_FACTOR = 10.0
_THERMAL_RISE_FLOOR_KW = 100.0
_FALLBACK_RISE_LIMIT_KW = 250.0
_RISE_TOLERANCE_KWH = 0.05

_ENERGY_UNIT_FACTORS_KWH = {
    "kwh": 1.0,
    "kilowatt_hour": 1.0,
    "kilowatt-hours": 1.0,
    "wh": 0.001,
    "watt_hour": 0.001,
    "watt-hours": 0.001,
    "mwh": 1000.0,
    "megawatt_hour": 1000.0,
    "megawatt-hours": 1000.0,
}


def energy_to_kwh(value: Any, unit: Any) -> float | None:
    """Return ``value`` in kWh, or ``None`` when it is not usable energy."""
    if isinstance(value, bool):
        return None
    try:
        parsed = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None
    if not isfinite(parsed):
        return None
    factor = _ENERGY_UNIT_FACTORS_KWH.get(str(unit or "").strip().lower())
    return parsed * factor if factor is not None else None


def is_cumulative_state_class(state_class: Any) -> bool:
    """Return whether a state class describes a running total, not a day value."""
    return str(state_class or "").strip().lower() in CUMULATIVE_ENERGY_STATE_CLASSES


def configured_energy_counter_mode(config: dict[str, Any] | None) -> str:
    """Return the validated user override for energy-counter interpretation."""
    value = (config or {}).get(CONF_ENERGY_COUNTER_MODE, DEFAULT_ENERGY_COUNTER_MODE)
    normalized = str(value or "").strip().lower()
    return (
        normalized
        if normalized in SUPPORTED_ENERGY_COUNTER_MODES
        else DEFAULT_ENERGY_COUNTER_MODE
    )


def counter_rise_limit_kw(kind: str, heating_capacity_kw: float | None) -> float:
    """Return the kW ceiling for one counter's plausible rise.

    ``electrical`` follows the configured heating capacity. ``thermal`` is
    higher because the same plant moves more heat than electricity. Any other
    kind, or a missing capacity, uses the fixed fallback.
    """
    capacity = _positive_capacity_kw(heating_capacity_kw)
    if kind == "thermal":
        if capacity is None:
            return _FALLBACK_RISE_LIMIT_KW
        return max(_THERMAL_RISE_FLOOR_KW, capacity * _THERMAL_CAPACITY_FACTOR)
    if kind == "electrical" and capacity is not None:
        return capacity * _ELECTRICAL_CAPACITY_FACTOR + _HEATING_ELEMENT_RESERVE_KW
    return _FALLBACK_RISE_LIMIT_KW


def _positive_capacity_kw(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not isfinite(parsed) or parsed <= 0:
        return None
    return parsed


def _as_utc(value: datetime | None) -> datetime | None:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_observed_at(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return _as_utc(value)
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return _as_utc(parsed)


def _rise_allowance_kwh(
    previous_at: datetime | None,
    observed_at: datetime | None,
    max_rise_kw: float | None,
) -> float | None:
    """Return the kWh a counter may add between two stamps.

    ``None`` means the interval is not checked: a timestamp is missing, the
    limit is unusable, or the clock did not move forward.
    """
    start = _as_utc(previous_at)
    end = _as_utc(observed_at)
    if isinstance(max_rise_kw, bool) or max_rise_kw is None:
        return None
    try:
        limit_kw = float(max_rise_kw)
    except (TypeError, ValueError):
        return None
    if start is None or end is None or not isfinite(limit_kw) or limit_kw <= 0:
        return None
    elapsed_hours = (end - start).total_seconds() / 3600.0
    if elapsed_hours <= 0:
        return None
    return limit_kw * elapsed_hours + _RISE_TOLERANCE_KWH


def _implausible_counter_rise(
    *,
    rise_kwh: float,
    previous_at: datetime | None,
    observed_at: datetime | None,
    max_rise_kw: float | None,
) -> bool:
    """Return whether ``rise_kwh`` cannot happen in the known interval.

    Missing timestamps (a restart, or state saved before this check existed)
    and a non-positive interval skip the check.
    """
    if not isfinite(rise_kwh) or rise_kwh <= 0:
        return False
    allowance = _rise_allowance_kwh(previous_at, observed_at, max_rise_kw)
    if allowance is None:
        return False
    return rise_kwh > allowance


def _continues_counter(
    counter: float,
    last: float,
    previous_at: datetime | None,
    observed_at: datetime | None,
    max_rise_kw: float | None,
) -> bool:
    """Return whether ``counter`` can follow the accepted reading ``last``."""
    if counter < last * _RESET_RATIO:
        return False
    return not _implausible_counter_rise(
        rise_kwh=counter - last,
        previous_at=previous_at,
        observed_at=observed_at,
        max_rise_kw=max_rise_kw,
    )


def _confirms_pending(
    counter: float,
    pending: dict[str, Any],
    observed_at: datetime | None,
    max_rise_kw: float | None,
) -> bool:
    """Return whether ``counter`` continues the rejected sample, not the old meter.

    The rate is measured from the pending stamp. A long gap back to the last
    accepted reading must not turn that rejected sample into consumption.
    """
    try:
        pending_value = float(pending["value"])
    except (KeyError, TypeError, ValueError):
        return False
    if not isfinite(pending_value) or pending_value < 0:
        return False
    if counter < pending_value * _RESET_RATIO:
        return False
    allowance = _rise_allowance_kwh(
        pending.get("observed_at"), observed_at, max_rise_kw
    )
    if allowance is None:
        return False
    return abs(counter - pending_value) <= allowance


def _parse_pending(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    try:
        pending_value = float(value["value"])
    except (KeyError, TypeError, ValueError):
        return None
    if not isfinite(pending_value) or pending_value < 0:
        return None
    return {
        "value": pending_value,
        "observed_at": _parse_observed_at(value.get("observed_at")),
    }


def _parse_anchor(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    try:
        baseline = float(value["baseline"])
        last = float(value["last"])
        carry = float(value["carry"])
    except (KeyError, TypeError, ValueError):
        return None
    if not all(isfinite(item) for item in (baseline, last, carry)) or min(
        baseline, last, carry
    ) < 0:
        return None
    return {
        "baseline": baseline,
        "last": last,
        "carry": carry,
        "observed_at": _parse_observed_at(value.get("observed_at")),
    }


def _export_pending(value: Any) -> dict[str, Any] | None:
    pending = _parse_pending(value)
    if pending is None:
        return None
    exported: dict[str, Any] = {"value": pending["value"]}
    observed = _as_utc(pending.get("observed_at"))
    if observed is not None:
        exported["observed_at"] = observed.isoformat()
    return exported


def _export_anchor(value: Any) -> dict[str, Any] | None:
    anchor = _parse_anchor(value)
    if anchor is None:
        return None
    exported: dict[str, Any] = {
        "baseline": anchor["baseline"],
        "last": anchor["last"],
        "carry": anchor["carry"],
    }
    observed = _as_utc(anchor.get("observed_at"))
    if observed is not None:
        exported["observed_at"] = observed.isoformat()
    return exported


def resolve_energy_counter_mode(
    config: dict[str, Any] | None, state_class: Any
) -> str:
    """Return how one assigned energy entity has to be read.

    ``auto`` is the default because it costs the customer no question: a
    cumulative state class is recognised from the entity itself.  The explicit
    modes stay available for sources that publish a misleading state class.
    """
    configured = configured_energy_counter_mode(config)
    if configured != ENERGY_COUNTER_MODE_AUTO:
        return configured
    return (
        ENERGY_COUNTER_MODE_CUMULATIVE
        if is_cumulative_state_class(state_class)
        else ENERGY_COUNTER_MODE_DAILY
    )


@dataclass(frozen=True, slots=True)
class DerivedDailyEnergy:
    """Today's consumption derived from a cumulative counter."""

    kwh: float
    counter_kwh: float
    baseline_kwh: float
    carry_kwh: float
    local_date: str
    complete: bool

    @property
    def origin(self) -> str:
        """Return the diagnostic origin shown in EAI insights."""
        return (
            "derived_from_cumulative_counter"
            if self.complete
            else "derived_from_cumulative_counter_partial_day"
        )


class DailyEnergyTracker:
    """Track local-midnight baselines for cumulative energy counters.

    The tracker is deliberately synchronous and side-effect free so it can be
    called from the read path of the insights engine.  Persistence is the
    caller's job: :meth:`export_state` and :meth:`restore_state` round-trip the
    baselines through the entry-scoped store, which is what keeps a value
    correct across a Home Assistant restart in the middle of a day.
    """

    def __init__(self) -> None:
        self._entries: dict[str, dict[str, Any]] = {}
        self._dirty = False

    @property
    def dirty(self) -> bool:
        """Return whether a baseline changed since the last export."""
        return self._dirty

    def observe(
        self,
        entity_id: str,
        *,
        value: Any,
        unit: Any,
        local_date: date,
        observed_at: datetime | None = None,
        max_rise_kw: float | None = None,
    ) -> DerivedDailyEnergy | None:
        """Fold one counter reading into today's total for ``entity_id``.

        A rise the plant cannot deliver is kept only as ``pending``. It does
        not move the last accepted reading, its baseline, its carry, or its
        timestamp. The next reading either continues that accepted reading,
        confirms the pending sample as a replaced meter, or follows the
        existing 90 % restart against the accepted reading. Without a previous
        timestamp the rise is kept.
        """
        if not isinstance(entity_id, str) or not entity_id:
            return None
        counter = energy_to_kwh(value, unit)
        if counter is None or counter < 0:
            return None
        observed = _as_utc(observed_at)
        today = local_date.isoformat()
        entry = self._entries.get(entity_id)
        if entry is None:
            if len(self._entries) >= MAX_TRACKED_ENTITIES:
                self._forget_oldest()
            entry = {
                "date": today,
                "baseline": counter,
                "last": counter,
                "carry": 0.0,
                "complete": False,
                "observed_at": observed,
                "pending": None,
                "anchor": None,
            }
            self._entries[entity_id] = entry
            self._dirty = True
            return self._result(entity_id, entry)

        rolled = False
        if entry.get("date") != today:
            # A new local day starts at the last accepted value from before
            # midnight, never at a reading this call is about to reject.
            last = entry.get("last")
            entry["baseline"] = (
                last if isinstance(last, float) and last <= counter else counter
            )
            entry["carry"] = 0.0
            entry["date"] = today
            entry["complete"] = True
            entry["pending"] = None
            entry["anchor"] = None
            rolled = True
            self._dirty = True

        last = entry.get("last")
        if not isinstance(last, float):
            return None
        pending = entry.get("pending")
        anchor = entry.get("anchor")
        if (
            not rolled
            and isinstance(pending, dict)
            and _confirms_pending(counter, pending, observed, max_rise_kw)
        ):
            self._rebase_on_pending(entry, counter, observed)
        elif _continues_counter(
            counter, last, entry.get("observed_at"), observed, max_rise_kw
        ):
            self._accept(entry, counter, observed)
        elif (
            not rolled
            and isinstance(anchor, dict)
            and _continues_counter(
                counter,
                float(anchor["last"]),
                anchor.get("observed_at"),
                observed,
                max_rise_kw,
            )
        ):
            self._resume_anchor(entry, counter, observed)
        elif not rolled and counter < last * _RESET_RATIO:
            self._restart_counter(entry, counter, observed)
        elif _implausible_counter_rise(
            rise_kwh=counter - last,
            previous_at=entry.get("observed_at"),
            observed_at=observed,
            max_rise_kw=max_rise_kw,
        ):
            self._remember_pending(entry, counter, observed)
        else:
            self._accept(entry, counter, observed)
        return self._result(entity_id, entry)

    def _accept(
        self, entry: dict[str, Any], counter: float, observed: datetime | None
    ) -> None:
        if entry.get("pending") is not None or entry.get("anchor") is not None:
            entry["pending"] = None
            entry["anchor"] = None
            self._dirty = True
        if entry.get("last") != counter:
            entry["last"] = counter
            self._dirty = True
        if observed is not None and entry.get("observed_at") != observed:
            entry["observed_at"] = observed
            self._dirty = True

    def _remember_pending(
        self, entry: dict[str, Any], counter: float, observed: datetime | None
    ) -> None:
        entry["pending"] = {"value": counter, "observed_at": observed}
        self._dirty = True

    def _rebase_on_pending(
        self, entry: dict[str, Any], counter: float, observed: datetime | None
    ) -> None:
        """Start a replaced meter at this reading and keep energy already counted.

        Movement from the pending sample to this reading is real consumption
        on the new meter. The jump away from the previous meter is not.
        """
        pending_value = float(entry["pending"]["value"])
        counted = float(entry.get("carry") or 0.0) + max(
            float(entry.get("last") or 0.0) - float(entry.get("baseline") or 0.0),
            0.0,
        )
        entry["carry"] = counted + max(counter - pending_value, 0.0)
        entry["baseline"] = counter
        entry["last"] = counter
        entry["observed_at"] = observed
        entry["pending"] = None
        entry["anchor"] = None
        self._dirty = True

    def _restart_counter(
        self, entry: dict[str, Any], counter: float, observed: datetime | None
    ) -> None:
        """Apply the 90 % restart against the last accepted reading."""
        last = float(entry["last"])
        baseline = float(entry.get("baseline") or 0.0)
        carry = float(entry.get("carry") or 0.0)
        entry["anchor"] = {
            "baseline": baseline,
            "last": last,
            "carry": carry,
            "observed_at": entry.get("observed_at"),
        }
        entry["carry"] = carry + max(last - baseline, 0.0)
        entry["baseline"] = 0.0
        entry["last"] = counter
        entry["observed_at"] = observed
        entry["pending"] = None
        self._dirty = True

    def _resume_anchor(
        self, entry: dict[str, Any], counter: float, observed: datetime | None
    ) -> None:
        """Drop a restart that the following reading shows was a glitch."""
        anchor = entry["anchor"]
        entry["baseline"] = float(anchor["baseline"])
        entry["carry"] = float(anchor["carry"])
        entry["last"] = counter
        entry["observed_at"] = observed
        entry["anchor"] = None
        entry["pending"] = None
        self._dirty = True

    def export_state(self) -> dict[str, Any]:
        """Return a JSON-safe snapshot of every tracked baseline."""
        self._dirty = False
        return {
            "schema_version": STATE_SCHEMA_VERSION,
            "counters": {
                entity_id: self._export_entry(entry)
                for entity_id, entry in self._entries.items()
            },
        }

    def restore_state(self, payload: Any) -> None:
        """Restore baselines written by a previous run, ignoring bad payloads."""
        if (
            not isinstance(payload, dict)
            or payload.get("schema_version") != STATE_SCHEMA_VERSION
        ):
            return
        counters = payload.get("counters")
        if not isinstance(counters, dict):
            return
        restored: dict[str, dict[str, Any]] = {}
        for entity_id, raw in tuple(counters.items())[:MAX_TRACKED_ENTITIES]:
            entry = self._sanitized_entry(entity_id, raw)
            if entry is not None:
                restored[entity_id] = entry
        self._entries = restored
        self._dirty = False

    @staticmethod
    def _sanitized_entry(entity_id: Any, raw: Any) -> dict[str, Any] | None:
        if not isinstance(entity_id, str) or not entity_id or not isinstance(raw, dict):
            return None
        try:
            baseline = float(raw["baseline"])
            last = float(raw["last"])
            carry = float(raw["carry"])
        except (KeyError, TypeError, ValueError):
            return None
        stored_date = raw.get("date")
        if (
            not isinstance(stored_date, str)
            or not all(isfinite(value) for value in (baseline, last, carry))
            or min(baseline, last, carry) < 0
        ):
            return None
        try:
            date.fromisoformat(stored_date)
        except ValueError:
            return None
        return {
            "date": stored_date,
            "baseline": baseline,
            "last": last,
            "carry": carry,
            "complete": bool(raw.get("complete")),
            "observed_at": _parse_observed_at(raw.get("observed_at")),
            "pending": _parse_pending(raw.get("pending")),
            "anchor": _parse_anchor(raw.get("anchor")),
        }

    @staticmethod
    def _export_entry(entry: dict[str, Any]) -> dict[str, Any]:
        exported = {
            "date": entry["date"],
            "baseline": entry["baseline"],
            "last": entry["last"],
            "carry": entry["carry"],
            "complete": bool(entry.get("complete")),
        }
        observed = _as_utc(entry.get("observed_at"))
        if observed is not None:
            exported["observed_at"] = observed.isoformat()
        pending = _export_pending(entry.get("pending"))
        if pending is not None:
            exported["pending"] = pending
        anchor = _export_anchor(entry.get("anchor"))
        if anchor is not None:
            exported["anchor"] = anchor
        return exported

    def _forget_oldest(self) -> None:
        oldest = min(self._entries, key=lambda key: self._entries[key]["date"])
        del self._entries[oldest]

    def _result(self, entity_id: str, entry: dict[str, Any]) -> DerivedDailyEnergy:
        counter = float(entry["last"])
        baseline = float(entry["baseline"])
        carry = float(entry["carry"])
        return DerivedDailyEnergy(
            kwh=carry + max(counter - baseline, 0.0),
            counter_kwh=counter,
            baseline_kwh=baseline,
            carry_kwh=carry,
            local_date=str(entry["date"]),
            complete=bool(entry.get("complete")),
        )


__all__ = [
    "DailyEnergyTracker",
    "DerivedDailyEnergy",
    "ENERGY_COUNTER_MODE_AUTO",
    "ENERGY_COUNTER_MODE_CUMULATIVE",
    "ENERGY_COUNTER_MODE_DAILY",
    "STATE_SCHEMA_VERSION",
    "configured_energy_counter_mode",
    "counter_rise_limit_kw",
    "energy_to_kwh",
    "is_cumulative_state_class",
    "resolve_energy_counter_mode",
]
