# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# * Based on ha-anker-solix by Thomas Luther (@thomluther), MIT License,
#   Copyright (c) 2024 Thomas Luther. MIT notice: LICENSE-ha-anker-solix
# ******************************************************************************

"""AnkerSolixEntity class. @thomas"""

import re
from dataclasses import dataclass
from enum import IntFlag
from pathlib import Path

from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity import DeviceInfo

from . import contract
from .const import DOMAIN, IMAGEFOLDER, MANUFACTURER
from .solixapi.apitypes import SolixSiteType
from .vendors import anker


@dataclass(frozen=True)
class AnkerSolixPicturePath:
    """Definition of picture path for device types. @thomas"""

    LOCALPATH: str = str(Path("/local"))
    IMAGEPATH: str = str(Path(LOCALPATH) / "community" / DOMAIN / IMAGEFOLDER)

    SOLARBANK: str = str(Path(IMAGEPATH) / "Solarbank_E1600_pub.png")
    INVERTER: str = str(Path(IMAGEPATH) / "MI80_A5143_pub.png")
    SMARTMETER: str = str(Path(IMAGEPATH) / "Smartmeter_A17X7_pub.png")
    SMARTPLUG: str = str(Path(IMAGEPATH) / "Smart_plug_A17X8.png")
    COMBINER_BOX: str = str(Path(IMAGEPATH) / "Power_Dock_AE100_pub.png")
    PPS: str = str(Path(IMAGEPATH) / "PPS_F1200_A1771_pub.png")
    POWERPANEL: str = str(Path(IMAGEPATH) / "Power_Panel_A17B1.png")
    HES: str = str(Path(IMAGEPATH) / "HES_X1_A5101.png")
    HOME_BACKUP: str = str(Path(IMAGEPATH) / "Home_Backup_A17E1_pub.png")
    SOLARBANK_PPS: str = str(Path(IMAGEPATH) / "Solarbank_PPS_F3000_A1782.png")
    POWERCOOLER: str = str(Path(IMAGEPATH) / "Everfrost_2_40L_A17A4_pub.png")
    CHARGER: str = str(Path(IMAGEPATH) / "Charger_250W_A2345_pub.png")
    POWERBANK: str = str(Path(IMAGEPATH) / "Prime_Powerbank_26k_A110A.png")
    EV_CHARGER: str = str(Path(IMAGEPATH) / "EV_Charger_A5191_pub.png")
    VEHICLE: str = str(Path(IMAGEPATH) / "Electric_Vehicle.png")
    GENERATOR: str = str(Path(IMAGEPATH) / "Generator_A7320_pub.png")

    A17B1: str = str(Path(IMAGEPATH) / "Power_Panel_A17B1.png")

    A17C0: str = str(Path(IMAGEPATH) / "Solarbank_E1600_pub.png")
    A17Y0: str = str(Path(IMAGEPATH) / "Fitting_A17Y0_pub.png")
    A17C1: str = str(Path(IMAGEPATH) / "Solarbank_2_pro_A17C1_pub.png")
    A17C2: str = str(Path(IMAGEPATH) / "Solarbank_2_A17C2_pub.png")
    A17C3: str = str(Path(IMAGEPATH) / "Solarbank_2_plus_A17C3_pub.png")
    A17C5: str = str(Path(IMAGEPATH) / "Solarbank_3_pro_A17C5_pub.png")
    A17E2: str = str(Path(IMAGEPATH) / "Solarbank_Max_AC_A17E2_pub.png")
    AE103: str = str(Path(IMAGEPATH) / "Solarbank_4_pro_AE103.png")
    AE111: str = str(Path(IMAGEPATH) / "Solarbank_Max_AC_A17E2_pub.png")

    A5140: str = str(Path(IMAGEPATH) / "MI60_A5140_pub.png")
    A5143: str = str(Path(IMAGEPATH) / "MI80_A5143_pub.png")

    A17X7: str = str(Path(IMAGEPATH) / "Smartmeter_A17X7_pub.png")
    A17X7US: str = str(Path(IMAGEPATH) / "Smartmeter_A17X7US.png")
    AE1R0: str = str(Path(IMAGEPATH) / "Smartmeter_AE1R0_pub.png")
    AE1X0: str = str(Path(IMAGEPATH) / "Smartmeter_AE1X0_pub.png")
    SHEM3: str = str(Path(IMAGEPATH) / "Shelly_Pro_3EM.png")
    SHEMP3: str = str(Path(IMAGEPATH) / "Shelly_Pro_3EM.png")

    A17X8: str = str(Path(IMAGEPATH) / "Smart_plug_A17X8.png")
    SHPPS: str = str(Path(IMAGEPATH) / "Shelly_plus_plug_s_black.png")

    AE100: str = str(Path(IMAGEPATH) / "Power_Dock_AE100_pub.png")

    A1782: str = str(Path(IMAGEPATH) / "Solarbank_PPS_F3000_A1782.png")

    A1722: str = str(Path(IMAGEPATH) / "PPS_C300_A1722_pub.png")
    A1723: str = str(Path(IMAGEPATH) / "PPS_C200_A1723_A1725_pub.png")
    A1725: str = str(Path(IMAGEPATH) / "PPS_C200_A1723_A1725_pub.png")
    A1726: str = str(Path(IMAGEPATH) / "PPS_C300DC_A1726_pub.png")
    A1727: str = str(Path(IMAGEPATH) / "PPS_C200DC_A1727_pub.png")
    A1728: str = str(Path(IMAGEPATH) / "PPS_C300X_A1728_pub.png")
    A1729: str = str(Path(IMAGEPATH) / "PPS_C200XDC_A1729_pub.png")
    A1753: str = str(Path(IMAGEPATH) / "PPS_C800X_A1755_pub.png")
    A1754: str = str(Path(IMAGEPATH) / "PPS_C800X_A1755_pub.png")
    A1755: str = str(Path(IMAGEPATH) / "PPS_C800X_A1755_pub.png")
    A1761: str = str(Path(IMAGEPATH) / "PPS_C1000X_A1761_pub.png")
    A1762: str = str(Path(IMAGEPATH) / "PPS_1000_A1762_pub.png")
    A1763: str = str(Path(IMAGEPATH) / "PPS_C1000_gen2_A1763_pub.png")
    A1765: str = str(Path(IMAGEPATH) / "PPS_C1000X_gen2_A1765_pub.png")
    AS100: str = str(Path(IMAGEPATH) / "PPS_C1000X_gen2_A1765_pub.png")
    AS220: str = str(Path(IMAGEPATH) / "PPS_S2000_AS220.png")
    A1770: str = str(Path(IMAGEPATH) / "PPS_F1200_A1771_pub.png")
    A1771: str = str(Path(IMAGEPATH) / "PPS_F1200_A1771_pub.png")
    A1772: str = str(Path(IMAGEPATH) / "PPS_F1500_A1772_pub.png")
    A1780: str = str(Path(IMAGEPATH) / "PPS_F2000_A1780_pub.png")
    A1780P: str = str(Path(IMAGEPATH) / "PPS_F2000_A1780_pub.png")
    A1781: str = str(Path(IMAGEPATH) / "PPS_F2600_A1781_pub.png")
    A1783: str = str(Path(IMAGEPATH) / "PPS_C2000_gen2_A1783_pub.png")
    A1785: str = str(Path(IMAGEPATH) / "PPS_C2000_gen2_A1783_pub.png")
    A1790: str = str(Path(IMAGEPATH) / "PPS_F3800_A1790_pub.png")
    A1790P: str = str(Path(IMAGEPATH) / "PPS_F3800_A1790P_pub.png")
    A17B2: str = str(Path(IMAGEPATH) / "Fitting_A17B2_pub.png")
    A17D0: str = str(Path(IMAGEPATH) / "Fitting_A17D0_pub.png")
    A17D4: str = str(Path(IMAGEPATH) / "Fitting_A17D4_pub.png")

    A17A0: str = str(Path(IMAGEPATH) / "PowerCooler30_A17A0_pub.png")
    A17A1: str = str(Path(IMAGEPATH) / "PowerCooler40_A17A1_pub.png")
    A17A2: str = str(Path(IMAGEPATH) / "PowerCooler50_A17A2_pub.png")
    A17A3: str = str(Path(IMAGEPATH) / "Everfrost_2_23L_A17A3_pub.png")
    A17A4: str = str(Path(IMAGEPATH) / "Everfrost_2_40L_A17A4_pub.png")
    A17A5: str = str(Path(IMAGEPATH) / "Everfrost_2_58L_A17A5_pub.png")

    A5101: str = str(Path(IMAGEPATH) / "HES_X1_A5101.png")
    A5102: str = str(Path(IMAGEPATH) / "HES_X1_A5101.png")
    A5103: str = str(Path(IMAGEPATH) / "HES_X1_A5101.png")
    A5220: str = str(Path(IMAGEPATH) / "HES_A5220_pub.png")
    A5150: str = str(Path(IMAGEPATH) / "HES_A5150_pub.png")
    A5341: str = str(Path(IMAGEPATH) / "HES_A5341_pub.png")
    A5450: str = str(Path(IMAGEPATH) / "HES_A5450_pub.png")
    AX1S0: str = str(Path(IMAGEPATH) / "Power_Dock_AX1S0_pub.png")

    A17E1: str = str(Path(IMAGEPATH) / "Home_Backup_A17E1_pub.png")
    AX170: str = str(Path(IMAGEPATH) / "Power_Dock_AX170_pub.png")

    A7320: str = str(Path(IMAGEPATH) / "Generator_A7320_pub.png")

    A5191: str = str(Path(IMAGEPATH) / "EV_Charger_A5191_pub.png")

    A1903: str = str(Path(IMAGEPATH) / "Charging_base_150W_A1903.png")
    A2345: str = str(Path(IMAGEPATH) / "Charger_250W_A2345_pub.png")
    A25X7: str = str(Path(IMAGEPATH) / "Charger_wireless_A25X7_pub.png")
    A2687: str = str(Path(IMAGEPATH) / "Charger_160W_A2687.png")
    A91B2: str = str(Path(IMAGEPATH) / "Charger_240W_A91B2_pub.png")
    AS200: str = str(Path(IMAGEPATH) / "Alternator_Charger_AS200.png")

    A110A: str = str(Path(IMAGEPATH) / "Prime_Powerbank_26k_A110A.png")
    A110B: str = str(Path(IMAGEPATH) / "Prime_Powerbank_20k_A110B.png")


