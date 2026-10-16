# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Hoymiles adapter for AhoyDTU (local REST API) on the S-INV contract. @zara

One AhoyDTU serves several Hoymiles microinverters; each becomes an S-INV device.
No Home Assistant imports; the coordinator fetches, this module parses.

AhoyDTU web API (lumapu/ahoy, src/web/RestApi.h), read without password:
- ``GET /api/inverter/list`` lists the inverters (id, serial, name, enabled)
- ``GET /api/inverter/id/<id>`` returns ``ch``: ``ch[0]`` the AC values, ``ch[n]``
  the values of DC input n, each a plain list in a fixed field order
- AC order: U_AC (HMT: U_AC_1N), I_AC, P_AC, F_AC, PF_AC, Temp, YieldTotal (kWh),
  YieldDay (Wh), P_DC, Efficiency, Q_AC, MaxPower, MaxTemp
- DC order: U_DC, I_DC, P_DC, YieldDay (Wh), YieldTotal (kWh), Irradiation, MaxPower
A microinverter has no battery, so its AC energy is its solar energy. While an
inverter is not producing (night) its power roles read 0 W so installation totals
stay available; voltages and temperatures are not reported. Before the first
answer of an inverter AhoyDTU reports zeros, which are not published.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Any

from ..contract import ac_net_without_battery, indexed_role

VENDOR = "hoymiles"
NAME = "Hoymiles"
CONNECTION_LOCAL = "local_ahoy"
DEFAULT_SCAN_SECONDS = 15
LIST_PATH = "/api/inverter/list"
INVERTER_PATH = "/api/inverter/id/{}"
MAX_INPUTS = 6
# AC field positions in ``ch[0]``
AC_VOLTAGE, AC_CURRENT, AC_POWER, AC_FREQUENCY = 0, 1, 2, 3
AC_TEMPERATURE, AC_YIELD_TOTAL, AC_YIELD_DAY, AC_POWER_DC, AC_EFFICIENCY = 5, 6, 7, 8, 9
# DC field positions in ``ch[n]``
DC_VOLTAGE, DC_CURRENT, DC_POWER = 0, 1, 2
# inverter status: 1 starting, 2 producing
PRODUCING_STATES = (1, 2)
GENERATIONS = {0: "MI", 1: "HM", 2: "HMS", 3: "HMT"}


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
    "efficiency": VendorSpec(
        "%", None, "measurement", "Inverter efficiency", "Wirkungsgrad"
    ),
}


@dataclass
class HoymilesDevice:
    """One Hoymiles microinverter behind an AhoyDTU. @zara"""

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
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return number if math.isfinite(number) else None


def _field(channel: Any, index: int) -> float | None:
    if not isinstance(channel, list) or index >= len(channel):
        return None
    return _num(channel[index])


def serial_of(value: Any) -> str:
    """Normalize the hex serial AhoyDTU prints to upper case letters and digits. @zara"""
    return "".join(c for c in str(value or "") if c.isascii() and c.isalnum()).upper()


def is_list(response: Any) -> bool:
    """Return True for an AhoyDTU inverter list answer. @zara"""
    return isinstance(response, dict) and isinstance(response.get("inverter"), list)


def inverter_ids(listing: Any) -> list[int]:
    """Return the ids of the enabled inverters an AhoyDTU polls. @zara"""
    if not is_list(listing):
        return []
    return [
        int(item["id"])
        for item in listing["inverter"]
        if isinstance(item, dict)
        and isinstance(item.get("id"), int)
        and not isinstance(item.get("id"), bool)
        and 0 <= item["id"] < 64
        and serial_of(item.get("serial"))
        and item.get("enabled", True) is not False
    ]


def _set(
    device: HoymilesDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def build_device(detail: Any) -> HoymilesDevice | None:
    """Parse the answer of ``/api/inverter/id/<id>``. @zara"""
    if not isinstance(detail, dict) or detail.get("error"):
        return None
    serial = serial_of(detail.get("serial"))
    channels = detail.get("ch")
    if not serial or not isinstance(channels, list) or not channels:
        return None
    raw_generation = detail.get("generation")
    generation = (
        GENERATIONS.get(raw_generation) if isinstance(raw_generation, int) else None
    )
    name = "".join(c for c in str(detail.get("name") or "") if c.isprintable())[:64]
    device = HoymilesDevice(
        serial=serial,
        kind="inverter",
        name=name.strip() or f"{NAME} {serial}",
        manufacturer=NAME,
        model=f"{NAME} {generation}" if generation else "Microinverter",
    )
    ac = channels[0]
    inputs = [
        (index, channel)
        for index, channel in enumerate(channels[1 : MAX_INPUTS + 1], start=1)
        if isinstance(channel, list)
    ]
    answered = (_num(detail.get("ts_last_success")) or 0) > 0
    producing = answered and detail.get("status") in PRODUCING_STATES
    if producing:
        _set(device, "power_solar", _field(ac, AC_POWER_DC), 0)
        _set(device, "power_inverter_ac_output", _field(ac, AC_POWER), 0)
        _set(device, "voltage_grid", _field(ac, AC_VOLTAGE))
        _set(device, "frequency_grid", _field(ac, AC_FREQUENCY), 2)
        _set(device, "temperature_inverter", _field(ac, AC_TEMPERATURE))
        for index, channel in inputs:
            _set(
                device,
                indexed_role("power_solar_mppt", index),
                _field(channel, DC_POWER),
                0,
            )
            _set(
                device,
                indexed_role("voltage_solar_mppt", index),
                _field(channel, DC_VOLTAGE),
            )
            _set(
                device,
                indexed_role("current_solar_mppt", index),
                _field(channel, DC_CURRENT),
                2,
            )
        efficiency = _field(ac, AC_EFFICIENCY)
        if efficiency is not None:
            device.vendor["efficiency"] = round(efficiency, 1)
    else:
        device.roles["power_solar"] = 0
        device.roles["power_inverter_ac_output"] = 0
        for index, _channel in inputs:
            device.roles[indexed_role("power_solar_mppt", index)] = 0
    if answered:
        day = _field(ac, AC_YIELD_DAY)
        total = _field(ac, AC_YIELD_TOTAL)
        _set(device, "energy_solar_today", None if day is None else day / 1000, 3)
        # a zero total only appears before the first answer or after a reset
        if total:
            _set(device, "energy_solar_total", total, 3)
    limit = _num(detail.get("power_limit_read"))
    if limit is not None and 0 <= limit <= 100:
        device.vendor["power_limit_relative"] = round(limit, 1)
    if (net := ac_net_without_battery(device.roles)) is not None:
        device.roles["power_ac_net"] = net
    return device
