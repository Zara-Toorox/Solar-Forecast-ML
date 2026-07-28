"""Read-only sensor mapping contract for one Solar Forecast ML entry."""

from __future__ import annotations

import re
from types import MappingProxyType
from typing import Any, Mapping

from ..const import (
    CONF_HUMIDITY_SENSOR,
    CONF_LUX_SENSOR,
    CONF_PRESSURE_SENSOR,
    CONF_RAIN_SENSOR,
    CONF_SOLAR_RADIATION_SENSOR,
    CONF_TEMP_SENSOR,
    CONF_WIND_SENSOR,
    DOMAIN,
)


CONTRACT_VERSION = 1
_ENTITY_ID = re.compile(r"^[a-z_][a-z0-9_]*\.[a-z0-9_]+$")


class SensorMappingProvider:
    """Expose an immutable, data-minimised mapping for one config entry."""

    contract_version = CONTRACT_VERSION

    def __init__(self, entry_id: str, configuration: Mapping[str, Any]) -> None:
        self._entry_id = entry_id
        self._active = True
        self._mappings = MappingProxyType(
            self._collect(
                configuration,
                {
                    "environment.outdoor_temperature": CONF_TEMP_SENSOR,
                    "weather.humidity": CONF_HUMIDITY_SENSOR,
                    "weather.pressure": CONF_PRESSURE_SENSOR,
                    "weather.wind_speed": CONF_WIND_SENSOR,
                    "weather.precipitation": CONF_RAIN_SENSOR,
                    "weather.solar_radiation": CONF_SOLAR_RADIATION_SENSOR,
                    "weather.illuminance": CONF_LUX_SENSOR,
                },
            )
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
    def _collect(
        configuration: Mapping[str, Any], keys: Mapping[str, str]
    ) -> dict[str, str]:
        return {
            semantic_key: entity_id
            for semantic_key, config_key in keys.items()
            if (entity_id := SensorMappingProvider._entity_id(configuration.get(config_key)))
            is not None
        }

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