@dataclass(frozen=True)
class AnkerSolixEntityType:
    """Definition of entity types used. @thomas"""

    ACCOUNT: str = "account"
    SITE: str = "site"
    DEVICE: str = "device"
    VEHICLE: str = "vehicle"


@dataclass(frozen=True)
class AnkerSolixEntityRequiredKeyMixin:
    """Sensor entity description with required extra keys. @thomas"""

    json_key: str


class AnkerSolixEntityFeature(IntFlag):
    """Supported features of the Anker Solix Entities. @thomas"""

    SOLARBANK_SCHEDULE = 1
    ACCOUNT_INFO = 2
    SYSTEM_INFO = 4
    AC_CHARGE = 8


def get_AnkerSolixSubdeviceInfo(data: dict, identifier: str) -> DeviceInfo:
    """Return an Anker Solix Sub Device DeviceInfo. @thomas"""

    return DeviceInfo(
        identifiers=anker.device_identifiers(identifier, data.get("type")),
        manufacturer=MANUFACTURER,
        serial_number=data.get("device_sn"),
        model=data.get("name") or data.get("device_pn"),
        # Use new model_id attribute supported since core 2024.8.0
        model_id=data.get("device_pn"),
        name=data.get("alias") or data.get("name"),
        sw_version=str(data.get("sw_version") or "").lstrip("v"),
    )


