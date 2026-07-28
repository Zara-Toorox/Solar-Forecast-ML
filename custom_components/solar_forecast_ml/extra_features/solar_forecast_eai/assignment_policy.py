"""Topology-aware policy for shared sensor assignments."""

from __future__ import annotations

from typing import Any

from .const import (
    CONF_DHW_TEMP_ENTITY,
    CONF_HAS_DHW,
    CONF_INDOOR_TEMP_ENTITY,
    CONF_OUTDOOR_TEMP_ENTITY,
    CONF_SOURCE_TEMP_ENTITY,
    CONF_STORAGE_TEMP_ENTITY,
    CONF_TARGET_TEMP_ENTITY,
    CONF_WP_TYPE,
    DEFAULT_WP_TYPE,
    WP_TYPE_AIR_WATER,
)


def is_allowed_shared_assignment(
    config: dict[str, Any],
    entity_id: str,
    assigned_keys: set[str] | frozenset[str],
) -> bool:
    """Return whether one entity intentionally represents equivalent inputs."""
    keys = frozenset(assigned_keys)
    if (
        entity_id.startswith("climate.")
        and keys == {CONF_INDOOR_TEMP_ENTITY, CONF_TARGET_TEMP_ENTITY}
    ):
        return True
    if (
        config.get(CONF_WP_TYPE, DEFAULT_WP_TYPE) == WP_TYPE_AIR_WATER
        and keys == {CONF_OUTDOOR_TEMP_ENTITY, CONF_SOURCE_TEMP_ENTITY}
    ):
        return True
    return bool(
        config.get(CONF_HAS_DHW)
        and keys == {CONF_DHW_TEMP_ENTITY, CONF_STORAGE_TEMP_ENTITY}
    )
