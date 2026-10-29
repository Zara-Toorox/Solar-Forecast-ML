# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Enphase IQ microinverters behind an IQ Gateway (local API) on the S-INV contract. @zara

One IQ Gateway (Envoy, software 7.x or later) serves several IQ microinverters
(IQ8AC and others); each becomes an S-INV device. The gateway itself becomes a
meter device when a production or net-consumption CT is enabled.
No Home Assistant imports; the coordinator fetches, this module parses.

Enphase technical brief "Accessing IQ Gateway local APIs or local UI with
token-based authentication" (January 2023), HTTPS with a Bearer token:
- ``GET /api/v1/production/inverters``: per microinverter ``serialNumber``,
  ``devType``, ``lastReportDate`` (epoch s) and ``lastReportWatts``, refreshed
  about every 5 minutes; no DC values, no energy counters
- ``GET /ivp/meters``: CT configuration (``eid``, ``state``, ``measurementType``,
  ``meteringStatus``)
- ``GET /ivp/meters/readings``: per CT ``activePower`` (W), ``actEnergyDlvd`` /
  ``actEnergyRcvd`` (Wh), ``voltage``, ``freq``, ``timestamp``
The brief only reports AC values, so a microinverter's ``power_solar`` is its AC
output. An inverter whose last report is older than ``STALE_SECONDS`` is asleep
and reads 0 W. Only a net-consumption CT at the grid point provides grid roles;
the house balance needs the production CT as well. Total-consumption and storage
CTs are not documented in the brief and stay unused.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Any

from ..contract import ac_net_without_battery

VENDOR = "enphase"
NAME = "Enphase"
CONNECTION_LOCAL = "local_envoy"
DEFAULT_SCAN_SECONDS = 60
MIN_SCAN_SECONDS = 30
INVERTERS_PATH = "/api/v1/production/inverters"
METERS_PATH = "/ivp/meters"
READINGS_PATH = "/ivp/meters/readings"
# devType of a microinverter in the production list
DEV_TYPE_MICROINVERTER = 1
# microinverters report every 5 minutes; three missed reports mean asleep
STALE_SECONDS = 900
# a report this far ahead of the local clock is not trusted
FUTURE_TOLERANCE_SECONDS = 300
# one IQ microinverter delivers well below this
MAX_INVERTER_WATTS = 1000
MAX_SERIAL_LENGTH = 32
METER_PRODUCTION = "production"
METER_NET_CONSUMPTION = "net-consumption"


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of an Enphase value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "max_report_power": VendorSpec(
        "W",
        "power",
        "measurement",
        "Highest reported power",
        "Höchste gemeldete Leistung",
    ),
    "production_ct_power": VendorSpec(
        "W", "power", "measurement", "Production CT power", "Leistung Produktions-CT"
    ),
    "meter_voltage": VendorSpec(
        "V", "voltage", "measurement", "Grid point voltage", "Spannung Netzanschluss"
    ),
    "meter_frequency": VendorSpec(
        "Hz",
        "frequency",
        "measurement",
        "Grid point frequency",
        "Frequenz Netzanschluss",
    ),
}


@dataclass
class EnphaseDevice:
    """One IQ microinverter or the grid meter of an IQ Gateway. @zara"""

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


def serial_of(value: Any) -> str:
    """Normalize a serial number to ASCII letters and digits, upper case. @zara"""
    text = "".join(c for c in str(value or "") if c.isascii() and c.isalnum())
    return text.upper() if len(text) <= MAX_SERIAL_LENGTH else ""


def is_inverter_list(response: Any) -> bool:
    """Return True for an answer of the production inverter list. @zara"""
    return isinstance(response, list)


def is_meter_list(response: Any) -> bool:
    """Return True for an answer of the CT configuration. @zara"""
    return isinstance(response, list)