def get_AnkerSolixDeviceInfo(data: dict, identifier: str) -> DeviceInfo:
    """Return an Anker Solix End Device DeviceInfo. @thomas"""

    return DeviceInfo(
        identifiers=anker.device_identifiers(identifier, data.get("type")),
        manufacturer=MANUFACTURER,
        serial_number=data.get("device_sn"),
        model=data.get("name") or data.get("device_pn"),
        # Use new model_id attribute supported since core 2024.8.0
        model_id=data.get("device_pn"),
        name=data.get("alias") or data.get("name"),
        sw_version=str(data.get("sw_version") or "").lstrip("v"),
    )


def get_AnkerSolixSystemInfo(data: dict, identifier: str) -> DeviceInfo:
    """Return an Anker Solix System DeviceInfo. @thomas"""

    power_site_type = data.get("power_site_type")
    site_type = getattr(SolixSiteType, "t_" + str(power_site_type), "")
    return DeviceInfo(
        identifiers={(DOMAIN, identifier)},
        manufacturer=MANUFACTURER,
        serial_number=data.get("site_id"),
        model=(str(site_type).capitalize() + " Site").strip(),
        model_id=f"Type {data.get('power_site_type')}",
        name=f"System {data.get('site_name')}",
    )


def get_AnkerSolixAccountInfo(data: dict, identifier: str) -> DeviceInfo:
    """Return an Anker Solix Account DeviceInfo. @thomas"""

    return DeviceInfo(
        identifiers={(DOMAIN, identifier)},
        manufacturer=MANUFACTURER,
        serial_number=identifier,
        model=str(data.get("type")).capitalize(),
        model_id=data.get("server"),
        name=f"{data.get('nickname')} ({str(data.get('country') or '--').upper()})",
    )


