"""Read-only sensor mapping contract for one SFML Stats entry."""

from __future__ import annotations

import re
from types import MappingProxyType
from typing import Any, Mapping

from .const import (
    CONF_SENSOR_HEATINGROD_DAILY,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_HEATPUMP_DAILY,
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HP_DHW_MODE,
    CONF_SENSOR_HP_ELECTRIC_POWER,
    CONF_SENSOR_HP_HEATING_MODE,
    CONF_SENSOR_WALLBOX_DAILY,
    CONF_SENSOR_WALLBOX_POWER,
    CONF_SENSOR_WALLBOX_STATE,
    CONF_SENSOR_WB_ENERGY_SESSION,
    DOMAIN,
)


CONTRACT_VERSION = 1
_ENTITY_ID = re.compile(r"^[a-z_][a-z0-9_]*\.[a-z0-9_]+$")
_CONFIG_KEYS = {
    "heat_pump.compressor.energy.daily": CONF_SENSOR_HEATPUMP_DAILY,
    "heat_pump.operation.heating": CONF_SENSOR_HP_HEATING_MODE,
    "heat_pump.operation.dhw": CONF_SENSOR_HP_DHW_MODE,
    "heating_element.power": CONF_SENSOR_HEATINGROD_POWER,
    "heating_element.energy.daily": CONF_SENSOR_HEATINGROD_DAILY,
    "wallbox.power": CONF_SENSOR_WALLBOX_POWER,
    "wallbox.energy.daily": CONF_SENSOR_WALLBOX_DAILY,
    "wallbox.energy.session": CONF_SENSOR_WB_ENERGY_SESSION,
    "wallbox.status": CONF_SENSOR_WALLBOX_STATE,
}


class SensorMappingProvider:
    """Expose an immutable, data-minimised mapping for one config entry."""

    contract_version = CONTRACT_VERSION

    def __init__(self, entry_id: str, configuration: Mapping[str, Any]) -> None:
        self._entry_id = entry_id
        self._active = True
        mappings = self._collect(configuration, _CONFIG_KEYS)
        power = self._entity_id(configuration.get(CONF_SENSOR_HEATPUMP_POWER))
        if power is None:
            power = self._entity_id(configuration.get(CONF_SENSOR_HP_ELECTRIC_POWER))
        if power is not None:
            mappings["heat_pump.compressor.power"] = power
        self._mappings = MappingProxyType(mappings)

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
