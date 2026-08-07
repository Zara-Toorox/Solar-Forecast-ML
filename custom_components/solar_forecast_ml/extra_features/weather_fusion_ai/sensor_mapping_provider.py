"""Read-only sensor mapping contract for one Weather Fusion AI entry."""

from __future__ import annotations

import re
from types import MappingProxyType
from typing import Any, Mapping

from .const import CONF_TEMP_SENSOR, DOMAIN


CONTRACT_VERSION = 1
_ENTITY_ID = re.compile(r"^[a-z_][a-z0-9_]*\.[a-z0-9_]+$")


class SensorMappingProvider:
    """Expose an immutable, data-minimised mapping for one config entry."""

    contract_version = CONTRACT_VERSION

    def __init__(self, entry_id: str, configuration: Mapping[str, Any]) -> None:
        self._entry_id = entry_id
        self._active = True
        entity_id = self._entity_id(configuration.get(CONF_TEMP_SENSOR))
        self._mappings = MappingProxyType(
            {"environment.outdoor_temperature": entity_id} if entity_id else {}
        )

    def snapshot(self) -> Mapping[str, Any] | None:
        """Return the entry-bound contract or fail closed after invalidation."""
        if not self._active:
            return None
        return MappingProxyType(
            {
                "contract_version": self.contract_version,
                "provider_domain": DOMAIN,
                "entry_id": self._entry_id,
                "mappings": MappingProxyType(dict(self._mappings)),
            }
        )

    def invalidate(self) -> None:
        """Disable a held provider reference after its entry is unloaded."""
        self._active = False

    @staticmethod
    def _entity_id(value: Any) -> str | None:
        if not isinstance(value, str):
            return None
        entity_id = value.strip()
        return entity_id if len(entity_id) <= 255 and _ENTITY_ID.fullmatch(entity_id) else None


def register_provider(
    providers: dict[str, SensorMappingProvider], entry_id: str, provider: SensorMappingProvider
) -> None:
    """Replace an entry provider while invalidating any held predecessor."""
    previous = providers.get(entry_id)
    if previous is not provider:
        if previous is not None:
            previous.invalidate()
    providers[entry_id] = provider