def get_AnkerSolixVehicleInfo(data: dict, identifier: str) -> DeviceInfo:
    """Return an Anker Solix Vehicle DeviceInfo. @thomas"""

    return DeviceInfo(
        identifiers={(DOMAIN, identifier)},
        manufacturer=data.get("brand"),
        serial_number=identifier,
        model=str(data.get("type")).capitalize(),
        model_id=data.get("model"),
        hw_version=str(data.get("productive_year")),
        name=data.get("vehicle_name"),
    )


def sinv_identity(
    key: str, context: str, device_type: str | None, domain: str
) -> tuple[str | None, str]:
    """Return (contract role or None, unique_id) for an entity key on a device. @zara"""
    role = anker.role_for_key(key, device_type)
    split = contract.split_role(role) if role else None
    if split is None or domain not in split[0].domains:
        role = None
    if role:
        return role, contract.role_unique_id(context, role)
    return None, contract.vendor_unique_id(context, anker.VENDOR, key)


def vendor_free_entity_id(hass, registry, domain, vendor, key, unique_id) -> str:
    """First free vendor entity_id sinv_<vendor>_<key>, then sinv_<vendor>_<n>_<key>. @zara"""
    for index in range(1, 100):
        entity_id = f"{domain}.{contract.vendor_object_id(vendor, key, index)}"
        entry = registry.async_get(entity_id)
        if entry is not None:
            if entry.unique_id == unique_id and entry.platform == DOMAIN:
                return entity_id
            continue
        if hass.states.get(entity_id) is None:
            return entity_id
    return f"{domain}.{contract.vendor_object_id(vendor, key, 1)}_{unique_id[-8:]}"


def device_class_index(registry, device_class: str, serial: str) -> int:
    """Index nn of a device within its class (iv, bt, gm), stable once assigned. @zara

    Reuses the index of an entity of the same device and class; otherwise the
    lowest index no other device of that class uses.
    """
    pattern = re.compile(rf"^sinv_{device_class}(\d\d)_")
    serial = serial.lower()
    used: set[int] = set()
    for entry in registry.entities.values():
        if entry.platform != DOMAIN:
            continue
        match = pattern.match(entry.entity_id.split(".", 1)[1])
        if match is None:
            continue
        parsed = contract.parse_unique_id(entry.unique_id)
        if (
            parsed
            and parsed.get("role")
            and parsed["serial"] == serial
            and contract.role_class(parsed["role"]) == device_class
        ):
            return int(match.group(1))
        used.add(int(match.group(1)))
    index = 1
    while index in used:
        index += 1
    return index


def _is_previous_role_id(entity_id: str, role: str) -> bool:
    """Return True for ids of the first contract draft (sinv_<role>, sinv_<n>_<role>). @zara"""
    object_id = entity_id.split(".", 1)[1]
    return re.fullmatch(rf"sinv_(\d+_)?{re.escape(role)}", object_id) is not None