def build_inverters(listing: Any, now: float) -> dict[str, EnphaseDevice]:
    """Parse ``/api/v1/production/inverters`` at local epoch time ``now``. @zara"""
    devices: dict[str, EnphaseDevice] = {}
    if not is_inverter_list(listing):
        return devices
    for item in listing:
        if not isinstance(item, dict):
            continue
        dev_type = item.get("devType")
        if type(dev_type) is not int or dev_type != DEV_TYPE_MICROINVERTER:
            continue
        serial = serial_of(item.get("serialNumber"))
        if not serial or serial in devices:
            continue
        device = EnphaseDevice(
            serial=serial,
            kind="inverter",
            name=f"{NAME} {serial}",
            manufacturer=NAME,
            model="IQ Microinverter",
        )
        devices[serial] = device
        reported = _num(item.get("lastReportDate"))
        watts = _num(item.get("lastReportWatts"))
        if reported is None or reported > now + FUTURE_TOLERANCE_SECONDS:
            continue
        if now - reported > STALE_SECONDS:
            power = 0.0
        elif watts is not None and 0 <= watts <= MAX_INVERTER_WATTS:
            power = watts
        else:
            continue
        device.roles["power_solar"] = round(power)
        device.roles["power_inverter_ac_output"] = round(power)
        if (net := ac_net_without_battery(device.roles)) is not None:
            device.roles["power_ac_net"] = net
        peak = _num(item.get("maxReportWatts"))
        if peak is not None and 0 <= peak <= MAX_INVERTER_WATTS:
            device.vendor["max_report_power"] = round(peak)
    return devices


def _active_meters(meters: Any) -> dict[str, int]:
    """Map measurement type to eid for every enabled, normally metering CT. @zara"""
    found: dict[str, int] = {}
    if not is_meter_list(meters):
        return found
    for meter in meters:
        if not isinstance(meter, dict):
            continue
        eid = meter.get("eid")
        kind = meter.get("measurementType")
        if (
            not isinstance(eid, int)
            or isinstance(eid, bool)
            or not isinstance(kind, str)
        ):
            continue
        if meter.get("state") != "enabled" or meter.get("meteringStatus") != "normal":
            continue
        found.setdefault(kind, eid)
    return found


def _fresh_reading(readings: Any, eid: int, now: float) -> dict[str, Any] | None:
    if not isinstance(readings, list):
        return None
    for reading in readings:
        if isinstance(reading, dict) and reading.get("eid") == eid:
            stamp = _num(reading.get("timestamp"))
            if stamp is None or not (
                now - STALE_SECONDS <= stamp <= now + FUTURE_TOLERANCE_SECONDS
            ):
                return None
            return reading
    return None


def _kwh(wh: float | None) -> float | None:
    return None if wh is None or wh < 0 else round(wh / 1000, 3)


def build_gateway(
    gateway_serial: str, meters: Any, readings: Any, now: float
) -> EnphaseDevice | None:
    """Gateway device from its production and net-consumption CTs, else None. @zara"""
    active = _active_meters(meters)
    if METER_NET_CONSUMPTION not in active and METER_PRODUCTION not in active:
        return None
    device = EnphaseDevice(
        serial=gateway_serial,
        kind="meter",
        name=f"{NAME} IQ Gateway {gateway_serial}",
        manufacturer=NAME,
        model="IQ Gateway",
    )
    production = (
        _fresh_reading(readings, active[METER_PRODUCTION], now)
        if METER_PRODUCTION in active
        else None
    )
    solar = None
    if production is not None:
        solar = _num(production.get("activePower"))
        if solar is not None:
            device.vendor["production_ct_power"] = round(solar)
        # production CT: delivered = AC energy of the microinverters
        if (produced := _kwh(_num(production.get("actEnergyDlvd")))) is not None:
            device.roles["energy_solar_total"] = produced
    net = (
        _fresh_reading(readings, active[METER_NET_CONSUMPTION], now)
        if METER_NET_CONSUMPTION in active
        else None
    )
    if net is None:
        return device
    grid = _num(net.get("activePower"))
    if grid is not None:
        device.roles["power_grid"] = round(grid)
        device.roles["power_grid_import"] = round(max(0.0, grid))
        device.roles["power_grid_export"] = round(max(0.0, -grid))
        device.derived.update({"power_grid_import", "power_grid_export"})
    # net-consumption CT: delivered = from the grid, received = into the grid
    if (imported := _kwh(_num(net.get("actEnergyDlvd")))) is not None:
        device.roles["energy_grid_import_total"] = imported
    if (exported := _kwh(_num(net.get("actEnergyRcvd")))) is not None:
        device.roles["energy_grid_export_total"] = exported
    if (voltage := _num(net.get("voltage"))) is not None and voltage > 0:
        device.vendor["meter_voltage"] = round(voltage, 1)
    if (frequency := _num(net.get("freq"))) is not None and frequency > 0:
        device.vendor["meter_frequency"] = round(frequency, 2)
    if solar is not None and grid is not None:
        # house = own AC production + grid import (an energy balance)
        device.roles["power_house"] = round(solar + grid)
        device.derived.add("power_house")
    return device
