# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Sensor entities of local-API S-INV instances (Fronius, Zendure): roles and vendor values. @zara"""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
)

from . import contract
from .const import DOMAIN
from .entity import assign_role_identity, vendor_free_entity_id


async def async_setup_local_sensors(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Create sensors now and whenever a device reports a value for the first time. @zara"""
    coordinator: DataUpdateCoordinator = entry.runtime_data
    known: set[tuple[str, str]] = set()

    @callback
    def add_new() -> None:
        new: list[LocalVendorSensor] = []
        for serial, device in (coordinator.data or {}).items():
            for role in device.roles:
                if (serial, role) not in known:
                    known.add((serial, role))
                    new.append(LocalVendorSensor(coordinator, serial, role=role))
            for key in device.vendor:
                if (serial, f"vendor:{key}") not in known:
                    known.add((serial, f"vendor:{key}"))
                    new.append(LocalVendorSensor(coordinator, serial, vendor_key=key))
        if new:
            async_add_entities(new)

    add_new()
    entry.async_on_unload(coordinator.async_add_listener(add_new))


class LocalVendorSensor(CoordinatorEntity[DataUpdateCoordinator], SensorEntity):
    """One contract role or vendor value of a device on a local vendor API. @zara"""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: DataUpdateCoordinator,
        serial: str,
        *,
        role: str | None = None,
        vendor_key: str | None = None,
    ) -> None:
        """Bind the entity to a device serial and one role or vendor key. @zara"""
        super().__init__(coordinator)
        # vendor module (vendors.fronius, vendors.zendure) of the coordinator
        self._vendor = coordinator.vendor
        self._serial = serial
        self._role = role
        self._key = vendor_key or role or ""
        device = coordinator.data[serial]
        if role:
            spec, channel = contract.split_role(role)
            self._attr_unique_id = contract.role_unique_id(serial, role)
            self._attr_translation_key = f"sinv_{spec.base}"
            self._attr_translation_placeholders = (
                {"nn": f"{channel:02d}"} if channel is not None else {}
            )
            unit, device_class, state_class = (
                spec.unit,
                spec.device_class,
                spec.state_class,
            )
        else:
            vendor_spec = self._vendor.VENDOR_SPECS[self._key]
            self._attr_unique_id = contract.vendor_unique_id(
                serial, self._vendor.VENDOR, self._key
            )
            self._attr_translation_key = f"{self._vendor.VENDOR}_{self._key}"
            unit = vendor_spec.unit
            device_class = vendor_spec.device_class
            state_class = vendor_spec.state_class
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = (
            SensorDeviceClass(device_class) if device_class else None
        )
        self._attr_state_class = SensorStateClass(state_class) if state_class else None
        inverter = next(
            (s for s, d in coordinator.data.items() if d.kind == "inverter"), None
        )
        # the battery hangs below the inverter; linked after registration because
        # DeviceInfo.via_device is deprecated since HA 2026.10 and via_device_id is
        # unknown to older versions
        self._parent = inverter if inverter and inverter != serial else None
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, serial)},
            manufacturer=device.manufacturer,
            model=device.model,
            name=device.name,
            serial_number=serial,
        )
        self._sinv_index = 1

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Suggest the normative entity_id before core registers the entity. @zara"""
        if self._role:
            suggestion, self._sinv_index = assign_role_identity(
                hass, platform.domain, self._serial, self._role, self.unique_id
            )
            if contract.is_site_only(self._role):
                self._attr_entity_registry_visible_default = False
        else:
            registry = er.async_get(hass)
            current = registry.async_get_entity_id(
                platform.domain, DOMAIN, self.unique_id
            )
            suggestion = (
                None
                if current
                else vendor_free_entity_id(
                    hass,
                    registry,
                    platform.domain,
                    self._vendor.VENDOR,
                    self._key,
                    self.unique_id,
                )
            )
        if suggestion is not None:
            self.entity_id = suggestion
        super().add_to_platform_start(hass, platform, parallel_updates)

    @property
    def _device(self) -> Any:
        return (self.coordinator.data or {}).get(self._serial)

    @property
    def available(self) -> bool:
        """Available while the device reports this value. @zara"""
        device = self._device
        if not super().available or device is None:
            return False
        values = device.roles if self._role else device.vendor
        return self._key in values

    async def async_added_to_hass(self) -> None:
        """Register for updates and link the device to its inverter. @zara"""
        await super().async_added_to_hass()
        self._link_parent()

    @callback
    def _handle_coordinator_update(self) -> None:
        """Retry the inverter link until the inverter device exists. @zara"""
        self._link_parent()
        super()._handle_coordinator_update()

    @callback
    def _link_parent(self) -> None:
        if self._parent is None:
            return
        entry = self.registry_entry
        if entry is None or entry.device_id is None or entry.config_entry_id is None:
            return
        # devices of this config entry only: async_get_device is deprecated since
        # HA 2026.10, async_get_device_by_identifier is unknown to older versions
        registry = dr.async_get(self.hass)
        devices = dr.async_entries_for_config_entry(registry, entry.config_entry_id)
        own = next((device for device in devices if device.id == entry.device_id), None)
        parent = next(
            (
                device
                for device in devices
                if (DOMAIN, self._parent) in device.identifiers
            ),
            None,
        )
        if own is None or parent is None:
            return
        if own.via_device_id != parent.id:
            registry.async_update_device(own.id, via_device_id=parent.id)
        self._parent = None

    @property
    def native_value(self) -> Any:
        """Return the current value. @zara"""
        device = self._device
        if device is None:
            return None
        values = device.roles if self._role else device.vendor
        return values.get(self._key)

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Contract attributes for role entities. @zara"""
        if not self._role:
            return None
        attributes: dict[str, Any] = {
            contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
            contract.ATTR_ROLE: self._role,
            contract.ATTR_DEVICE_INDEX: self._sinv_index,
            contract.ATTR_VENDOR: self._vendor.VENDOR,
        }
        device = self._device
        if device is not None and self._role in device.derived:
            attributes[contract.ATTR_DERIVED] = True
        return attributes
