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
from datetime import date
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
    ) -> DerivedDailyEnergy | None:
        """Fold one counter reading into today's total for ``entity_id``."""
        if not isinstance(entity_id, str) or not entity_id:
            return None
        counter = energy_to_kwh(value, unit)
        if counter is None or counter < 0:
            return None
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
            }
            self._entries[entity_id] = entry
            self._dirty = True
            return self._result(entity_id, entry)

        last = entry.get("last")
        if entry.get("date") != today:
            # A new local day starts at the last value seen before midnight.
            # Using the current reading instead would discard everything the
            # counter accumulated between midnight and this observation.
            entry["baseline"] = (
                last if isinstance(last, float) and last <= counter else counter
            )
            entry["carry"] = 0.0
            entry["date"] = today
            entry["complete"] = True
            self._dirty = True
        elif isinstance(last, float) and counter < last * _RESET_RATIO:
            # The counter restarted. Everything already attributed to today is
            # kept as carry, and growth is measured from zero again.
            entry["carry"] = float(entry.get("carry") or 0.0) + max(
                last - float(entry.get("baseline") or 0.0), 0.0
            )
            entry["baseline"] = 0.0
            self._dirty = True

        if entry.get("last") != counter:
            entry["last"] = counter
            self._dirty = True
        return self._result(entity_id, entry)

    def export_state(self) -> dict[str, Any]:
        """Return a JSON-safe snapshot of every tracked baseline."""
        self._dirty = False
        return {
            "schema_version": STATE_SCHEMA_VERSION,
            "counters": {
                entity_id: {
                    "date": entry["date"],
                    "baseline": entry["baseline"],
                    "last": entry["last"],
                    "carry": entry["carry"],
                    "complete": bool(entry.get("complete")),
                }
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
        }

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
    "energy_to_kwh",
    "is_cumulative_state_class",
    "resolve_energy_counter_mode",
]
