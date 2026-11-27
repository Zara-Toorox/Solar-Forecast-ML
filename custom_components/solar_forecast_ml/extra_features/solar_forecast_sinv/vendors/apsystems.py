# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""APsystems EZ1 microinverter adapter, local API on port 8050, read only. @zara

No Home Assistant imports; the coordinator fetches, this module parses.

Local API of the EZ1 (manufacturer "EZ1 Local API User Manual" V1.2). The owner
switches Local Mode on in the AP EasyPower app; the device then stops reporting
to the APsystems cloud. Every request is a plain GET without authentication and
answers ``{"data": {...}, "message": "SUCCESS"|"FAILED", "deviceId": "..."}``:

- ``getDeviceInfo``: ``deviceId``, ``devVer`` (firmware string, may start with a
  space), ``ssid``, ``ipAddr``, ``minPower`` / ``maxPower`` (settable limits).
- ``getOutputData``: ``p1`` / ``p2`` power per channel in W, ``te1`` / ``te2``
  lifetime energy per channel in kWh, ``e1`` / ``e2`` energy since device start
  (not used: not a day value).
- ``getMaxPower`` and ``getAlarm`` are read endpoints as well; the write
  endpoints are never called.

The manual lists ``p1`` / ``p2`` under output data but does not name their
measuring point (DC input or AC share). A pure PV EZ1 has no battery and no AC
input, so the channel sum is published unchanged as solar power, AC output and
net AC power. When ``devVer`` ends in ``_b`` (battery connected at the DC
input), the energy may originate partly or wholly from storage: the device is
accepted as a non-solar AC source, publishes ``power_inverter_ac_output`` and
``power_ac_net`` (= ``p1 + p2``, positive for feed-in), omits every solar role,
and exposes ``p1``, ``p2``, ``te1``, ``te2`` and ``te1 + te2`` as vendor values.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Any

from ..contract import (
    AC_SOURCE_DEVICE,
    AC_SOURCE_DEVICE_NON_SOLAR,
    ATTR_AC_SOURCE,
    ac_net_without_battery,
    indexed_role,
)

VENDOR = "apsystems"
NAME = "APsystems"
MODEL = "EZ1"
CONNECTION_LOCAL = "local_api_apsystems"
# entry data key of the device serial stored at setup
CONF_DEVICE_SERIAL = "device_serial"
DEFAULT_PORT = 8050
DEFAULT_SCAN_SECONDS = 15
MIN_SCAN_SECONDS = 10
# read endpoints of the local API; nothing else is ever requested
DEVICE_INFO = "getDeviceInfo"
OUTPUT_DATA = "getOutputData"
MAX_POWER = "getMaxPower"
ALARM = "getAlarm"
READ_ENDPOINTS = frozenset({DEVICE_INFO, OUTPUT_DATA, MAX_POWER, ALARM})
SUCCESS = "SUCCESS"
# the answers are a few hundred bytes; anything larger is not an EZ1 answer
MAX_RESPONSE_BYTES = 16 * 1024
# firmware prefix of the supported model and the battery variant marker
MODEL_PREFIX = "EZ1"
BATTERY_SUFFIX = "_b"
# per channel: maximum input voltage 60 V x maximum input current 20 A (datasheet)
MAX_CHANNEL_W = 1200.0
MAX_ENERGY_KWH = 1_000_000.0
CHANNELS = (("p1", "te1"), ("p2", "te2"))
# a lifetime total is published with 3 decimals; half a step is no drop
TOTAL_TOLERANCE_KWH = 0.0005
# attribute on the AC roles: value taken from the device's own channel sum
AC_SOURCE_ATTR = ATTR_AC_SOURCE
AC_SOURCE = AC_SOURCE_DEVICE
AC_SOURCE_NON_SOLAR = AC_SOURCE_DEVICE_NON_SOLAR
AC_SOURCE_ROLES = frozenset({"power_inverter_ac_output", "power_ac_net"})
VENDOR_AC_ENERGY_TOTAL = "ac_energy_total"


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of an APsystems value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "p1_power": VendorSpec(
        "W", "power", "measurement", "Input 1 power", "Eingang 1 Leistung"
    ),
    "p2_power": VendorSpec(
        "W", "power", "measurement", "Input 2 power", "Eingang 2 Leistung"
    ),
    "te1_energy_total": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Input 1 lifetime energy",
        "Eingang 1 Gesamtenergie",
    ),
    "te2_energy_total": VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "Input 2 lifetime energy",
        "Eingang 2 Gesamtenergie",
    ),
    VENDOR_AC_ENERGY_TOTAL: VendorSpec(
        "kWh",
        "energy",
        "total_increasing",
        "AC energy total",
        "AC-Energie gesamt",
    ),
}


class DeviceRejected(ValueError):
    """The answer is readable but not a supported EZ1 in Local Mode. @zara"""

    def __init__(self, error_key: str, message: str) -> None:
        """Keep the setup error key next to the message. @zara"""
        super().__init__(message)
        self.error_key = error_key


