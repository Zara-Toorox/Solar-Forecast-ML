# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Parse a maxxisun MaxxiCharge CCU webhook payload into the S-INV contract. @zara

Turns one CCU push payload into an S-INV device. No Home Assistant imports.
Ranges follow the payload checks in MaxxiChargeConnect (reference only, no code
copied): ``Pccu`` 0..3450 W, ``Pr`` -43600..43600 W (positive import),
``PV_power_total`` 0..60*138*battery_count W with 1..16 batteries.

``batteryCapacity`` is the State of Energy in MaxxiChargeConnect (device class
energy_storage, state class measurement): the current stored energy, not the
nameplate capacity. It is not published and does not weight the fallback state
of charge. Without a usable top-level ``SOC``, the fallback is the plain mean
of the pack ``batterySOC`` values.

``power_house`` is ``Pccu + Pr`` (unclamped). ``power_battery`` is
``PV_power_total - Pccu`` (positive while charging). ``power_ac_net`` is not
published. A payload without a usable ``deviceId`` yields no device.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

from ..contract import indexed_role

VENDOR = "maxxisun"
NAME = "Maxxisun"
CONNECTION_LOCAL = "local_webhook_maxxisun"
MAX_ENTRIES = 16
SERIAL_MAX = 64
FIRMWARE_MAX = 100
PV_W_PER_PACK = 60 * 138
PCCU_MAX_W = 3450
GRID_ABS_W = 43600
_INVALID_FIRMWARE = frozenset({"unknown", "null", "undefined", "n/a"})


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "firmware_version": VendorSpec(
        None, None, None, "Firmware version", "Firmware-Version"
    ),
    "wifi_signal": VendorSpec(
        "dBm", "signal_strength", "measurement", "Wi-Fi signal", "WLAN-Signal"
    ),
}


@dataclass
class Device:
    """One MaxxiCharge CCU as reported by a webhook payload. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def _finite(value: Any) -> float | None:
    """Finite int or float. Booleans and values that overflow float are dropped. @zara"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        number = float(value)
    except (OverflowError, ValueError, TypeError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _within(value: Any, low: float, high: float) -> float | None:
    """Return value when it is finite and inside [low, high]. @zara"""
    number = _finite(value)
    if number is None or number < low or number > high:
        return None
    return number


def _serial(device_id: Any) -> str | None:
    """ASCII letters and digits from deviceId, capped for unique ids. @zara"""
    if not isinstance(device_id, str):
        return None
    serial = "".join(c for c in device_id if c.isascii() and c.isalnum())
    if not serial:
        return None
    return serial[:SERIAL_MAX]


def _entries(value: Any) -> list[Any] | None:
    """Return a list of at most MAX_ENTRIES items, else None. @zara"""
    if not isinstance(value, list) or len(value) > MAX_ENTRIES:
        return None
    return value


def _firmware(value: Any) -> str | None:
    """Printable ASCII firmware string, or None. @zara"""
    if not isinstance(value, str):
        return None
    text = "".join(c for c in value if c.isascii() and c.isprintable())
    text = " ".join(text.split())
    if not text or len(text) > FIRMWARE_MAX or text.casefold() in _INVALID_FIRMWARE:
        return None
    return text


def _set(device: Device, role: str, value: float | None, digits: int = 1) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _fallback_soc(samples: list[float]) -> float | None:
    """Return the plain mean of pack states of charge. @zara"""
    if not samples:
        return None
    return sum(samples) / len(samples)


def _apply_balance(device: Device, payload: dict[str, Any], packs: list[Any]) -> None:
    """Measured AC, PV and grid roles plus the derived house and battery balance. @zara"""
    pccu = _within(payload.get("Pccu"), 0, PCCU_MAX_W)
    grid = _within(payload.get("Pr"), -GRID_ABS_W, GRID_ABS_W)
    solar = None
    if packs:
        solar = _within(payload.get("PV_power_total"), 0, PV_W_PER_PACK * len(packs))
    _set(device, "power_solar", solar, 0)
    _set(device, "power_inverter_ac_output", pccu, 0)
    if grid is not None:
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0.0, grid), 0)
        _set(device, "power_grid_export", max(0.0, -grid), 0)
    if pccu is not None and grid is not None:
        _set(device, "power_house", pccu + grid, 0)
        device.derived.add("power_house")
    if solar is not None and pccu is not None:
        battery = solar - pccu
        _set(device, "power_battery", battery, 0)
        _set(device, "power_battery_charge", max(0.0, battery), 0)
        _set(device, "power_battery_discharge", max(0.0, -battery), 0)
        device.derived.update(
            {"power_battery", "power_battery_charge", "power_battery_discharge"}
        )


def _apply_packs(device: Device, packs: list[Any]) -> float | None:
    """Publish per-pack PV and SoC and return their mean. @zara"""
    samples: list[float] = []
    for index, pack in enumerate(packs, start=1):
        if not isinstance(pack, dict):
            continue
        soc = _within(pack.get("batterySOC"), 0, 100)
        _set(device, indexed_role("battery_pack_soc", index), soc, 1)
        _set(
            device,
            indexed_role("power_solar_mppt", index),
            _within(pack.get("pvPower"), 0, PV_W_PER_PACK),
            0,
        )
        if soc is not None:
            samples.append(soc)
    return _fallback_soc(samples)


def _apply_soc(device: Device, payload: dict[str, Any], fallback: float | None) -> None:
    """Top-level SOC, otherwise the pack fallback (marked derived). @zara"""
    soc = _within(payload.get("SOC"), 0, 100)
    if soc is None and fallback is not None:
        soc = fallback
        device.derived.add("battery_soc")
    _set(device, "battery_soc", soc, 1)


def _apply_temperature(device: Device, converters: list[Any]) -> None:
    """Inverter temperature from the first converter only. @zara"""
    if not converters or not isinstance(converters[0], dict):
        return
    _set(
        device,
        "temperature_inverter",
        _within(converters[0].get("ccuTemperature"), -30, 100),
        1,
    )


def _apply_vendor(device: Device, payload: dict[str, Any]) -> None:
    """Firmware string and Wi-Fi signal (dBm, -120..0). @zara"""
    firmware = _firmware(payload.get("firmwareVersion"))
    if firmware is not None:
        device.vendor["firmware_version"] = firmware
    wifi = _within(payload.get("wifiStrength"), -120, 0)
    if wifi is not None:
        device.vendor["wifi_signal"] = round(wifi)


def build_devices(payload: Any) -> dict[str, Device]:
    """Parse one CCU payload into S-INV devices (keyed by serial). @zara"""
    if not isinstance(payload, dict):
        return {}
    serial = _serial(payload.get("deviceId"))
    if serial is None:
        return {}
    device = Device(
        serial=serial,
        kind="inverter",
        name="MaxxiCharge",
        manufacturer=NAME,
        model="MaxxiCharge",
    )
    packs = _entries(payload.get("batteriesInfo")) or []
    converters = _entries(payload.get("convertersInfo")) or []
    _apply_balance(device, payload, packs)
    _apply_soc(device, payload, _apply_packs(device, packs))
    _apply_temperature(device, converters)
    _apply_vendor(device, payload)
    return {device.serial: device}
