# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""
Warp Core V16.2.0 - Main Simulation Entry Point.

Setup, Unload, Remove, and Migration protocols for the Warp Core Simulation Engine.
Starfleet Service Registration and containment event logging configuration.
All telemetry operations use TelemetryManager (transactional subspace database).

@starfleet-engineering
"""


# PyArmor Runtime Path Setup - MUST be before any protected module imports
import sys
from pathlib import Path as _Path
_runtime_path = str(_Path(__file__).parent)
if _runtime_path not in sys.path:
    sys.path.insert(0, _runtime_path)

# Pre-load PyArmor runtime at module level (before async event loop)
try:
    import pyarmor_runtime_009810  # noqa: F401
except ImportError:
    pass  # Runtime not present (development mode)

import atexit
import asyncio
import logging
import queue
from dataclasses import dataclass, field
from datetime import timedelta
from logging.handlers import QueueHandler, QueueListener, RotatingFileHandler
from pathlib import Path
from typing import Any, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import (
    CONF_PANEL_GROUP_AZIMUTH,
    CONF_PANEL_GROUP_ENERGY_SENSOR,
    CONF_PANEL_GROUP_NAME,
    CONF_PANEL_GROUP_POWER,
    CONF_PANEL_GROUP_TILT,
    CONF_PANEL_GROUPS,
    DOMAIN,
    PLATFORMS,
    VERSION,
)
from .core.core_helpers import SafeDateTimeUtil as dt_util

_LOGGER = logging.getLogger(__name__)

# File logging globals @zara
_log_queue_listener: Optional[QueueListener] = None
_log_queue_handler: Optional[QueueHandler] = None
_logging_initialized: bool = False


async def _migrate_db_remove_default_panel_group(data_manager: "DataManager") -> bool:
    """V16 Migration: Remove obsolete 'Default' panel group from database. @zara

    Since V13, panel groups must be explicitly named. Pre-V13 installations may
    still have a 'Default' group that can contaminate forecasts and calibration.

    This migration uses DatabaseManager instead of JSON files.

    Returns:
        True if any changes were made, False if already clean.
    """
    changes_made = False

    try:
        db = data_manager._db_manager

        # Clean physics_calibration_groups @zara
        result = await db.fetchone(
            "SELECT COUNT(*) FROM physics_calibration_groups WHERE group_name = 'Default'"
        )
        if result and result[0] > 0:
            await db.execute(
                "DELETE FROM physics_calibration_groups WHERE group_name = 'Default'"
            )
            await db.execute(
                "DELETE FROM physics_calibration_hourly WHERE group_name = 'Default'"
            )
            await db.execute(
                "DELETE FROM physics_calibration_buckets WHERE group_name = 'Default'"
            )
            await db.execute(
                "DELETE FROM physics_calibration_bucket_hourly WHERE group_name = 'Default'"
            )
            _LOGGER.info("V16 Migration: Removed 'Default' from physics calibration tables")
            changes_made = True

        # Clean physics_calibration_history @zara
        result = await db.fetchone(
            "SELECT COUNT(*) FROM physics_calibration_history WHERE group_name = 'Default'"
        )
        if result and result[0] > 0:
            await db.execute(
                "DELETE FROM physics_calibration_history WHERE group_name = 'Default'"
            )
            _LOGGER.info("V16 Migration: Removed 'Default' from calibration history")
            changes_made = True

        if changes_made:
            _LOGGER.info("V16 Migration: 'Default' panel group cleanup completed")
        else:
            _LOGGER.debug("V16 Migration: No 'Default' panel group found - data already clean")

    except Exception as e:
        _LOGGER.warning(f"V16 Migration failed (non-critical): {e}")

    return changes_made


# ---------------------------------------------------------------------------
# Panel Group Migration System — Fingerprint-based Matching @zara
# ---------------------------------------------------------------------------

_ALL_GROUP_TABLES = [
    ("physics_calibration_groups", "group_name"),
    ("physics_calibration_hourly", "group_name"),
    ("physics_calibration_buckets", "group_name"),
    ("physics_calibration_bucket_hourly", "group_name"),
    ("physics_calibration_history", "group_name"),
    ("ensemble_group_weights", "group_name"),
    ("group_method_performance", "group_name"),
    ("shadow_pattern_hourly", "group_name"),
    ("shadow_pattern_seasonal", "group_name"),
    ("shadow_learning_history", "group_name"),
    ("shadow_detection_groups", "group_name"),
    ("prediction_panel_groups", "group_name"),
    ("panel_group_daily_cache", "group_name"),
    ("panel_group_daily_hourly", "group_name"),
    ("panel_group_sensor_state", "group_name"),
    ("snow_tracking_groups", "group_name"),
    ("astronomy_cache_panel_groups", "group_name"),
    ("hourly_panel_group_accuracy", "group_name"),
    ("multi_day_hourly_forecast_panels", "group_name"),
    ("drift_metrics_rolling", "scope"),
    ("drift_metrics_bucket", "scope"),
    ("drift_events", "scope"),
    ("drift_cusum_state", "scope"),
]


@dataclass
class _GroupRename:
    old_name: str
    new_name: str


@dataclass
class _GroupDonor:
    donor_name: str
    new_name: str
    capacity_ratio: float


@dataclass
class _MigrationPlan:
    renames: list[_GroupRename] = field(default_factory=list)
    donors: list[_GroupDonor] = field(default_factory=list)
    new_groups: list[str] = field(default_factory=list)
    removed_groups: list[str] = field(default_factory=list)
    ai_invalidation_required: bool = False

    @property
    def has_changes(self) -> bool:
        return bool(
            any(r.old_name != r.new_name for r in self.renames)
            or self.donors or self.new_groups or self.removed_groups
        )

    @property
    def needs_ai_invalidation(self) -> bool:
        return self.ai_invalidation_required


def _orientation_match(a: dict, b: dict, tol: float = 0.5) -> bool:
    az_a = float(a.get("azimuth", a.get(CONF_PANEL_GROUP_AZIMUTH, 180.0)) or 180.0)
    az_b = float(b.get("azimuth", b.get(CONF_PANEL_GROUP_AZIMUTH, 180.0)) or 180.0)
    tl_a = float(a.get("tilt", a.get(CONF_PANEL_GROUP_TILT, 30.0)) or 30.0)
    tl_b = float(b.get("tilt", b.get(CONF_PANEL_GROUP_TILT, 30.0)) or 30.0)

    az_diff = abs(((az_a - az_b + 180.0) % 360.0) - 180.0)
    tilt_diff = abs(tl_a - tl_b)

    az_tol = max(tol, max(abs(az_a), abs(az_b), 1.0) * 0.05)
    tilt_tol = max(tol, max(abs(tl_a), abs(tl_b), 1.0) * 0.05)

    return az_diff <= az_tol and tilt_diff <= tilt_tol


def _get_power(g: dict) -> float:
    if "power_wp" in g:
        return g["power_wp"]
    if CONF_PANEL_GROUP_POWER in g:
        return g[CONF_PANEL_GROUP_POWER]
    return 0.0


def _get_name(g: dict) -> str:
    return g.get("name", g.get(CONF_PANEL_GROUP_NAME, ""))


def _get_sensor(g: dict) -> str:
    return g.get("energy_sensor", g.get(CONF_PANEL_GROUP_ENERGY_SENSOR, ""))


def _power_ratio(a: dict, b: dict) -> float | None:
    a_pw = _get_power(a)
    b_pw = _get_power(b)
    if a_pw <= 0 or b_pw <= 0:
        return None
    hi = max(a_pw, b_pw)
    lo = min(a_pw, b_pw)
    return lo / hi if hi > 0 else None


def _scaled_count(value: float | int | None, ratio: float) -> int:
    if value is None:
        return 0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0
    scaled = numeric * min(max(ratio, 0.0), 1.0)
    return max(1, int(round(scaled))) if numeric > 0 and ratio > 0 else 0


def _scaled_confidence(value: float | None, ratio: float) -> float:
    if value is None:
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, numeric * min(max(ratio, 0.0), 1.0)))


def _match_score(old_group: dict, new_group: dict) -> tuple[float, float, float, int]:
    old_az = float(old_group.get("azimuth", old_group.get(CONF_PANEL_GROUP_AZIMUTH, 180.0)) or 180.0)
    new_az = float(new_group.get("azimuth", new_group.get(CONF_PANEL_GROUP_AZIMUTH, 180.0)) or 180.0)
    old_tilt = float(old_group.get("tilt", old_group.get(CONF_PANEL_GROUP_TILT, 30.0)) or 30.0)
    new_tilt = float(new_group.get("tilt", new_group.get(CONF_PANEL_GROUP_TILT, 30.0)) or 30.0)

    az_diff = abs(((old_az - new_az + 180.0) % 360.0) - 180.0)
    tilt_diff = abs(old_tilt - new_tilt)
    ratio = _power_ratio(old_group, new_group)
    power_penalty = 1.0 - ratio if ratio is not None else 0.5
    sensor_match = int(bool(_get_sensor(old_group)) and _get_sensor(old_group) == _get_sensor(new_group))
    return (az_diff + tilt_diff, power_penalty, abs(_get_power(old_group) - _get_power(new_group)), -sensor_match)


def _requires_ai_invalidation(old_groups: list[dict], new_groups: list[dict]) -> bool:
    if len(old_groups) != len(new_groups):
        return True

    for old_group, new_group in zip(old_groups, new_groups):
        if not _orientation_match(old_group, new_group):
            return True
        ratio = _power_ratio(old_group, new_group)
        if ratio is not None and ratio < 0.95:
            return True

    return False


async def _load_old_config_from_db(db) -> list[dict]:
    try:
        rows = await db.fetchall(
            "SELECT group_name, power_wp, azimuth, tilt, energy_sensor "
            "FROM panel_group_config_snapshot ORDER BY group_name"
        )
        if rows:
            return [
                {"name": r[0], "power_wp": r[1], "azimuth": r[2],
                 "tilt": r[3], "energy_sensor": r[4] or ""}
                for r in rows
            ]
    except Exception:
        pass

    rows = await db.fetchall(
        "SELECT group_name, power_kwp, azimuth_deg, tilt_deg "
        "FROM astronomy_cache_panel_groups "
        "WHERE cache_date = (SELECT MAX(cache_date) FROM astronomy_cache_panel_groups) "
        "GROUP BY group_name ORDER BY group_name"
    )
    if rows:
        return [
            {"name": r[0], "power_wp": r[1] * 1000.0, "azimuth": r[2],
             "tilt": r[3], "energy_sensor": ""}
            for r in rows
        ]

    rows = await db.fetchall(
        "SELECT group_name FROM physics_calibration_groups ORDER BY group_name"
    )
    if rows:
        return [
            {"name": r[0], "power_wp": 0.0, "azimuth": 0.0,
             "tilt": 0.0, "energy_sensor": ""}
            for r in rows
        ]

    return []


def _match_groups(old_groups: list[dict], new_groups: list[dict]) -> _MigrationPlan:
    plan = _MigrationPlan()
    plan.ai_invalidation_required = _requires_ai_invalidation(old_groups, new_groups)
    unmatched_old = set(range(len(old_groups)))
    unmatched_new = set(range(len(new_groups)))

    # Pass 1: Geometry-first 1:1 match. Power is a plausibility check,
    # sensor is only a weak tie-breaker because inverters/sensor entities can change.
    for ni in list(unmatched_new):
        best_oi, best_score = None, None
        for oi in unmatched_old:
            if not _orientation_match(old_groups[oi], new_groups[ni]):
                continue
            score = _match_score(old_groups[oi], new_groups[ni])
            if best_score is None or score < best_score:
                best_oi, best_score = oi, score
        if best_oi is not None:
            plan.renames.append(_GroupRename(
                old_name=_get_name(old_groups[best_oi]),
                new_name=_get_name(new_groups[ni]),
            ))
            unmatched_old.discard(best_oi)
            unmatched_new.discard(ni)

    # Pass 2: Split detection (one old → multiple new, same orientation)
    for oi in list(unmatched_old):
        candidates = [
            ni for ni in unmatched_new
            if _orientation_match(old_groups[oi], new_groups[ni])
        ]
        if not candidates:
            continue
        old_pw = _get_power(old_groups[oi])
        best_ni = min(
            candidates,
            key=lambda ni: abs(_get_power(new_groups[ni]) - old_pw),
        )
        plan.renames.append(_GroupRename(
            old_name=_get_name(old_groups[oi]),
            new_name=_get_name(new_groups[best_ni]),
        ))
        unmatched_old.discard(oi)
        unmatched_new.discard(best_ni)
        for ni in candidates:
            if ni == best_ni or ni not in unmatched_new:
                continue
            new_pw = _get_power(new_groups[ni])
            ratio = new_pw / old_pw if old_pw > 0 else 1.0
            plan.donors.append(_GroupDonor(
                donor_name=_get_name(old_groups[oi]),
                new_name=_get_name(new_groups[ni]),
                capacity_ratio=ratio,
            ))
            unmatched_new.discard(ni)

    # Pass 3: Remaining new groups — find best donor by nearest compatible orientation
    for ni in sorted(unmatched_new):
        best_donor = None
        best_score = None
        ng = new_groups[ni]
        for og in old_groups:
            if not _orientation_match(og, ng, tol=5.0):
                continue
            score = _match_score(og, ng)
            if best_score is None or score < best_score:
                best_donor, best_score = og, score
        if best_donor:
            donor_pw = _get_power(best_donor)
            new_pw = _get_power(ng)
            ratio = new_pw / donor_pw if donor_pw > 0 else 1.0
            plan.donors.append(_GroupDonor(
                donor_name=_get_name(best_donor),
                new_name=_get_name(ng),
                capacity_ratio=ratio,
            ))
        else:
            plan.new_groups.append(_get_name(ng))

    for oi in sorted(unmatched_old):
        plan.removed_groups.append(_get_name(old_groups[oi]))

    return plan


async def _copy_calibration_from_donor(
    db, donor_name: str, target_name: str, capacity_ratio: float
) -> None:
    scaled_ratio = min(max(capacity_ratio, 0.0), 1.0)
    donor_cal = await db.fetchone(
        "SELECT global_factor, sample_count, confidence "
        "FROM physics_calibration_groups WHERE group_name = ?",
        (donor_name,),
    )
    if donor_cal:
        await db.execute(
            "INSERT OR IGNORE INTO physics_calibration_groups "
            "(group_name, global_factor, sample_count, confidence) VALUES (?, ?, ?, ?)",
            (
                target_name,
                donor_cal[0],
                _scaled_count(donor_cal[1], scaled_ratio),
                _scaled_confidence(donor_cal[2], scaled_ratio),
            ),
        )

    await db.execute(
        "INSERT OR IGNORE INTO physics_calibration_hourly (group_name, hour, factor) "
        "SELECT ?, hour, factor FROM physics_calibration_hourly WHERE group_name = ?",
        (target_name, donor_name),
    )
    await db.execute(
        "INSERT OR IGNORE INTO physics_calibration_buckets "
        "(group_name, bucket_name, global_factor, sample_count, confidence) "
        "SELECT ?, bucket_name, global_factor, "
        "MAX(0, CAST(ROUND(sample_count * ?) AS INTEGER)), confidence * ? "
        "FROM physics_calibration_buckets WHERE group_name = ?",
        (target_name, scaled_ratio, scaled_ratio, donor_name),
    )
    await db.execute(
        "INSERT OR IGNORE INTO physics_calibration_bucket_hourly "
        "(group_name, bucket_name, hour, factor) "
        "SELECT ?, bucket_name, hour, factor "
        "FROM physics_calibration_bucket_hourly WHERE group_name = ?",
        (target_name, donor_name),
    )
    await db.execute(
        "INSERT OR IGNORE INTO ensemble_group_weights "
        "(group_name, cloud_bucket, hour_bucket, lstm_weight, ridge_weight, "
        "lstm_mae, ridge_mae, sample_count, last_updated, season) "
        "SELECT ?, cloud_bucket, hour_bucket, lstm_weight, ridge_weight, "
        "lstm_mae, ridge_mae, MAX(0, CAST(ROUND(sample_count * ?) AS INTEGER)), last_updated, season "
        "FROM ensemble_group_weights WHERE group_name = ?",
        (target_name, scaled_ratio, donor_name),
    )
    await db.execute(
        "INSERT OR IGNORE INTO shadow_pattern_hourly "
        "(group_name, hour, shadow_occurrence_rate, avg_shadow_percent, "
        "std_dev_shadow_percent, pct_weather_clouds, pct_building_tree, "
        "pct_low_sun, pct_other, pattern_type, confidence, sample_count, "
        "shadow_days, clear_days, first_learned, last_updated) "
        "SELECT ?, hour, shadow_occurrence_rate, avg_shadow_percent, "
        "std_dev_shadow_percent, pct_weather_clouds, pct_building_tree, "
        "pct_low_sun, pct_other, pattern_type, confidence * ?, "
        "MAX(0, CAST(ROUND(sample_count * ?) AS INTEGER)), "
        "MAX(0, CAST(ROUND(shadow_days * ?) AS INTEGER)), "
        "MAX(0, CAST(ROUND(clear_days * ?) AS INTEGER)), first_learned, last_updated "
        "FROM shadow_pattern_hourly WHERE group_name = ?",
        (target_name, scaled_ratio, scaled_ratio, scaled_ratio, scaled_ratio, donor_name),
    )
    await db.execute(
        "INSERT OR IGNORE INTO shadow_pattern_seasonal "
        "(group_name, month, hour, shadow_occurrence_rate, avg_shadow_percent, "
        "std_dev_shadow_percent, dominant_cause, sample_count, shadow_days, "
        "confidence, last_updated) "
        "SELECT ?, month, hour, shadow_occurrence_rate, avg_shadow_percent, "
        "std_dev_shadow_percent, dominant_cause, "
        "MAX(0, CAST(ROUND(sample_count * ?) AS INTEGER)), "
        "MAX(0, CAST(ROUND(shadow_days * ?) AS INTEGER)), "
        "confidence * ?, last_updated "
        "FROM shadow_pattern_seasonal WHERE group_name = ?",
        (target_name, scaled_ratio, scaled_ratio, scaled_ratio, donor_name),
    )
    await db.execute(
        "INSERT OR IGNORE INTO group_method_performance "
        "(group_name, cloud_bucket, hour_bucket, season, physics_mae, ai_mae, "
        "lstm_mae, ridge_mae, blend_mae, best_method, ai_advantage_factor, "
        "sample_count, last_updated) "
        "SELECT ?, cloud_bucket, hour_bucket, season, physics_mae, ai_mae, "
        "lstm_mae, ridge_mae, blend_mae, best_method, ai_advantage_factor, "
        "MAX(0, CAST(ROUND(sample_count * ?) AS INTEGER)), last_updated "
        "FROM group_method_performance WHERE group_name = ?",
        (target_name, scaled_ratio, donor_name),
    )


async def _initialize_group_defaults(db, group_name: str, tilt: float) -> None:
    await db.execute(
        "INSERT OR IGNORE INTO physics_calibration_groups "
        "(group_name, global_factor, sample_count, confidence) VALUES (?, 1.0, 0, 0.0)",
        (group_name,),
    )
    await db.execute(
        "INSERT OR IGNORE INTO snow_tracking_groups (group_name, tilt_deg) VALUES (?, ?)",
        (group_name, tilt),
    )


async def _invalidate_ai_models(db) -> None:
    for table in ("ai_lstm_weights", "ai_lstm_meta",
                  "ai_ridge_weights", "ai_ridge_meta", "ai_ridge_normalization",
                  "ai_seasonal_archive_weights", "ai_seasonal_archive_meta"):
        try:
            await db.execute(f"DELETE FROM {table}")
        except Exception:
            pass
    try:
        await db.execute("UPDATE ai_learned_weights_meta SET active_model = 'none'")
    except Exception:
        pass
    _LOGGER.info("Panel Group Migration: AI models invalidated — retraining at next cycle")


async def _save_config_snapshot(db, groups: list[dict]) -> None:
    await db.execute("DELETE FROM panel_group_config_snapshot")
    for g in groups:
        await db.execute(
            "INSERT INTO panel_group_config_snapshot "
            "(group_name, power_wp, azimuth, tilt, energy_sensor) VALUES (?, ?, ?, ?, ?)",
            (g["name"], g.get("power_wp", 0.0), g.get("azimuth", 180.0),
             g.get("tilt", 30.0), g.get("energy_sensor") or None),
        )


async def _ensure_snapshot_table(db) -> None:
    await db.execute(
        "CREATE TABLE IF NOT EXISTS panel_group_config_snapshot ("
        "group_name TEXT PRIMARY KEY, "
        "power_wp REAL NOT NULL, "
        "azimuth REAL NOT NULL, "
        "tilt REAL NOT NULL, "
        "energy_sensor TEXT)"
    )


async def _execute_migration(db, plan: _MigrationPlan, new_groups_config: list[dict]) -> None:
    await db.execute("PRAGMA foreign_keys = OFF")
    try:
        renames_needed = [r for r in plan.renames if r.old_name != r.new_name]
        if renames_needed:
            for idx, rename in enumerate(renames_needed):
                temp_name = f"__pgm_temp_{idx}__"
                for table, col in _ALL_GROUP_TABLES:
                    try:
                        await db.execute(
                            f"UPDATE {table} SET {col} = ? WHERE {col} = ?",
                            (temp_name, rename.old_name),
                        )
                    except Exception:
                        pass
            for idx, rename in enumerate(renames_needed):
                temp_name = f"__pgm_temp_{idx}__"
                for table, col in _ALL_GROUP_TABLES:
                    try:
                        await db.execute(
                            f"UPDATE {table} SET {col} = ? WHERE {col} = ?",
                            (rename.new_name, temp_name),
                        )
                    except Exception:
                        pass
                _LOGGER.info(
                    "Panel Group Migration: renamed '%s' → '%s'",
                    rename.old_name, rename.new_name,
                )

        for donor in plan.donors:
            await _copy_calibration_from_donor(
                db, donor.donor_name, donor.new_name, donor.capacity_ratio
            )
            cfg = next(
                (g for g in new_groups_config if g.get("name") == donor.new_name), {}
            )
            tilt = cfg.get("tilt", cfg.get(CONF_PANEL_GROUP_TILT, 30.0))
            await db.execute(
                "INSERT OR IGNORE INTO snow_tracking_groups (group_name, tilt_deg) VALUES (?, ?)",
                (donor.new_name, tilt),
            )
            _LOGGER.info(
                "Panel Group Migration: '%s' from donor '%s' (ratio=%.2f)",
                donor.new_name, donor.donor_name, donor.capacity_ratio,
            )

        for name in plan.new_groups:
            cfg = next((g for g in new_groups_config if g.get("name") == name), {})
            tilt = cfg.get("tilt", cfg.get(CONF_PANEL_GROUP_TILT, 30.0))
            await _initialize_group_defaults(db, name, tilt)
            _LOGGER.info("Panel Group Migration: '%s' created with defaults", name)

        for name in plan.removed_groups:
            for table, col in _ALL_GROUP_TABLES:
                try:
                    await db.execute(f"DELETE FROM {table} WHERE {col} = ?", (name,))
                except Exception:
                    pass
            _LOGGER.info("Panel Group Migration: '%s' removed", name)

        await db.commit()
    finally:
        await db.execute("PRAGMA foreign_keys = ON")


async def _migrate_panel_groups(
    data_manager: "DataManager", panel_groups: list[dict]
) -> dict:
    result = {"renamed": [], "donor": [], "new": [], "removed": [], "ai_reset": False}

    try:
        db = data_manager._db_manager
        await _ensure_snapshot_table(db)

        new_config = []
        for g in panel_groups:
            new_config.append({
                "name": g.get(CONF_PANEL_GROUP_NAME, ""),
                "power_wp": g.get(CONF_PANEL_GROUP_POWER, 0.0),
                "azimuth": g.get(CONF_PANEL_GROUP_AZIMUTH, 180.0),
                "tilt": g.get(CONF_PANEL_GROUP_TILT, 30.0),
                "energy_sensor": g.get(CONF_PANEL_GROUP_ENERGY_SENSOR, ""),
            })

        old_config = await _load_old_config_from_db(db)

        if not old_config:
            _LOGGER.info(
                "Panel Group Migration: first setup — initializing %d groups",
                len(new_config),
            )
            for g in new_config:
                await _initialize_group_defaults(db, g["name"], g["tilt"])
                result["new"].append(g["name"])
            await _save_config_snapshot(db, new_config)
            return result

        plan = _match_groups(old_config, new_config)

        if not plan.has_changes:
            _LOGGER.debug("Panel Group Migration: no changes detected")
            await _save_config_snapshot(db, new_config)
            return result

        for r in plan.renames:
            if r.old_name != r.new_name:
                _LOGGER.info(
                    "Panel Group Migration Plan: RENAME '%s' → '%s'",
                    r.old_name, r.new_name,
                )
        for d in plan.donors:
            _LOGGER.info(
                "Panel Group Migration Plan: DONOR '%s' → '%s' (ratio=%.2f)",
                d.donor_name, d.new_name, d.capacity_ratio,
            )
        for n in plan.new_groups:
            _LOGGER.info("Panel Group Migration Plan: NEW '%s'", n)
        for r in plan.removed_groups:
            _LOGGER.info("Panel Group Migration Plan: REMOVE '%s'", r)

        await _execute_migration(db, plan, new_config)

        if plan.needs_ai_invalidation:
            await _invalidate_ai_models(db)
            result["ai_reset"] = True

        await db.execute("DELETE FROM astronomy_cache_panel_groups")

        await _save_config_snapshot(db, new_config)

        result["renamed"] = [
            f"{r.old_name}→{r.new_name}"
            for r in plan.renames if r.old_name != r.new_name
        ]
        result["donor"] = [
            f"{d.donor_name}→{d.new_name}" for d in plan.donors
        ]
        result["new"] = plan.new_groups
        result["removed"] = plan.removed_groups

        _LOGGER.info(
            "Panel Group Migration completed: %d renamed, %d donor, %d new, %d removed",
            len(result["renamed"]), len(result["donor"]),
            len(result["new"]), len(result["removed"]),
        )

    except Exception as e:
        _LOGGER.warning("Panel Group Migration failed (non-critical): %s", e, exc_info=True)

    return result


async def setup_file_logging(hass: HomeAssistant) -> None:
    """Setup non-blocking file logging using QueueHandler. @zara

    Prevents duplicate handlers on reload by checking initialization state.
    """
    global _log_queue_listener, _log_queue_handler, _logging_initialized

    if _logging_initialized and _log_queue_listener is not None:
        _LOGGER.debug("File logging already initialized - skipping (prevents duplicate handlers)")
        return

    def _setup_logging_sync():
        """Synchronous file operations - runs in executor. @zara"""
        global _log_queue_listener, _log_queue_handler, _logging_initialized

        try:
            integration_logger = logging.getLogger(__package__)

            # Remove any existing QueueHandlers to prevent accumulation @zara
            existing_queue_handlers = [
                h for h in integration_logger.handlers
                if isinstance(h, QueueHandler)
            ]
            for handler in existing_queue_handlers:
                _LOGGER.debug(f"Removing existing QueueHandler: {handler}")
                integration_logger.removeHandler(handler)

            log_dir = Path(hass.config.path("solar_forecast_ml/logs"))
            log_dir.mkdir(parents=True, exist_ok=True)

            log_file = log_dir / "solar_forecast_ml.log"
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,
                backupCount=5,
                encoding="utf-8",
            )
            file_handler.setLevel(logging.DEBUG)

            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
            file_handler.setFormatter(formatter)

            log_queue: queue.Queue = queue.Queue(-1)

            _log_queue_handler = QueueHandler(log_queue)
            _log_queue_handler.setLevel(logging.DEBUG)

            _log_queue_listener = QueueListener(
                log_queue,
                file_handler,
                respect_handler_level=True,
            )
            _log_queue_listener.start()

            atexit.register(_stop_queue_listener)

            integration_logger.addHandler(_log_queue_handler)
            integration_logger.setLevel(logging.DEBUG)

            _logging_initialized = True

            return str(log_file)

        except Exception as e:
            _LOGGER.error(f"Failed to setup file logging: {e}", exc_info=True)
            return None

    loop = asyncio.get_running_loop()
    log_file = await loop.run_in_executor(None, _setup_logging_sync)

    if log_file:
        _LOGGER.info(f"File logging enabled (non-blocking): {log_file}")


def _stop_queue_listener() -> None:
    """Stop the queue listener on shutdown. @zara"""
    global _log_queue_listener, _log_queue_handler, _logging_initialized

    if _log_queue_handler is not None:
        try:
            integration_logger = logging.getLogger(__package__)
            integration_logger.removeHandler(_log_queue_handler)
            _log_queue_handler = None
        except Exception:
            pass

    if _log_queue_listener is not None:
        try:
            _log_queue_listener.stop()
            _log_queue_listener = None
        except Exception:
            pass

    _logging_initialized = False


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Solar Forecast ML integration. @zara"""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Solar Forecast ML from a config entry. @zara"""
    from .coordinator import SolarForecastMLCoordinator
    from .core.core_dependency_handler import DependencyHandler
    from .services.service_notification import create_notification_service

    await setup_file_logging(hass)

    # Register update listener for option changes @zara
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))

    # Check ML dependencies @zara
    dependency_handler = DependencyHandler()
    dependencies_ok = await dependency_handler.check_dependencies(hass)

    if not dependencies_ok:
        _LOGGER.warning("Some ML dependencies are missing. ML features will be disabled.")

    hass.data.setdefault(DOMAIN, {})

    # Create notification service @zara
    notification_service = await create_notification_service(hass, entry)
    if notification_service:
        hass.data[DOMAIN]["notification_service"] = notification_service
        _LOGGER.debug("NotificationService created and stored in hass.data")
    else:
        _LOGGER.warning("NotificationService could not be created")

    # Setup data directory @zara
    data_dir = Path(hass.config.path("solar_forecast_ml"))
    flag_file = Path(hass.config.path(".storage/solar_forecast_ml_v16_installed"))

    try:
        await hass.async_add_executor_job(lambda: data_dir.mkdir(parents=True, exist_ok=True))
    except Exception as e:
        _LOGGER.error(f"Failed to create data directory: {e}", exc_info=True)

    # Initialize coordinator @zara
    coordinator = SolarForecastMLCoordinator(hass, entry, dependencies_ok=dependencies_ok)

    # Run async setup (includes DataManager and DB initialization) @zara
    setup_ok = await coordinator.async_setup()
    if not setup_ok:
        _LOGGER.error("Failed to setup Solar Forecast coordinator")
        return False

    # V16 Migration: Remove 'Default' panel group in background (non-blocking) @zara
    async def _delayed_v16_migration():
        """Run V16 migration in background after HA startup."""
        if not coordinator.data_manager:
            return
        try:
            await asyncio.sleep(3)  # Short delay to not block startup
            await _migrate_db_remove_default_panel_group(coordinator.data_manager)
        except Exception as e:
            _LOGGER.warning(f"V16 Migration failed (non-critical): {e}")

    async def _delayed_panel_group_migration():
        if not coordinator.data_manager:
            return
        try:
            await asyncio.sleep(4)
            config_groups = entry.data.get(CONF_PANEL_GROUPS, [])
            if config_groups:
                await _migrate_panel_groups(coordinator.data_manager, config_groups)
        except Exception as e:
            _LOGGER.warning("Panel Group Migration failed (non-critical): %s", e)
        finally:
            domain_data = hass.data.get(DOMAIN, {})
            migration_tasks = domain_data.get("_panel_group_migration_tasks", {})
            current_task = asyncio.current_task()
            if migration_tasks.get(entry.entry_id) is current_task:
                migration_tasks.pop(entry.entry_id, None)

    if coordinator.data_manager:
        hass.async_create_task(
            _delayed_v16_migration(),
            name="solar_forecast_ml_v16_migration"
        )
        domain_data = hass.data.setdefault(DOMAIN, {})
        migration_tasks = domain_data.setdefault("_panel_group_migration_tasks", {})
        existing_task = migration_tasks.get(entry.entry_id)
        if existing_task and not existing_task.done():
            _LOGGER.debug(
                "Panel Group Migration task already active for entry %s - skipping duplicate schedule",
                entry.entry_id,
            )
        else:
            task = hass.async_create_task(
                _delayed_panel_group_migration(),
                name="solar_forecast_ml_panel_group_migration"
            )
            migration_tasks[entry.entry_id] = task

    # JSON Migration runs in background after startup to not block HA bootstrap @zara
    async def _delayed_json_migration():
        """Run JSON migration in background after HA startup."""
        if not coordinator.data_manager or not coordinator.data_manager._db_manager:
            return

        try:
            # Wait for HA to fully start
            await asyncio.sleep(10)
            _LOGGER.info("Starting JSON migration in background...")

            from .data.json_migration import run_json_migration
            migration_stats = await run_json_migration(hass, coordinator.data_manager._db_manager)

            if migration_stats.imported > 0 or migration_stats.updated > 0:
                _LOGGER.info(
                    f"JSON Migration completed: Imported={migration_stats.imported}, "
                    f"Updated={migration_stats.updated}, Skipped={migration_stats.skipped}, "
                    f"Errors={migration_stats.errors}"
                )
            else:
                _LOGGER.debug("JSON Migration: No data to migrate")
        except Exception as e:
            _LOGGER.warning(f"JSON Migration failed (non-critical): {e}", exc_info=True)

    # First refresh runs in background to not block HA startup @zara
    async def _delayed_first_refresh():
        """Run first data refresh in background after HA startup."""
        try:
            await asyncio.sleep(5)
            async with asyncio.timeout(60):
                await coordinator.async_config_entry_first_refresh()
            _LOGGER.info("First data refresh completed successfully")
        except asyncio.TimeoutError:
            _LOGGER.debug(
                "First data refresh timed out after 60s - using cached data (normal during startup)"
            )
        except Exception as e:
            _LOGGER.debug(f"First data refresh deferred: {e} - using cached data")

    hass.async_create_task(
        _delayed_first_refresh(),
        name="solar_forecast_ml_first_refresh"
    )

    hass.async_create_task(
        _delayed_json_migration(),
        name="solar_forecast_ml_json_migration"
    )

    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Forward entry setup to platforms @zara
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register services in background to not block bootstrap @zara
    async def _delayed_service_registration():
        await asyncio.sleep(1)
        await _async_register_services(hass, entry, coordinator)
        _LOGGER.debug("Services registered successfully")

    hass.async_create_task(
        _delayed_service_registration(),
        name="solar_forecast_ml_service_registration"
    )

    # Show installation notification for new installs @zara
    notification_marker = Path(hass.config.path(".storage/solar_forecast_ml_v16_notified"))

    if not flag_file.exists():
        _LOGGER.info("╔══════════════════════════════════════════════════════════════════╗")
        _LOGGER.info("║  Solar Forecast ML — Sarpeidion AI & DB-Version               ║")
        _LOGGER.info("║  Fresh Installation — Database storage initialized             ║")
        _LOGGER.info("╚══════════════════════════════════════════════════════════════════╝")

        try:
            flag_content = (
                f"Solar Forecast ML V{VERSION}\n"
                f"Installed: {dt_util.now().isoformat()}\n"
                f"Database-based storage - no JSON migration needed\n"
            )
            await hass.async_add_executor_job(flag_file.write_text, flag_content)
        except Exception as e:
            _LOGGER.warning(f"Could not write installation flag: {e}")

    if not notification_marker.exists():
        async def _send_install_notification():
            await asyncio.sleep(2)
            await hass.services.async_call(
                "persistent_notification",
                "create",
                {
                    "title": "☀️ Solar Forecast ML — Sarpeidion AI & DB-Version",
                    "message": (
                        "Installation successful!\n\n"
                        "**Next Steps:**\n"
                        "1. Complete the setup (Settings -> Integrations)\n"
                        "2. Wait 10 minutes after configuration\n"
                        "3. Restart Home Assistant to refresh all caches\n\n"
                        "*\"Logic is the beginning of wisdom, not the end.\"* — Spock\n\n"
                        "by Zara-Toorox — Live long and prosper!"
                    ),
                    "notification_id": "solar_forecast_ml_v16_installed",
                },
            )
            await hass.async_add_executor_job(
                notification_marker.write_text,
                f"Installation notification shown at {dt_util.now().isoformat()}"
            )

        hass.async_create_task(
            _send_install_notification(),
            name="solar_forecast_ml_install_notification"
        )
        _LOGGER.info("Installation notification shown to user")

    # Show startup notification @zara
    if notification_service:
        try:
            installed_packages = []
            missing_packages = []

            if dependencies_ok:
                installed_packages = dependency_handler.get_installed_packages()
            else:
                missing_packages = dependency_handler.get_missing_packages()

            use_attention = False
            if coordinator.ai_predictor:
                use_attention = getattr(coordinator.ai_predictor, "use_attention", False)

            await notification_service.show_startup_success(
                ml_mode=dependencies_ok,
                installed_packages=installed_packages,
                missing_packages=missing_packages,
                use_attention=use_attention,
            )
            _LOGGER.debug("Startup notification triggered")
        except Exception as e:
            _LOGGER.warning(f"Failed to show startup notification: {e}", exc_info=True)

    mode_str = "Hybrid-KI (Full Features)" if dependencies_ok else "Fallback Mode (Rule-Based)"

    # Auto-sync extra features on update @zara
    try:
        from .services.service_extra_features import ExtraFeaturesInstaller

        extra_installer = ExtraFeaturesInstaller(hass)
        updated_features, _ = await extra_installer.sync_on_update()

        if updated_features:
            async def _send_update_notification():
                await asyncio.sleep(2)
                await hass.services.async_call(
                    "persistent_notification",
                    "create",
                    {
                        "title": "Extra Features Updated",
                        "message": (
                            f"The following extra features were updated:\n\n"
                            f"**{', '.join(updated_features)}**\n\n"
                            "Please **restart Home Assistant** to load the new versions."
                        ),
                        "notification_id": "solar_forecast_ml_extra_features_updated",
                    },
                )

            hass.async_create_task(
                _send_update_notification(),
                name="solar_forecast_ml_update_notification"
            )
    except Exception as e:
        _LOGGER.warning(f"Extra features sync failed: {e}")

    w = 61
    banner = [
        "╔" + "═" * w + "╗",
        "║" + "  Solar Forecast ML — Sarpeidion AI & DB-Version".ljust(w) + "║",
        "║" + f"  Mode: {mode_str}".ljust(w) + "║",
        "║" + '  "Logic is the beginning of wisdom, not the end." — Spock'.ljust(w) + "║",
        "╚" + "═" * w + "╝",
    ]
    _LOGGER.info("\n" + "\n".join(banner))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry. @zara

    Properly cleans up logging handlers on unload to prevent duplicate log entries.
    """
    from .astronomy.astronomy_cache_manager import reset_cache_manager

    _LOGGER.info("Unloading Solar Forecast ML integration...")

    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        coordinator = hass.data[DOMAIN].pop(entry.entry_id)

        await coordinator.async_shutdown()

        reset_cache_manager()

        if not hass.data[DOMAIN]:
            _async_unregister_services(hass)

            # Stop logging when last entry is unloaded @zara
            _stop_queue_listener()
            _LOGGER.debug("File logging stopped (last config entry unloaded)")

    _LOGGER.info("Solar Forecast ML integration unloaded successfully")
    return unload_ok


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle removal of a config entry - clean up entity registry. @zara

    Called when the user removes the integration completely.
    """
    from homeassistant.helpers import entity_registry as er

    _LOGGER.info("Removing Solar Forecast ML integration and cleaning up entities...")

    ent_reg = er.async_get(hass)

    # Find all entities for this config entry @zara
    entities_to_remove = [
        entity_entry.entity_id
        for entity_entry in ent_reg.entities.values()
        if entity_entry.config_entry_id == entry.entry_id
    ]

    # Remove all entities @zara
    for entity_id in entities_to_remove:
        _LOGGER.debug(f"Removing entity: {entity_id}")
        ent_reg.async_remove(entity_id)

    _LOGGER.info(f"Removed {len(entities_to_remove)} entities from registry")


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update - reload integration to apply changes. @zara

    Called when the user changes options (diagnostic mode, etc.)
    """
    _LOGGER.info("Options updated, reloading integration to apply changes...")
    await hass.config_entries.async_reload(entry.entry_id)


