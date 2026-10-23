# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""S-INV HP aggregate ("S-INV HP"): entities sinv_hp_<role> over heat pumps. @zara

One config entry of its own, next to "S-INV Anlage". It is created with the
first heat-pump instance and removed with the last one. Inverter roles are
not read here, and this device is not part of the inverter installation.
Day counters use the installation midnight tracker in site_daily.
"""

from __future__ import annotations

import re
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import SOURCE_SYSTEM, ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.event import (
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.util import dt as dt_util

from . import contract, site, site_daily
from .const import CONF_VENDOR, DOMAIN, VENDOR_HP, is_hp_device_vendor

HP_UNIQUE_ID = "sinv_hp"
HP_TITLE = "S-INV HP"
_FLOW_STARTED = f"{DOMAIN}_hp_flow_started"
_INDEX = re.compile(r"^sinv_hp(\d\d)_")
_MEASURED = (contract.AGG_SUM, contract.AGG_SINGLE, contract.AGG_ANY)


def collect_sources(entities) -> dict[str, list[site.Source]]:
    """Heat-pump device entities per aggregated role, ordered by device index. @zara"""
    sources: dict[str, list[site.Source]] = {}
    for entry in entities:
        if entry.platform != DOMAIN or entry.disabled_by is not None:
            continue
        parsed = contract.parse_hp_unique_id(entry.unique_id)
        if not parsed or parsed["serial"] == contract.HP_SERIAL:
            continue
        role = parsed["role"]
        if contract.hp_aggregation(role) not in _MEASURED:
            continue
        match = _INDEX.match(entry.entity_id.split(".", 1)[1])
        index = int(match.group(1)) if match else 99
        sources.setdefault(role, []).append(
            site.Source(
                entry.entity_id,
                parsed["serial"],
                index,
                getattr(entry, "config_entry_id", None) or "",
            )
        )
    for items in sources.values():
        items.sort(key=lambda source: (source.index, source.entity_id))
    return sources


def published_roles(
    sources: dict[str, list[site.Source]], existing: set[str], domain: str
) -> set[str]:
    """Aggregate roles for one platform, including derived day counters and COP. @zara"""
    roles = {
        role
        for role in sources
        if contract.hp_domain(role) == domain and contract.hp_has_system_entity(role)
    }
    roles.update(
        role
        for role in existing
        if contract.is_hp_role(role) and contract.hp_domain(role) == domain
    )
    if domain == "sensor":
        roles.update(site_daily.hp_derived_today(sources))
        roles.update(contract.hp_cop_roles(sources))
    return roles


def _float(state: Any) -> float | None:
    try:
        return float(state.state)
    except (AttributeError, TypeError, ValueError):
        return None


def _onoff(state: Any) -> bool | None:
    value = getattr(state, "state", None)
    if value == "on":
        return True
    if value == "off":
        return False
    return None


@callback
def async_ensure_hp_entry(hass: HomeAssistant) -> None:
    """Create the S-INV HP entry once, when the first heat pump starts. @zara"""
    if any(
        entry.unique_id == HP_UNIQUE_ID
        for entry in hass.config_entries.async_entries(DOMAIN, include_ignore=True)
    ) or hass.data.get(_FLOW_STARTED):
        return
    hass.data[_FLOW_STARTED] = True
    hass.async_create_task(
        hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_SYSTEM}, data={CONF_VENDOR: VENDOR_HP}
        )
    )


@callback
def async_remove_unused_hp_entry(hass: HomeAssistant, removed: ConfigEntry) -> None:
    """Remove S-INV HP together with the last heat-pump instance. @zara"""
    vendor = removed.data.get(CONF_VENDOR)
    if vendor == VENDOR_HP:
        hass.data.pop(_FLOW_STARTED, None)
        return
    if not is_hp_device_vendor(vendor):
        return
    entries = hass.config_entries.async_entries(DOMAIN, include_ignore=False)
    if any(is_hp_device_vendor(entry.data.get(CONF_VENDOR)) for entry in entries):
        return
    hass.data.pop(_FLOW_STARTED, None)
    for entry in entries:
        if entry.unique_id == HP_UNIQUE_ID:
            hass.async_create_task(hass.config_entries.async_remove(entry.entry_id))


def hp_device_info() -> DeviceInfo:
    """Device of the heat-pump aggregate. @zara"""
    return DeviceInfo(
        identifiers={(DOMAIN, contract.HP_SERIAL)},
        translation_key="hp",
        manufacturer="S-INV",
        model="Heat pump",
    )


async def async_setup_hp_entities(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    domain: str,
) -> None:
    """Create aggregate entities for heat-pump roles that have device sources. @zara"""
    if domain == "sensor":
        await site.ensure_site_daily(hass)
    registry = er.async_get(hass)
    known: set[str] = set()

    @callback
    def refresh(_event: Event | None = None) -> None:
        sources = collect_sources(registry.entities.values())
        existing: set[str] = set()
        for item in registry.entities.values():
            parsed = (
                contract.parse_hp_unique_id(item.unique_id)
                if item.platform == DOMAIN
                else None
            )
            if parsed and parsed["serial"] == contract.HP_SERIAL:
                existing.add(parsed["role"])
        roles = published_roles(sources, existing, domain)
        new = []
        for role in sorted(roles):
            if role in known or contract.hp_domain(role) != domain:
                continue
            if role == "hp_operating_mode":
                new.append(HpModeSensor(role))
            elif domain == "binary_sensor":
                new.append(HpBinarySensor(role))
            else:
                new.append(HpSensor(role))
        known.update(entity.role for entity in new)
        if new:
            async_add_entities(new)

    refresh()
    entry.async_on_unload(
        hass.bus.async_listen(er.EVENT_ENTITY_REGISTRY_UPDATED, refresh)
    )


class _HpEntity:
    """Shared behaviour of S-INV HP aggregate entities. @zara"""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, role: str) -> None:
        """Bind to a heat-pump role. @zara"""
        spec = contract.HP_SPEC_BY_BASE[role]
        self.role = role
        self._rule = contract.hp_aggregation(role)
        self._sources: list[site.Source] = []
        self._all_sources: dict[str, list[site.Source]] = {}
        self._unsub_states = None
        self._unsub_midnight = None
        self._attr_unique_id = contract.hp_system_unique_id(role)
        self._attr_translation_key = f"sinv_{spec.base}"
        self._attr_device_info = hp_device_info()

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Suggest sinv_hp_<role> before core registers the entity. @zara"""
        registry = er.async_get(hass)
        if (
            registry.async_get_entity_id(platform.domain, DOMAIN, self.unique_id)
            is None
        ):
            self.entity_id = (
                f"{platform.domain}.{contract.hp_system_object_id(self.role)}"
            )
        super().add_to_platform_start(hass, platform, parallel_updates)

    async def async_added_to_hass(self) -> None:
        """Follow the heat-pump device entities of the role. @zara"""
        self._resubscribe()
        self.async_on_remove(
            self.hass.bus.async_listen(
                er.EVENT_ENTITY_REGISTRY_UPDATED, self._registry_changed
            )
        )
        self.async_on_remove(self._unsubscribe)
        self.async_on_remove(self._cancel_midnight)

    @callback
    def _registry_changed(self, _event: Event) -> None:
        self._resubscribe()
        self.async_write_ha_state()

    @callback
    def _unsubscribe(self) -> None:
        if self._unsub_states is not None:
            self._unsub_states()
            self._unsub_states = None

    def _tracked_ids(self) -> list[str]:
        if self._is_derived():
            return [
                source.entity_id
                for input_role in self._input_roles()
                for source in self._all_sources.get(input_role, [])
            ]
        return [source.entity_id for source in self._sources]

    def _input_roles(self) -> tuple[str, ...]:
        cop = contract.HP_COP_INPUTS.get(self.role)
        if cop is not None:
            return cop[0], cop[1]
        total = site_daily.HP_TODAY_FROM_TOTAL.get(self.role)
        if total is None:
            return ()
        return (total,)

    @callback
    def _resubscribe(self) -> None:
        registry = er.async_get(self.hass)
        self._all_sources = collect_sources(registry.entities.values())
        self._sources = self._all_sources.get(self.role, [])
        self._unsubscribe()
        tracked = self._tracked_ids()
        if tracked:

            @callback
            def changed(_event: Event) -> None:
                self.async_write_ha_state()

            self._unsub_states = async_track_state_change_event(
                self.hass, tracked, changed
            )
        self._arm_midnight()

    @callback
    def _arm_midnight(self) -> None:
        """Schedule the next local midnight for a derived heat-pump day counter. @zara"""
        if not self._is_derived() or self.role not in site_daily.HP_MIDNIGHT_ROLES:
            self._cancel_midnight()
            return
        if self._unsub_midnight is not None:
            return
        when = site_daily.next_local_midnight(dt_util.as_local(dt_util.now()))
        self._unsub_midnight = async_track_point_in_utc_time(
            self.hass, self._on_local_midnight, dt_util.as_utc(when)
        )

    @callback
    def _on_local_midnight(self, _now) -> None:
        """Rewrite the day counter at local midnight, then schedule the next one. @zara"""
        self._unsub_midnight = None
        self._arm_midnight()
        self.async_write_ha_state()

    @callback
    def _cancel_midnight(self) -> None:
        if self._unsub_midnight is not None:
            self._unsub_midnight()
            self._unsub_midnight = None

    def _is_derived(self) -> bool:
        if self.role in contract.HP_COP_INPUTS:
            return True
        return not self._sources and self.role in site_daily.HP_TODAY_FROM_TOTAL

    def _site_daily(self) -> site.SiteDaily:
        holder = self.hass.data.get(site._SITE_DAILY)
        if isinstance(holder, site.SiteDaily):
            return holder
        holder = site.SiteDaily(site_daily.DailyTracker())
        self.hass.data[site._SITE_DAILY] = holder
        return holder

    def _role_value(self, role: str) -> float | None:
        sources = self._all_sources.get(role, [])
        if not sources:
            return None
        values = [_float(self.hass.states.get(source.entity_id)) for source in sources]
        value = site.aggregate(contract.hp_aggregation(role), values)
        if value is None:
            return None
        return round(float(value), 3)

    @property
    def available(self) -> bool:
        """Available while the aggregate has a value. @zara"""
        return self._current() is not None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract attributes plus the device entities combined. @zara"""
        if self._is_derived():
            sources = self._tracked_ids()
            return {
                contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
                contract.ATTR_ROLE: self.role,
                site.AGGREGATION_ATTR: contract.AGG_DERIVED,
                site.SOURCES_ATTR: sources,
                contract.ATTR_DERIVED: True,
            }
        return {
            contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
            contract.ATTR_ROLE: self.role,
            site.AGGREGATION_ATTR: self._rule,
            site.SOURCES_ATTR: [source.entity_id for source in self._sources],
        }

    def _current(self):
        raise NotImplementedError


class HpSensor(_HpEntity, SensorEntity):
    """Numeric S-INV HP value. @zara"""

    def __init__(self, role: str) -> None:
        """Set unit and classes from the contract. @zara"""
        super().__init__(role)
        spec = contract.HP_SPEC_BY_BASE[role]
        self._attr_native_unit_of_measurement = spec.unit
        self._attr_device_class = (
            SensorDeviceClass(spec.device_class) if spec.device_class else None
        )
        self._attr_state_class = (
            SensorStateClass(spec.state_class) if spec.state_class else None
        )

    def _cop(self) -> float | None:
        thermal_role, electric_role, minimum = contract.HP_COP_INPUTS[self.role]
        return contract.hp_cop(
            self._role_value(thermal_role),
            self._role_value(electric_role),
            minimum,
        )

    def _today(self) -> float | None:
        total_role = site_daily.HP_TODAY_FROM_TOTAL[self.role]
        return self._site_daily().update(
            total_role,
            self._role_value(total_role),
            site.installation_local_day(),
        )

    def _current(self) -> float | None:
        if self.role in contract.HP_COP_INPUTS:
            return self._cop()
        if not self._sources:
            if self.role in site_daily.HP_TODAY_FROM_TOTAL:
                return self._today()
            return None
        values = [
            _float(self.hass.states.get(source.entity_id)) for source in self._sources
        ]
        return site.aggregate(self._rule, values)

    @property
    def native_value(self) -> float | None:
        """Aggregated value. @zara"""
        value = self._current()
        if value is None:
            return None
        if self.role.startswith("hp_energy") or self.role.startswith("hp_cop"):
            return round(value, 3)
        if self.role.startswith("hp_runtime"):
            return round(value, 3)
        if self.role == "hp_compressor_starts":
            return round(value)
        return round(value, 1)


class HpModeSensor(_HpEntity, SensorEntity):
    """Operating mode of the first heat pump. @zara"""

    def __init__(self, role: str) -> None:
        """Publish the fixed operating-mode set from the contract. @zara"""
        super().__init__(role)
        self._attr_device_class = SensorDeviceClass.ENUM
        self._attr_options = list(contract.HP_OPERATING_MODES)

    def _current(self) -> str | None:
        if not self._sources or self._rule != contract.AGG_SINGLE:
            return None
        state = self.hass.states.get(self._sources[0].entity_id)
        value = getattr(state, "state", None)
        if value in contract.HP_OPERATING_MODES:
            return value
        return None

    @property
    def native_value(self) -> str | None:
        """Mode of the first heat pump, or None. @zara"""
        return self._current()


class HpBinarySensor(_HpEntity, BinarySensorEntity):
    """On while any heat pump reports the binary role. @zara"""

    def __init__(self, role: str) -> None:
        """Set the device class from the contract. @zara"""
        super().__init__(role)
        spec = contract.HP_SPEC_BY_BASE[role]
        self._attr_device_class = (
            BinarySensorDeviceClass(spec.device_class) if spec.device_class else None
        )

    def _current(self) -> bool | None:
        if not self._sources:
            return None
        states = [
            _onoff(self.hass.states.get(source.entity_id)) for source in self._sources
        ]
        return site.aggregate_state(self._rule, states)

    @property
    def is_on(self) -> bool | None:
        """Aggregated on/off state. @zara"""
        return self._current()


def hp_device_index(registry, serial: str) -> int:
    """Lowest free hp index, or the index this serial already uses. @zara"""
    serial = serial.lower()
    used: set[int] = set()
    for entry in registry.entities.values():
        if entry.platform != DOMAIN:
            continue
        match = _INDEX.match(entry.entity_id.split(".", 1)[1])
        if match is None:
            continue
        parsed = contract.parse_hp_unique_id(entry.unique_id or "")
        if parsed and parsed["serial"] == serial:
            return int(match.group(1))
        used.add(int(match.group(1)))
    index = 1
    while index in used:
        index += 1
    return index


async def async_setup_hp_device_entities(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
    domain: str,
) -> None:
    """Create the device entities of one heat-pump manufacturer entry. @zara"""
    coordinator = entry.runtime_data
    known: set[tuple[str, str]] = set()

    @callback
    def add_new() -> None:
        new = []
        for serial, device in (coordinator.data or {}).items():
            for role in device.roles:
                if (serial, role) in known or contract.hp_domain(role) != domain:
                    continue
                known.add((serial, role))
                if role == "hp_operating_mode":
                    new.append(HpDeviceMode(coordinator, serial, role))
                elif domain == "binary_sensor":
                    new.append(HpDeviceBinary(coordinator, serial, role))
                else:
                    new.append(HpDeviceSensor(coordinator, serial, role))
        if new:
            async_add_entities(new)

    add_new()
    entry.async_on_unload(coordinator.async_add_listener(add_new))


class _HpDevice(CoordinatorEntity):
    """One role on a heat-pump device, not on the aggregate. @zara"""

    _attr_has_entity_name = True

    def __init__(self, coordinator, serial: str, role: str) -> None:
        """Bind the role to the device serial. @zara"""
        super().__init__(coordinator)
        self._serial = serial
        self._role = role
        spec = contract.HP_SPEC_BY_BASE[role]
        device = coordinator.data[serial]
        self._attr_unique_id = contract.hp_role_unique_id(serial, role)
        self._attr_translation_key = f"sinv_{spec.base}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, serial)},
            manufacturer=device.manufacturer,
            model=device.model,
            name=device.name,
            serial_number=serial,
        )
        self._sinv_index = 1

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Suggest sinv_hp<nn>_<role without hp_>. @zara"""
        registry = er.async_get(hass)
        self._sinv_index = hp_device_index(registry, self._serial)
        if (
            registry.async_get_entity_id(platform.domain, DOMAIN, self.unique_id)
            is None
        ):
            self.entity_id = (
                f"{platform.domain}."
                f"{contract.hp_device_object_id(self._role, self._sinv_index)}"
            )
        super().add_to_platform_start(hass, platform, parallel_updates)

    @property
    def _device(self):
        return (self.coordinator.data or {}).get(self._serial)

    @property
    def available(self) -> bool:
        """Available while this poll still reports the role. @zara"""
        device = self._device
        return super().available and device is not None and self._role in device.roles

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Contract attributes of a device role. @zara"""
        return {
            contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
            contract.ATTR_ROLE: self._role,
            contract.ATTR_DEVICE_INDEX: self._sinv_index,
            contract.ATTR_VENDOR: getattr(
                getattr(self.coordinator, "vendor", None), "VENDOR", ""
            ),
        }


class HpDeviceSensor(_HpDevice, SensorEntity):
    """Numeric or enum value of one heat pump. @zara"""

    def __init__(self, coordinator, serial: str, role: str) -> None:
        """Set unit and classes from the contract. @zara"""
        super().__init__(coordinator, serial, role)
        spec = contract.HP_SPEC_BY_BASE[role]
        self._attr_native_unit_of_measurement = spec.unit
        self._attr_device_class = (
            SensorDeviceClass(spec.device_class) if spec.device_class else None
        )
        self._attr_state_class = (
            SensorStateClass(spec.state_class) if spec.state_class else None
        )

    @property
    def native_value(self):
        """Value from the latest poll. @zara"""
        device = self._device
        if device is None:
            return None
        return device.roles.get(self._role)


class HpDeviceMode(_HpDevice, SensorEntity):
    """Operating mode of one heat pump. @zara"""

    def __init__(self, coordinator, serial: str, role: str) -> None:
        """Publish the fixed operating-mode set from the contract. @zara"""
        super().__init__(coordinator, serial, role)
        self._attr_device_class = SensorDeviceClass.ENUM
        self._attr_options = list(contract.HP_OPERATING_MODES)

    @property
    def native_value(self) -> str | None:
        """Mode text, or None when it is not a contract state. @zara"""
        device = self._device
        if device is None:
            return None
        value = device.roles.get(self._role)
        if value not in contract.HP_OPERATING_MODES:
            return None
        return value


class HpDeviceBinary(_HpDevice, BinarySensorEntity):
    """Binary role of one heat pump. @zara"""

    def __init__(self, coordinator, serial: str, role: str) -> None:
        """Set the device class from the contract. @zara"""
        super().__init__(coordinator, serial, role)
        spec = contract.HP_SPEC_BY_BASE[role]
        self._attr_device_class = (
            BinarySensorDeviceClass(spec.device_class) if spec.device_class else None
        )

    @property
    def is_on(self) -> bool | None:
        """On/off from the latest poll. @zara"""
        device = self._device
        if device is None:
            return None
        value = device.roles.get(self._role)
        if isinstance(value, bool):
            return value
        return None