@dataclass
class ApsystemsDevice:
    """One APsystems EZ1 microinverter. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)
    firmware: str = ""
    non_solar: bool = False


def serial_of(value: Any) -> str:
    """Normalize a device serial to lower case letters and digits. @zara"""
    if not isinstance(value, str):
        return ""
    return "".join(c for c in value if c.isascii() and c.isalnum()).lower()[:32]


def _num(value: Any) -> float | None:
    """Return a finite int or float; strings, booleans and NaN are not readings. @zara"""
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _channel_power(value: Any) -> float | None:
    number = _num(value)
    if number is None or not 0 <= number <= MAX_CHANNEL_W:
        return None
    return number


def _lifetime(value: Any) -> float | None:
    number = _num(value)
    if number is None or not 0 <= number <= MAX_ENERGY_KWH:
        return None
    return number


def answer_data(answer: Any) -> dict[str, Any] | None:
    """Return the ``data`` object of a ``SUCCESS`` answer, else None. @zara"""
    if not isinstance(answer, dict) or answer.get("message") != SUCCESS:
        return None
    data = answer.get("data")
    return data if isinstance(data, dict) else None


def answer_serial(answer: Any) -> str:
    """Return the serial named by an answer; empty when missing or inconsistent. @zara"""
    if not isinstance(answer, dict):
        return ""
    outer = serial_of(answer.get("deviceId"))
    data = answer.get("data")
    inner = serial_of(data.get("deviceId")) if isinstance(data, dict) else ""
    if outer and inner and outer != inner:
        return ""
    return outer or inner


def firmware_of(value: Any) -> str:
    """Firmware string as reported, trimmed and printable. @zara"""
    if not isinstance(value, str):
        return ""
    return "".join(c for c in value if c.isprintable()).strip()[:64]


def is_battery_firmware(firmware: Any) -> bool:
    """Return True when the firmware string carries the ``_b`` battery suffix. @zara"""
    return firmware_of(firmware).lower().endswith(BATTERY_SUFFIX)


def device_info(answer: Any) -> dict[str, Any]:
    """Identity of an EZ1 from ``getDeviceInfo``; raises DeviceRejected otherwise. @zara"""
    data = answer_data(answer)
    serial = answer_serial(answer)
    if data is None or not serial:
        raise DeviceRejected(
            "apsystems_local_mode", "Local Mode not active or no EZ1 answer"
        )
    firmware = firmware_of(data.get("devVer"))
    if not firmware.upper().startswith(MODEL_PREFIX):
        raise DeviceRejected(
            "apsystems_unknown_model", f"unknown device version {firmware!r}"
        )
    return {
        "serial": serial,
        "name": f"{NAME} {MODEL} {serial.upper()}",
        "model": MODEL,
        "firmware": firmware,
        "non_solar": is_battery_firmware(firmware),
    }


def build_device(
    info: dict[str, Any], output: Any, *, non_solar: bool = False
) -> ApsystemsDevice | None:
    """Parse ``getOutputData`` of the device described by ``info``. @zara

    None for a ``FAILED`` answer or one without ``data``. A channel outside
    0 … MAX_CHANNEL_W is dropped; the sums need both channels. When
    ``non_solar`` is set (either explicitly via the locked marker or from
    ``info["non_solar"]``), no solar roles are published; only AC output / net
    power (positive for feed-in) and raw channel / total vendor values appear.
    """
    data = answer_data(output)
    if data is None:
        return None
    is_non_solar = bool(non_solar or info.get("non_solar"))
    device = ApsystemsDevice(
        serial=info["serial"],
        kind="inverter",
        name=info["name"],
        manufacturer=NAME,
        model=info.get("model", MODEL),
        firmware=info.get("firmware", ""),
        non_solar=is_non_solar,
    )
    powers: list[float | None] = []
    totals: list[float | None] = []
    for index, (power_key, total_key) in enumerate(CHANNELS, start=1):
        power = _channel_power(data.get(power_key))
        total = _lifetime(data.get(total_key))
        powers.append(power)
        totals.append(total)
        if is_non_solar:
            if power is not None:
                device.vendor[f"{power_key}_power"] = round(power, 1)
            if total is not None:
                device.vendor[f"{total_key}_energy_total"] = round(total, 3)
        elif power is not None:
            device.roles[indexed_role("power_solar_mppt", index)] = round(power, 1)
    if all(power is not None for power in powers):
        # measuring point of p1/p2 is not named by the manual; see module doc
        total_power = round(sum(power for power in powers if power is not None), 1)
        device.roles["power_inverter_ac_output"] = total_power
        if not is_non_solar:
            device.roles["power_solar"] = total_power
    if all(total is not None for total in totals):
        summed = round(sum(total for total in totals if total is not None), 3)
        if is_non_solar:
            device.vendor[VENDOR_AC_ENERGY_TOTAL] = summed
        else:
            device.roles["energy_solar_total"] = summed
    if (net := ac_net_without_battery(device.roles)) is not None:
        device.roles["power_ac_net"] = net
    return device


def accept_total(device: ApsystemsDevice, last: float | None) -> float | None:
    """Drop a lifetime total that fell below the last accepted one. @zara

    Applies to ``energy_solar_total`` on a pure PV device and to the vendor
    total ``ac_energy_total`` on a non-solar (``_b``) device. Returns the total
    to remember as accepted (unchanged when dropped).
    """
    if device.non_solar:
        total = device.vendor.get(VENDOR_AC_ENERGY_TOTAL)
        if total is None:
            return last
        if last is not None and total < last - TOTAL_TOLERANCE_KWH:
            del device.vendor[VENDOR_AC_ENERGY_TOTAL]
            return last
        return total
    total = device.roles.get("energy_solar_total")
    if total is None:
        return last
    if last is not None and total < last - TOTAL_TOLERANCE_KWH:
        del device.roles["energy_solar_total"]
        return last
    return total