async def async_migrate_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Migrate old entry. @zara

    Handle config entry migration when VERSION changes.
    Clean up orphaned entities from removed features.
    V16: All migrations use database, not JSON.
    """
    from homeassistant.helpers import entity_registry as er

    _LOGGER.debug(f"Migrating from version {config_entry.version}")

    ent_reg = er.async_get(hass)

    # Patterns for diagnostic entities to remove when diagnostic mode is disabled @zara
    diagnostic_patterns = [
        "diagnostic_status",
        "external_sensors_status",
        "next_production_start",
        "ml_service_status",
        "ml_metrics",
        "ml_training_readiness",
        "active_prediction_model",
        "pattern_count",
        "physics_samples",
    ]

    diagnostic_enabled = config_entry.options.get("diagnostic", True)

    if not diagnostic_enabled:
        entities_removed = 0
        for entity_entry in list(ent_reg.entities.values()):
            if entity_entry.config_entry_id != config_entry.entry_id:
                continue

            for pattern in diagnostic_patterns:
                if pattern in str(entity_entry.unique_id).lower():
                    _LOGGER.debug(f"Removing orphaned diagnostic entity: {entity_entry.entity_id}")
                    ent_reg.async_remove(entity_entry.entity_id)
                    entities_removed += 1
                    break

        if entities_removed > 0:
            _LOGGER.info(f"Removed {entities_removed} orphaned diagnostic entities")

    return True


async def _async_register_services(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: "SolarForecastMLCoordinator"
) -> None:
    """Register integration services using Service Registry. @zara"""
    from .services.service_registry import ServiceRegistry

    registry = ServiceRegistry(hass, entry, coordinator)
    await registry.async_register_all_services()

    hass.data[DOMAIN]["service_registry"] = registry


def _async_unregister_services(hass: HomeAssistant) -> None:
    """Unregister integration services using Service Registry. @zara"""
    registry = hass.data[DOMAIN].get("service_registry")
    if registry:
        registry.unregister_all_services()
    else:
        _LOGGER.warning("Service registry not found for cleanup")
