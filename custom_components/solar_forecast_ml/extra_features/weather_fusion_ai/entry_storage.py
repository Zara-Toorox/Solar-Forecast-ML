"""Entry-scoped persistence and conservative legacy-data migration."""

from __future__ import annotations

import re
import shutil
from pathlib import Path


_ALLOWED_LEGACY_FILES = frozenset(
    {
        "cache/expert_weights.json",
        "cache/open_meteo_cache.json",
        "cache/bright_sky_cache.json",
        "cache/wttr_in_cache.json",
        "cache/pirate_weather_cache.json",
        "weather_cache.json",
        "expert_weights.json",
        "precision_data.json",
        "hourly_actual.json",
        "learning_stats.json",
        "learning_history.json",
        "history/actual/actual_weather_history.json",
        "learning/hourly_buckets.json",
        "learning/cloud_type_buckets.json",
        "learning/seasonal_buckets.json",
        "learning/expert_buckets.json",
        "learning/combined_buckets.json",
        "learning/expert_weights.json",
        "models/pattern_weights.json",
        "models/anomaly_thresholds.json",
        "logs/learning_log.json",
    }
)
_DEVIATION_HISTORY = re.compile(r"history/deviations/\d{4}-\d{2}\.json$")


def migrate_legacy_ai_data(
    legacy_dir: Path,
    entry_dir: Path,
    config_entry_count: int,
) -> int:
    """Copy known single-entry learning data into an empty entry directory.

    The old shared directory is never modified. Unknown files, symlinks, and
    every migration attempt with multiple config entries are intentionally
    ignored to preserve entry isolation and avoid copying secrets.
    """
    if (
        config_entry_count != 1
        or not legacy_dir.is_dir()
        or legacy_dir.is_symlink()
        or entry_dir == legacy_dir
    ):
        return 0
    if entry_dir.exists() and any(entry_dir.iterdir()):
        return 0

    copied = 0
    for relative_path in _legacy_relative_paths(legacy_dir):
        source = legacy_dir / relative_path
        if not _is_safe_legacy_file(source, legacy_dir):
            continue

        target = entry_dir / relative_path
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            copied += 1
        except OSError:
            continue

    return copied


def _legacy_relative_paths(legacy_dir: Path) -> list[Path]:
    """Return only the explicitly recognised legacy persistence paths."""
    paths = [Path(path) for path in _ALLOWED_LEGACY_FILES]
    deviations_dir = legacy_dir / "history" / "deviations"
    if deviations_dir.is_dir() and not deviations_dir.is_symlink():
        paths.extend(
            Path("history/deviations") / path.name
            for path in deviations_dir.iterdir()
            if _DEVIATION_HISTORY.fullmatch(
                (Path("history/deviations") / path.name).as_posix()
            )
        )
    return paths


def _is_safe_legacy_file(source: Path, legacy_dir: Path) -> bool:
    """Reject symlinked paths and anything outside the fixed legacy root."""
    try:
        source.relative_to(legacy_dir)
    except ValueError:
        return False

    current = source
    while current != legacy_dir:
        if current.is_symlink():
            return False
        current = current.parent
    return source.is_file() and not source.is_symlink()