def _convert_previous_role_entry(
    registry, entity_id, domain, role, serial
) -> str | None:
    """Move a device entry of the first draft onto the current scheme. @zara

    ``sinv_<role>`` of a role with a system entity is handed to the system entity
    (unique_id sinv:1:site:<role>) so the installation keeps its history; all other
    draft ids are renamed to ``sinv_<class><nn>_<role>``. Returns the remaining
    entity_id of the device entry, or None when the entry became the system entity.
    """
    if not _is_previous_role_id(entity_id, role):
        return entity_id
    system_id = f"{domain}.{contract.system_object_id(role)}"
    if (
        entity_id == system_id
        and contract.has_system_entity(role)
        and contract.system_domain(role) == domain
        and registry.async_get_entity_id(
            domain, DOMAIN, contract.system_unique_id(role)
        )
        is None
    ):
        registry.async_update_entity(
            entity_id, new_unique_id=contract.system_unique_id(role)
        )
        return None
    index = device_class_index(registry, contract.role_class(role), serial)
    target = f"{domain}.{contract.device_object_id(role, index)}"
    if registry.async_get(target) is None:
        changes: dict = {"new_entity_id": target}
        if contract.is_site_only(role):
            changes["hidden_by"] = er.RegistryEntryHider.INTEGRATION
        registry.async_update_entity(entity_id, **changes)
        return target
    return entity_id


@callback
def async_convert_draft_system_entries(hass) -> int:
    """Hand every first-draft ``sinv_<role>`` entry to its system entity. @zara

    Runs before the installation adds its entities, whichever config entry starts
    first, so a system entity never registers next to the draft entry as
    ``sinv_<role>_2`` and the installation keeps the history.
    """
    registry = er.async_get(hass)
    converted = 0
    for entry in list(registry.entities.values()):
        if entry.platform != DOMAIN or not isinstance(entry.unique_id, str):
            continue
        parsed = contract.parse_unique_id(entry.unique_id)
        if (
            not parsed
            or not parsed.get("role")
            or parsed["serial"] == contract.SITE_SERIAL
        ):
            continue
        domain, object_id = entry.entity_id.split(".", 1)
        if (
            object_id != contract.system_object_id(parsed["role"])
            or not contract.has_system_entity(parsed["role"])
            or contract.system_domain(parsed["role"]) != domain
        ):
            continue
        if (
            _convert_previous_role_entry(
                registry, entry.entity_id, domain, parsed["role"], parsed["serial"]
            )
            is None
        ):
            converted += 1
    return converted


@callback
def async_reclaim_system_ids(hass) -> int:
    """Rename system entities registered as ``sinv_<role>_<n>`` to free ``sinv_<role>``. @zara"""
    registry = er.async_get(hass)
    renamed = 0
    for entry in list(registry.entities.values()):
        if entry.platform != DOMAIN or not isinstance(entry.unique_id, str):
            continue
        parsed = contract.parse_unique_id(entry.unique_id)
        if (
            not parsed
            or not parsed.get("role")
            or parsed["serial"] != contract.SITE_SERIAL
        ):
            continue
        domain, object_id = entry.entity_id.split(".", 1)
        system_id = contract.system_object_id(parsed["role"])
        target = f"{domain}.{system_id}"
        if (
            re.fullmatch(rf"{re.escape(system_id)}_\d+", object_id) is None
            or registry.async_get(target) is not None
            or hass.states.get(target) is not None
        ):
            continue
        registry.async_update_entity(entry.entity_id, new_entity_id=target)
        renamed += 1
    return renamed


