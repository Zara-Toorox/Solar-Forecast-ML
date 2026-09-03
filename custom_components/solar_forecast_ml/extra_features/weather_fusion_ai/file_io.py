"""Atomic JSON persistence helpers."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any


def write_json_atomic(path: Path, data: Any) -> None:
    """Write JSON via a sibling temp file, then replace the target."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f"{path.name}.tmp")
    temp_path.write_text(json.dumps(data, indent=2))
    temp_path.replace(path)


async def async_write_json(path: Path, data: Any) -> None:
    """Write JSON off the event loop using an atomic replace."""
    await asyncio.to_thread(write_json_atomic, path, data)
