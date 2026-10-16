# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Zendure adapter for the S-INV contract (local zenSDK HTTP API). @zara

Turns one ``GET /properties/report`` response into an S-INV device with contract
roles and vendor values. No Home Assistant imports; the coordinator fetches, this
module parses.

Field meanings follow the zenSDK property list (github.com/Zendure/zenSDK,
docs/en_properties.md) and published reports of SolarFlow 800 Pro 2 and
SolarFlow 4000 Mix Pro devices:
- ``solarInputPower`` total PV power, ``solarPower1``..``solarPower6`` per input (W)
- ``outputPackPower`` battery charge power, ``packInputPower`` battery discharge
  power (W, both >= 0) -> contract ``power_battery`` = charge - discharge
- ``outputHomePower`` AC output to the house (W)
- ``electricLevel`` average state of charge (%)
- ``packData[n].socLevel`` (%) and ``packData[n].maxTemp`` (0.1 K, °C = (v - 2731) / 10)

A SolarFlow 800 Pro report (2026-10-13, two packs) fixes further scalings by
cross-checks: ``BatVolt`` / 100 V (49.49 V against pack ``totalVol`` / 100 of
49.40 and 49.30 V, 15 cells of 3.29 V), ``hyperTmp`` in the same 0.1 K encoding
as ``maxTemp`` (33.0 °C) and ``socSet``/``minSoc`` in 0.1 %. They are published
only within plausible ranges, as other models may scale differently.
``gridInputPower`` (AC input; split between battery and house not reported) stays
a vendor value.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from ..contract import indexed_role

VENDOR = "zendure"
NAME = "Zendure"
CONNECTION_LOCAL = "local_zensdk"
DEFAULT_SCAN_SECONDS = 10
REPORT_PATH = "/properties/report"
MAX_SOLAR_INPUTS = 6
KELVIN_OFFSET_DECI = 2731


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a Zendure value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "grid_input_power": VendorSpec(
        "W", "power", "measurement", "AC input power", "AC-Eingangsleistung"
    ),
    "input_limit": VendorSpec(
        "W", "power", "measurement", "AC charge limit", "AC-Ladegrenze"
    ),
    "output_limit": VendorSpec(
        "W", "power", "measurement", "Output limit", "Ausgangsgrenze"
    ),
    "ac_mode": VendorSpec(None, None, None, "AC mode", "AC-Modus"),
    "wifi_signal": VendorSpec(
        "dBm", "signal_strength", "measurement", "Wi-Fi signal", "WLAN-Signal"
    ),
    "battery_voltage": VendorSpec(
        "V", "voltage", "measurement", "Battery voltage", "Akkuspannung"
    ),
    "target_soc": VendorSpec(
        "%", None, "measurement", "Target state of charge", "Ziel-Ladestand"
    ),
    "min_soc": VendorSpec(
        "%", None, "measurement", "Minimum state of charge", "Mindest-Ladestand"
    ),
}
# plausible ranges for values whose scaling is known from one model only
BATTERY_VOLTAGE_RANGE = (36.0, 60.0)
DEVICE_TEMPERATURE_RANGE = (-30.0, 90.0)


@dataclass
class ZendureDevice:
    """One Zendure device as reported by zenSDK. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)


def _num(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def product_name(product: Any) -> str:
    """Return a readable model name, e.g. solarFlow800Pro2 -> SolarFlow 800 Pro 2. @zara"""
    if not isinstance(product, str) or not product.strip():
        return NAME
    text = product.strip()
    text = re.sub(r"(?<=[a-z])(?=[A-Z0-9])|(?<=[0-9])(?=[A-Za-z])", " ", text)
    words = [word[:1].upper() + word[1:] for word in text.split()]
    return " ".join(words).replace("Solar Flow", "SolarFlow")


def identity(report: Any) -> dict[str, str] | None:
    """Return serial and names of a zenSDK report, or None if it is none. @zara"""
    if not isinstance(report, dict) or not isinstance(report.get("properties"), dict):
        return None
    serial = report.get("sn")
    if not isinstance(serial, str) or not serial.strip():
        return None
    model = product_name(report.get("product"))
    return {"serial": serial.strip(), "name": model, "model": model}


def _set(
    device: ZendureDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _deci_kelvin(value: float | None) -> float | None:
    """Convert Zendure's 0.1 K temperatures to °C. @zara"""
    return None if value is None else (value - KELVIN_OFFSET_DECI) / 10


def _scaled(value: float | None, divisor: float) -> float | None:
    return None if value is None else value / divisor


def _within(value: float | None, bounds: tuple[float, float]) -> float | None:
    return value if value is not None and bounds[0] <= value <= bounds[1] else None


def build_devices(report: Any) -> dict[str, ZendureDevice]:
    """Parse one zenSDK report into S-INV devices (keyed by serial). @zara"""
    ident = identity(report)
    if ident is None:
        return {}
    props: dict[str, Any] = report["properties"]
    device = ZendureDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    _set(device, "power_solar", _num(props.get("solarInputPower")), 0)
    for index in range(1, MAX_SOLAR_INPUTS + 1):
        _set(
            device,
            indexed_role("power_solar_mppt", index),
            _num(props.get(f"solarPower{index}")),
            0,
        )
    _set(device, "power_inverter_ac_output", _num(props.get("outputHomePower")), 0)
    charge = _num(props.get("outputPackPower"))
    discharge = _num(props.get("packInputPower"))
    _set(device, "power_battery_charge", charge, 0)
    _set(device, "power_battery_discharge", discharge, 0)
    if charge is not None and discharge is not None:
        _set(device, "power_battery", charge - discharge, 0)
        device.derived.add("power_battery")
    _set(device, "battery_soc", _num(props.get("electricLevel")), 0)
    _set(
        device,
        "temperature_inverter",
        _within(_deci_kelvin(_num(props.get("hyperTmp"))), DEVICE_TEMPERATURE_RANGE),
    )
    voltage = _within(_scaled(_num(props.get("BatVolt")), 100), BATTERY_VOLTAGE_RANGE)
    if voltage is not None:
        device.vendor["battery_voltage"] = round(voltage, 2)
    for key, source in (("target_soc", "socSet"), ("min_soc", "minSoc")):
        soc = _within(_scaled(_num(props.get(source)), 10), (0.0, 100.0))
        if soc is not None:
            device.vendor[key] = round(soc, 1)
    packs = report.get("packData")
    for index, pack in enumerate(packs if isinstance(packs, list) else [], start=1):
        if not isinstance(pack, dict):
            continue
        _set(
            device,
            indexed_role("battery_pack_soc", index),
            _num(pack.get("socLevel")),
            0,
        )
        _set(
            device,
            indexed_role("temperature_battery_pack", index),
            _deci_kelvin(_num(pack.get("maxTemp"))),
        )
    for key, source in (
        ("grid_input_power", "gridInputPower"),
        ("input_limit", "inputLimit"),
        ("output_limit", "outputLimit"),
        ("ac_mode", "acMode"),
        ("wifi_signal", "rssi"),
    ):
        value = _num(props.get(source))
        if value is not None:
            device.vendor[key] = round(value)
    ac_out = _num(props.get("outputHomePower"))
    ac_in = _num(props.get("gridInputPower"))
    if ac_out is not None and ac_in is not None:
        _set(device, "power_ac_net", ac_out - ac_in, 0)
        device.derived.add("power_ac_net")
    return {device.serial: device}