def assign_role_identity(hass, domain: str, serial: str, role: str, unique_id: str):
    """Return (entity_id to suggest or None, device index) for a device role entity. @zara"""
    registry = er.async_get(hass)
    current = registry.async_get_entity_id(domain, DOMAIN, unique_id)
    if current is not None:
        current = _convert_previous_role_entry(registry, current, domain, role, serial)
    index = device_class_index(registry, contract.role_class(role), serial)
    target = f"{domain}.{contract.device_object_id(role, index)}"
    if current is not None:
        object_id = current.split(".", 1)[1]
        # ids generated before the contract (sinv_<device name>_...) follow the scheme;
        # ids a user chose himself are left alone
        if (
            object_id.startswith(f"{contract.OBJECT_ID_PREFIX}_")
            and current != target
            and re.fullmatch(
                rf"sinv_{contract.role_class(role)}\d\d_{re.escape(role)}", object_id
            )
            is None
            and registry.async_get(target) is None
        ):
            registry.async_update_entity(current, new_entity_id=target)
        return None, index
    entry = registry.async_get(target)
    if entry is not None and entry.unique_id != unique_id:
        target = f"{target}_{unique_id[-8:]}"
    return target, index


def _demote_retired_role(hass, registry, entry, domain, parsed, contexts, data) -> bool:
    """Turn a role entry whose key became a vendor value into that vendor entity. @zara"""
    key = anker.RETIRED_ROLES.get(parsed["role"]) or anker.FLOW_ROLE_VENDOR_KEY.get(
        parsed["role"]
    )
    context = next((c for c in contexts if c.lower() == parsed["serial"]), None)
    if key is None or context is None:
        return False
    device = data.get(context) if isinstance(data.get(context), dict) else {}
    if anker.role_for_key(key, device.get("type")) == parsed["role"]:
        return False
    unique_id = contract.vendor_unique_id(parsed["serial"], anker.VENDOR, key)
    if registry.async_get_entity_id(domain, DOMAIN, unique_id) is not None:
        return False
    registry.async_update_entity(
        entry.entity_id,
        new_unique_id=unique_id,
        new_entity_id=vendor_free_entity_id(
            hass, registry, domain, anker.VENDOR, key, unique_id
        ),
    )
    return True


def async_migrate_legacy_entities(hass, config_entry_id: str, data: dict | None) -> int:
    """Move registry entries of this entry onto the current contract identity. @zara

    Handles legacy ``<context>_<key>`` ids, vendor entities whose key gained a
    role, and role entities of the first draft (``sinv_<role>``, ``sinv_<n>_<role>``).
    Runs at setup, before entities are added, so live-only entities migrate too.
    """
    registry = er.async_get(hass)
    contexts = sorted(
        (str(context) for context in (data or {}) if isinstance(context, str)),
        key=len,
        reverse=True,
    )
    migrated = 0
    for entry in list(er.async_entries_for_config_entry(registry, config_entry_id)):
        unique_id = entry.unique_id
        if entry.platform != DOMAIN or not isinstance(unique_id, str):
            continue
        domain = entry.entity_id.split(".", 1)[0]
        parsed = contract.parse_unique_id(unique_id)
        if parsed and parsed.get("role"):
            role = parsed["role"]
            if parsed["serial"] == contract.SITE_SERIAL:
                continue
            draft_system_id = (
                entry.entity_id == f"{domain}.{contract.system_object_id(role)}"
            )
            if not draft_system_id and _demote_retired_role(
                hass, registry, entry, domain, parsed, contexts, data
            ):
                migrated += 1
            elif _is_previous_role_id(entry.entity_id, role):
                _convert_previous_role_entry(
                    registry, entry.entity_id, domain, role, parsed["serial"]
                )
                migrated += 1
            continue
        if parsed:
            # vendor entities whose key has meanwhile been assigned a contract role
            if parsed.get("vendor") != anker.VENDOR:
                continue
            context = next((c for c in contexts if c.lower() == parsed["serial"]), None)
            key = parsed["key"]
        else:
            context = next(
                (c for c in contexts if unique_id.startswith(f"{c.lower()}_")), None
            )
            key = unique_id[len(context) + 1 :] if context is not None else None
        if context is None or key is None:
            continue
        device = data.get(context) if isinstance(data.get(context), dict) else {}
        role, new_unique_id = sinv_identity(
            key, context.lower(), device.get("type"), domain
        )
        if new_unique_id == unique_id:
            continue
        if registry.async_get_entity_id(domain, DOMAIN, new_unique_id) is not None:
            continue
        if role:
            index = device_class_index(registry, contract.role_class(role), context)
            target = f"{domain}.{contract.device_object_id(role, index)}"
        else:
            target = vendor_free_entity_id(
                hass, registry, domain, anker.VENDOR, key, new_unique_id
            )
        if registry.async_get(target) is not None:
            target = f"{target}_{new_unique_id[-8:]}"
        registry.async_update_entity(
            entry.entity_id, new_unique_id=new_unique_id, new_entity_id=target
        )
        migrated += 1
    return migrated


