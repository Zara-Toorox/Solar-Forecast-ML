# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Sensor catalog for A17C5 message 0500. @zara

Maps each decoded MQTT key onto one sensor spec. sensor.py turns the specs
into the integration's existing MQTT sensor descriptions.
"""

import re
from dataclasses import dataclass

try:
    from .solixapi.mqttcmdmap import BYTES, NAME
    from .solixapi.mqttmap import _A17C5_0500
except ImportError:
    from solixapi.mqttcmdmap import BYTES, NAME
    from solixapi.mqttmap import _A17C5_0500

_RAW_WORD = re.compile(r"(?P<prefix>.+)_w(?P<word>\d{2})\?$")
# Second readings of the same quantity. Decoder names stay; the sensor is raw.
_SECONDARY = re.compile(
    r"^(?:ac_voltage_2|pv_\d_voltage_2|(?:main_pack|expansion_\d)_soc_2)$"
)
_NAMES: tuple[tuple[str, str, str], ...] = (
    (r"pv_(\d)_power_calc", "PV {0} power", "PV {0} Leistung"),
    (r"pv_(\d)_voltage", "PV {0} voltage", "PV {0} Spannung"),
    (r"pv_(\d)_current", "PV {0} current", "PV {0} Strom"),
    (r"internal_temperature_(\d)", "Internal temperature {0}", "Innentemperatur {0}"),
    (r"ac_voltage", "AC voltage", "AC-Spannung"),
    (r"ac_frequency", "AC frequency", "AC-Frequenz"),
    (r"battery_position", "Battery position", "Batterieposition"),
    (r"battery_type", "Battery type", "Batterietyp"),
    (r"main_controller_sn", "Main controller serial", "Seriennummer Hauptcontroller"),
    (
        r"main_pack_cell_voltage_(\d)",
        "Main pack cell voltage {0}",
        "Hauptpack Zellspannung {0}",
    ),
    (
        r"main_pack_temperature_(\d)",
        "Main pack temperature {0}",
        "Hauptpack Temperatur {0}",
    ),
    (r"main_pack_soh", "Main pack state of health", "Hauptpack Gesundheitszustand"),
    (r"main_pack_soc", "Main pack state of charge", "Hauptpack Ladestand"),
    (r"exp_(\d)_position", "Expansion {0} position", "Erweiterung {0} Position"),
    (r"exp_(\d)_type", "Expansion {0} type", "Erweiterung {0} Typ"),
    (
        r"exp_(\d)_controller_sn",
        "Expansion {0} controller serial",
        "Erweiterung {0} Controller-Seriennummer",
    ),
    (
        r"expansion_(\d)_cell_voltage_(\d)",
        "Expansion {0} cell voltage {1}",
        "Erweiterung {0} Zellspannung {1}",
    ),
    (
        r"expansion_(\d)_temperature_(\d)",
        "Expansion {0} temperature {1}",
        "Erweiterung {0} Temperatur {1}",
    ),
    (
        r"expansion_(\d)_soh",
        "Expansion {0} state of health",
        "Erweiterung {0} Gesundheitszustand",
    ),
    (
        r"expansion_(\d)_soc",
        "Expansion {0} state of charge",
        "Erweiterung {0} Ladestand",
    ),
)


@dataclass(frozen=True)
class A17c5SensorSpec:
    """One 0500 value exposed through the MQTT sensor mechanism. @zara"""

    key: str
    json_key: str
    kind: str
    translation_key: str | None = None
    name: str | None = None
    name_en: str | None = None
    name_de: str | None = None
    device_class: str | None = None
    unit: str | None = None
    state_class: str | None = None
    precision: int | None = None
    enabled_default: bool = True
    diagnostic: bool = False
    uncertain: bool = False
    power_channel: int | None = None
    expansion_index: int | None = None


def a17c5_exclude(excluded: set, device: dict) -> bool:
    """Return True when async_setup_entry must skip this catalog sensor. @zara"""
    if device.get("device_pn") != "A17C5":
        return True
    return not ({device.get("type")} - excluded)


def mqtt_fields() -> list[tuple[str, str]]:
    """Return (field, name) for every decoded key, including unused expansion slots. @zara"""
    found: list[tuple[str, str]] = []
    for field_name, field in _A17C5_0500.items():
        if not isinstance(field, dict):
            continue
        for desc in (field.get(BYTES) or {}).values():
            if isinstance(desc, dict) and (label := desc.get(NAME)):
                found.append((field_name, label))
    return found


def mqtt_keys() -> list[str]:
    """Return every decoded name in _A17C5_0500, including unused expansion slots. @zara"""
    return [label for _field_name, label in mqtt_fields()]


def expansion_count(device: dict) -> int | None:
    """Return installed expansion packs from coordinator device data. @zara

    A17C5 stores the cloud count in ``sub_package_num``. ``expansion_packs`` is
    the same count after capacity calculation. Preference matches the battery
    capacity number when ``mqtt_overlay`` is set. ``fittings`` is not a count.
    """
    if device.get("mqtt_overlay"):
        keys = ("expansion_packs", "sub_package_num")
    else:
        keys = ("sub_package_num", "expansion_packs")
    for key in keys:
        value = device.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
    return None


def a17c5_force_creation(device: dict, expansion_index: int | None) -> bool:
    """Return True when the sensor must be created before message 0500 arrives. @zara"""
    if expansion_index is None:
        return True
    count = expansion_count(device)
    if count is None:
        return False
    return 1 <= expansion_index <= count


def _expansion_slot(field_name: str) -> int | None:
    """Map binary fields a5..a9 to expansion slots 1..5. @zara"""
    if field_name in {"a5", "a6", "a7", "a8", "a9"}:
        return int(field_name[1]) - 4
    return None


def pv_power_calc(voltage: object, current: object) -> float | None:
    """Return PV power in W, or None when either input is missing. @zara"""
    if isinstance(voltage, bool) or isinstance(current, bool):
        return None
    if isinstance(voltage, int | float) and isinstance(current, int | float):
        return round(float(voltage) * float(current), 1)
    return None


def _measurement(label: str) -> tuple[str | None, str | None, int | None]:
    """Return device class, unit and precision for a named 0500 key. @zara"""
    label = label.removesuffix("?")
    if "_cell_voltage_" in label:
        return "voltage", "mV", 0
    if "voltage" in label:
        return "voltage", "V", 1
    if "_current" in label:
        return "current", "A", 1
    if label == "ac_frequency":
        return "frequency", "Hz", 2
    if "temperature" in label:
        return "temperature", "°C", 1
    if "_soc" in label:
        return "battery", "%", 1
    if label.endswith("_soh"):
        return None, "%", 1
    return None, None, None


def _display(label: str) -> tuple[str, str]:
    """Return English and German names without a trailing question mark. @zara"""
    plain = label.removesuffix("?")
    for pattern, english, german in _NAMES:
        if match := re.fullmatch(pattern, plain):
            return (
                english.format(*match.groups()),
                german.format(*match.groups()),
            )
    raise KeyError(label)


def _spec_for_key(label: str, expansion_index: int | None) -> A17c5SensorSpec:
    key = label.removesuffix("?")
    if raw := _RAW_WORD.fullmatch(label):
        return A17c5SensorSpec(
            key=key,
            json_key=label,
            kind="raw",
            name=f"{raw.group('prefix')} w{raw.group('word')}",
            enabled_default=False,
            diagnostic=True,
            uncertain=True,
            expansion_index=expansion_index,
        )
    if _SECONDARY.fullmatch(key):
        return A17c5SensorSpec(
            key=key,
            json_key=label,
            kind="raw",
            name=key,
            enabled_default=False,
            diagnostic=True,
            uncertain=label.endswith("?"),
            expansion_index=expansion_index,
        )
    device_class, unit, precision = _measurement(label)
    english, german = _display(label)
    return A17c5SensorSpec(
        key=key,
        json_key=label,
        kind="named",
        translation_key=key,
        name_en=english,
        name_de=german,
        device_class=device_class,
        unit=unit,
        state_class="measurement" if unit else None,
        precision=precision,
        uncertain=label.endswith("?"),
        expansion_index=expansion_index,
    )


def _power_specs() -> list[A17c5SensorSpec]:
    specs = []
    for channel in range(1, 5):
        label = f"pv_{channel}_power_calc"
        english, german = _display(label)
        specs.append(
            A17c5SensorSpec(
                key=label,
                json_key=label,
                kind="computed",
                translation_key=label,
                name_en=english,
                name_de=german,
                device_class="power",
                unit="W",
                state_class="measurement",
                precision=1,
                enabled_default=False,
                diagnostic=True,
                power_channel=channel,
            )
        )
    return specs


def build_sensor_specs() -> tuple[A17c5SensorSpec, ...]:
    """Build one spec per decoded key, then the four calculated PV powers. @zara"""
    decoded = tuple(
        _spec_for_key(label, _expansion_slot(field_name))
        for field_name, label in mqtt_fields()
    )
    return decoded + tuple(_power_specs())


A17C5_SENSOR_SPECS: tuple[A17c5SensorSpec, ...] = build_sensor_specs()
