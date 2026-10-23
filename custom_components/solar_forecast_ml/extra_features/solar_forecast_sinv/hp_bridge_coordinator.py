# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Push updates from an existing heat-pump integration into S-INV HP. @zara

There is no poll. Each chosen entity is followed with
``async_track_state_change_event``. Unavailable and unknown stay unavailable.
A unit the user changes later is checked again; a mismatch drops the role and
is logged once.
"""

from __future__ import annotations

from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import LOGGER
from .emsesp_coordinator import bind_hp_identity
from .vendors import hp_bridge


class HpBridgeCoordinator(DataUpdateCoordinator[dict[str, hp_bridge.BridgeDevice]]):
    """Follow the entities the user picked. No scan interval. @zara"""

    vendor = hp_bridge

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Bind the stable serial and subscribe on the first refresh. @zara"""
        self._serial = bind_hp_identity(hass, entry)
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name="S-INV HP bridge",
            update_interval=None,
        )
        self._unsub = None
        self._bad_units: set[str] = set()

    async def _async_update_data(self) -> dict[str, hp_bridge.BridgeDevice]:
        self._listen()
        return self._snapshot()

    def _mapping(self) -> dict[str, str]:
        raw = self.config_entry.options.get(hp_bridge.CONF_SOURCES)
        if not isinstance(raw, dict) or not raw:
            raw = self.config_entry.data.get(hp_bridge.CONF_SOURCES) or {}
        return {
            str(role): str(entity_id) for role, entity_id in raw.items() if entity_id
        }

    def _listen(self) -> None:
        if self._unsub is not None:
            return
        entity_ids = list(self._mapping().values())
        if not entity_ids:
            return
        self._unsub = async_track_state_change_event(
            self.hass, entity_ids, self._changed
        )
        self.config_entry.async_on_unload(self._unsub)

    @callback
    def _changed(self, _event: Event) -> None:
        self.async_set_updated_data(self._snapshot())

    def _snapshot(self) -> dict[str, hp_bridge.BridgeDevice]:
        roles: dict[str, Any] = {}
        for role, entity_id in self._mapping().items():
            value = self._read(role, entity_id)
            if value is not None:
                roles[role] = value
        device = hp_bridge.BridgeDevice(
            serial=self._serial,
            name=hp_bridge.NAME,
            manufacturer="S-INV",
            model="Bridge",
            kind="heat_pump",
            roles=roles,
        )
        return {self._serial: device}

    def _read(self, role: str, entity_id: str) -> Any:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in {"unavailable", "unknown", "none", ""}:
            return None
        unit = state.attributes.get("unit_of_measurement")
        if not hp_bridge.unit_ok(role, unit):
            if role not in self._bad_units:
                self._bad_units.add(role)
                LOGGER.warning(
                    "Heat pump bridge role %s from %s has an incompatible unit",
                    role,
                    entity_id,
                )
            return None
        self._bad_units.discard(role)
        return hp_bridge.convert(role, state.state, unit)