class SinvEntity:
    """Contract identity for every S-INV platform entity. @zara

    Before core registers the entity, ``add_to_platform_start`` replaces the
    legacy ``<context>_<key>`` unique_id with the contract identity, migrates an
    existing registry entry (keeps its history) and suggests the normative
    entity_id by setting ``entity_id``, the mechanism core provides for
    integrations that choose their own ids.
    """

    _sinv_role: str | None = None
    _sinv_index: int = 1

    def add_to_platform_start(self, hass, platform, parallel_updates) -> None:
        """Assign the contract identity before the entity id is generated. @zara"""
        self._sinv_assign_identity(hass, platform.domain)
        super().add_to_platform_start(hass, platform, parallel_updates)

    def _sinv_assign_identity(self, hass, domain: str) -> None:
        legacy_uid = getattr(self, "_attr_unique_id", None)
        description = getattr(self, "entity_description", None)
        key = getattr(description, "key", None)
        if not isinstance(legacy_uid, str) or not isinstance(key, str):
            return
        context = getattr(self, "coordinator_context", None)
        if not isinstance(context, str) or not context:
            context = legacy_uid[: -(len(key) + 1)] or legacy_uid
        coordinator = getattr(self, "coordinator", None)
        device = (getattr(coordinator, "data", None) or {}).get(context) or {}
        device_type = device.get("type") if isinstance(device, dict) else None
        role, unique_id = sinv_identity(key, context, device_type, domain)

        registry = er.async_get(hass)
        if registry.async_get_entity_id(domain, DOMAIN, unique_id) is None:
            legacy = registry.async_get_entity_id(domain, DOMAIN, legacy_uid.lower())
            if legacy is None and role:
                # key was a vendor entity before it was assigned a contract role
                legacy = registry.async_get_entity_id(
                    domain,
                    DOMAIN,
                    contract.vendor_unique_id(context, anker.VENDOR, key),
                )
            if legacy is not None:
                registry.async_update_entity(legacy, new_unique_id=unique_id)
        self._attr_unique_id = unique_id
        self._sinv_role = role
        if role:
            suggestion, self._sinv_index = assign_role_identity(
                hass, domain, context, role, unique_id
            )
            spec, channel = contract.split_role(role)
            self._attr_translation_key = f"sinv_{spec.base}"
            self._attr_translation_placeholders = (
                {"nn": f"{channel:02d}"} if channel is not None else {}
            )
            if contract.is_site_only(role):
                self._attr_entity_registry_visible_default = False
        else:
            current = registry.async_get_entity_id(domain, DOMAIN, unique_id)
            suggestion = (
                None
                if current
                else vendor_free_entity_id(
                    hass, registry, domain, anker.VENDOR, key, unique_id
                )
            )
        if suggestion is not None:
            self.entity_id = suggestion

    def __init_subclass__(cls, **kwargs) -> None:
        """Platform classes define their own attributes; merge the contract keys in. @zara"""
        super().__init_subclass__(**kwargs)
        prop = cls.__dict__.get("extra_state_attributes")
        if isinstance(prop, property) and not getattr(prop.fget, "_sinv_merged", False):
            fget = prop.fget

            def merged(self, _fget=fget):
                return self._sinv_merge_attributes(_fget(self))

            merged._sinv_merged = True
            cls.extra_state_attributes = property(merged)

    def _sinv_merge_attributes(self, base: dict | None) -> dict | None:
        if not self._sinv_role:
            return base
        return {
            **(base or {}),
            contract.ATTR_CONTRACT: contract.CONTRACT_VERSION,
            contract.ATTR_ROLE: self._sinv_role,
            contract.ATTR_DEVICE_INDEX: self._sinv_index,
            contract.ATTR_VENDOR: anker.VENDOR,
        }
