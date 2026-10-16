# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Hoymiles adapter for OpenDTU (local REST API) on the S-INV contract. @zara

One OpenDTU serves several Hoymiles microinverters; each becomes an S-INV device.
No Home Assistant imports; the coordinator fetches, this module parses.

OpenDTU web API (opendtu.solar, firmware/web_api):
- ``GET /api/livedata/status`` lists the inverters (serial, name, reachable, ...)
- ``GET /api/livedata/status?inv=<serial>`` adds ``AC``, ``DC`` and ``INV`` channels
- every value is ``{"v": value, "u": unit, "d": decimals}``; ``YieldDay`` in Wh,
  ``YieldTotal`` in kWh, ``DC`` keyed by input index "0".."5"

A microinverter has no battery, so its AC energy is its solar energy. While an
inverter is not reachable (night) its power roles read 0 W so installation totals
stay available; voltages and temperatures are not reported.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..contract import ac_net_without_battery, indexed_role

VENDOR = "hoymiles"
NAME = "Hoymiles"
CONNECTION_LOCAL = "local_opendtu"
DEFAULT_SCAN_SECONDS = 10
STATUS_PATH = "/api/livedata/status"
MAX_INPUTS = 6


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a Hoymiles value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "power_limit_relative": VendorSpec(
        "%", None, "measurement", "Power limit", "Leistungsbegrenzung"
    ),
    "power_limit_absolute": VendorSpec(
        "W", "power", "measurement", "Power limit (W)", "Leistungsbegrenzung (W)"
    ),
    "efficiency": VendorSpec(
        "%", None, "measurement", "Inverter efficiency", "Wirkungsgrad"
    ),
}


@dataclass
class HoymilesDevice:
    """One Hoymiles microinverter. @zara"""

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


def _value(channel: Any, name: str) -> float | None:
    """Return the number of an OpenDTU field ``{"v": ..., "u": ...}``. @zara"""
    if not isinstance(channel, dict):
        return None
    item = channel.get(name)
    if isinstance(item, dict):
        return _num(item.get("v"))
    return None


def _unit(channel: Any, name: str) -> str:
    item = channel.get(name) if isinstance(channel, dict) else None
    unit = item.get("u") if isinstance(item, dict) else None
    return unit if isinstance(unit, str) else ""


def _kwh(channel: Any, name: str) -> float | None:
    """Energy in kWh whatever unit OpenDTU reports (Wh or kWh). @zara"""
    value = _value(channel, name)
    if value is None:
        return None
    return value / 1000 if _unit(channel, name).lower() == "wh" else value


def is_status(response: Any) -> bool:
    """Return True for an OpenDTU live data answer. @zara"""
    return isinstance(response, dict) and isinstance(response.get("inverters"), list)


def inverter_serials(status: Any) -> list[str]:
    """Return the serials of the inverters an OpenDTU polls. @zara"""
    if not is_status(status):
        return []
    return [
        str(item["serial"])
        for item in status["inverters"]
        if isinstance(item, dict)
        and item.get("serial")
        and item.get("poll_enabled", True) is not False
    ]


def _set(
    device: HoymilesDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def build_device(detail: Any) -> HoymilesDevice | None:
    """Parse the detail answer of one inverter (``?inv=<serial>``). @zara"""
    if not is_status(detail) or not detail["inverters"]:
        return None
    inverter = detail["inverters"][0]
    if not isinstance(inverter, dict) or not inverter.get("serial"):
        return None
    serial = str(inverter["serial"])
    name = str(inverter.get("name") or f"{NAME} {serial}")
    device = HoymilesDevice(
        serial=serial,
        kind="inverter",
        name=name,
        manufacturer=NAME,
        model=str(inverter.get("type") or "Microinverter"),
    )
    reachable = inverter.get("reachable") is not False
    ac = (inverter.get("AC") or {}).get("0")
    inv = (inverter.get("INV") or {}).get("0")
    dc = inverter.get("DC") if isinstance(inverter.get("DC"), dict) else {}
    inputs = sorted(
        (int(key), channel)
        for key, channel in dc.items()
        if str(key).isdigit() and int(key) < MAX_INPUTS
    )
    if reachable:
        _set(device, "power_solar", _value(inv, "Power DC"), 0)
        _set(device, "power_inverter_ac_output", _value(ac, "Power"), 0)
        _set(device, "voltage_grid", _value(ac, "Voltage"))
        _set(device, "frequency_grid", _value(ac, "Frequency"), 2)
        _set(device, "temperature_inverter", _value(inv, "Temperature"))
        for index, channel in inputs:
            _set(
                device,
                indexed_role("power_solar_mppt", index + 1),
                _value(channel, "Power"),
                0,
            )
            _set(
                device,
                indexed_role("voltage_solar_mppt", index + 1),
                _value(channel, "Voltage"),
            )
            _set(
                device,
                indexed_role("current_solar_mppt", index + 1),
                _value(channel, "Current"),
                2,
            )
    else:
        device.roles["power_solar"] = 0
        device.roles["power_inverter_ac_output"] = 0
        for index, _channel in inputs:
            device.roles[indexed_role("power_solar_mppt", index + 1)] = 0
    _set(device, "energy_solar_today", _kwh(inv, "YieldDay"), 3)
    _set(device, "energy_solar_total", _kwh(inv, "YieldTotal"), 3)
    for key, source in (
        ("power_limit_relative", "limit_relative"),
        ("power_limit_absolute", "limit_absolute"),
    ):
        value = _num(inverter.get(source))
        if value is not None and value >= 0:
            device.vendor[key] = round(value, 1)
    efficiency = _value(inv, "Efficiency")
    if efficiency is not None and reachable:
        device.vendor["efficiency"] = round(efficiency, 1)
    if (net := ac_net_without_battery(device.roles)) is not None:
        device.roles["power_ac_net"] = net
    return device
