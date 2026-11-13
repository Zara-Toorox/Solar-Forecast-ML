# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Solplanet (AISWEI) Ai-Dongle adapter, local HTTP JSON API, read only. @zara

No AISWEI document covers this API. Every field below is a community map
(calvinbui/home-assistant-solplanet, MIT, and the evcc meter template); values
from it are marked "community map" and stay to be confirmed by tester data.

Requests, all GET, answered with one JSON object:

* ``getdev.cgi?device=2``: inverter list ``inv`` with ``isn``, ``model``,
  ``msw`` and the type code ``mty``.
* ``getdevdata.cgi?device=2&sn=<isn>``: inverter live data.
* ``getdevdata.cgi?device=3``: meter live data. A dongle without a meter
  answers with a zero-filled stub; it counts as a meter only with a timestamp
  or a non-zero value.
* ``getdevdata.cgi?device=4&sn=<isn>``: battery live data of a storage
  inverter (``mty`` 11-20 or a serial starting with ``BE``).

Older firmware answers on HTTP port 8484, newer firmware on HTTPS port 443 with
a self-signed certificate. Grid power ``pac`` of the meter is positive while
importing (community map and evcc grid usage agree). Battery power ``pb`` is
positive while discharging (community map: evcc battery usage reads it without
a sign change); contract ``power_battery`` is the negated value. Writing
endpoints (``setting.cgi``, ``fdbg.cgi``) are never used.
"""

from __future__ import annotations

import math
from typing import Any
from urllib.parse import quote

from ..contract import indexed_role
from .solplanet import NAME, VENDOR, VENDOR_SPECS, SolplanetDevice

__all__ = ("NAME", "VENDOR", "VENDOR_SPECS", "SolplanetDevice")

CONNECTION_DONGLE = "local_dongle_solplanet"
# The dongle answers slowly and drops parallel requests.
DEFAULT_SCAN_SECONDS = 30
MIN_SCAN_SECONDS = 20
DEFAULT_PORT = 8484
HTTPS_PORT = 443
REQUEST_GAP_SECONDS = 0.5
MAX_RESPONSE_BYTES = 256 * 1024
DEVICE_INVERTER = 2
DEVICE_METER = 3
DEVICE_BATTERY = 4
INVERTER_LIST_PATH = f"getdev.cgi?device={DEVICE_INVERTER}"
METER_DATA_PATH = f"getdevdata.cgi?device={DEVICE_METER}"
# community map: type codes of storage inverters
STORAGE_TYPES = frozenset(range(11, 21))
STORAGE_SERIAL_PREFIX = "BE"
# community map: bst 1 idle, 2 charging, 3 discharging, 4 fault
BATTERY_PRESENT = frozenset({1, 2, 3, 4})
MAX_INVERTERS = 8
MAX_MPPT = 10
MAX_MPPT_W = 30_000
MAX_POWER_W = 100_000
MAX_BATTERY_W = 50_000
MAX_PV_V = 1_000.0
MAX_PV_A = 40.0
MAX_ENERGY_TODAY = 10_000.0
MAX_ENERGY_TOTAL = 10_000_000.0


def scheme(port: int) -> str:
    """Return ``https`` for port 443, otherwise ``http``. @zara"""
    return "https" if port == HTTPS_PORT else "http"


def base_url(host: str, port: int) -> str:
    """Return the base URL for a host the user entered. @zara"""
    address = str(host or "").strip()
    for prefix in ("http://", "https://"):
        if address.lower().startswith(prefix):
            address = address[len(prefix) :]
    address = address.split("/", 1)[0]
    if ":" in address and not address.startswith("["):
        address = address.rsplit(":", 1)[0]
    return f"{scheme(port)}://{address}:{port}"


def data_path(device: int, serial: str) -> str:
    """Return the live-data request of one device. @zara"""
    return f"getdevdata.cgi?device={device}&sn={quote(serial, safe='')}"


def _number(value: Any) -> float | None:
    """Return a finite number from an int, float or numeric string, never a bool. @zara"""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value.strip())
        except ValueError:
            return None
    else:
        return None
    return number if math.isfinite(number) else None


def _field(data: Any, key: str) -> float | None:
    if not isinstance(data, dict):
        return None
    return _number(data.get(key))


def _list(data: Any, key: str) -> list[float | None]:
    if not isinstance(data, dict):
        return []
    values = data.get(key)
    if not isinstance(values, list):
        return []
    return [_number(value) for value in values]


def _between(value: float | None, low: float, high: float) -> float | None:
    if value is None or value < low or value > high:
        return None
    return value


def _scaled(raw: float | None, gain: float, low: float, high: float) -> float | None:
    if raw is None:
        return None
    return _between(raw * gain, low, high)


def _set(
    device: SolplanetDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _text(value: Any, *, alnum: bool) -> str:
    if not isinstance(value, str):
        return ""
    if alnum:
        return "".join(c for c in value if c.isascii() and c.isalnum())
    return "".join(
        c for c in value if c.isascii() and (c.isalnum() or c in ".-_ ")
    ).strip()


def inverters(info: Any) -> list[dict[str, Any]]:
    """Return the usable inverter items of ``getdev.cgi?device=2``. @zara"""
    if not isinstance(info, dict):
        return []
    items = info.get("inv")
    if not isinstance(items, list):
        return []
    found: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in items[:MAX_INVERTERS]:
        if not isinstance(item, dict):
            continue
        serial = _text(item.get("isn"), alnum=True)
        if not serial or serial in seen:
            continue
        seen.add(serial)
        found.append({**item, "isn": serial})
    return found


def is_storage(item: dict[str, Any]) -> bool:
    """Return True for a storage (hybrid) inverter. @zara"""
    kind = _number(item.get("mty"))
    if kind is not None and int(kind) in STORAGE_TYPES:
        return True
    return str(item.get("isn") or "").upper().startswith(STORAGE_SERIAL_PREFIX)


def primary_serial(info: Any) -> str | None:
    """Return the serial that carries the meter: first storage inverter, else first. @zara"""
    items = inverters(info)
    if not items:
        return None
    for item in items:
        if is_storage(item):
            return item["isn"]
    return items[0]["isn"]


def _identity_of(item: dict[str, Any]) -> dict[str, str]:
    model = _text(item.get("model"), alnum=False)
    name = f"{NAME} {model}" if model else NAME
    return {"serial": item["isn"], "name": name, "model": name}


def identity(info: Any) -> dict[str, str] | None:
    """Return serial, name and model of the primary inverter, or None. @zara"""
    serial = primary_serial(info)
    if serial is None:
        return None
    for item in inverters(info):
        if item["isn"] == serial:
            return _identity_of(item)
    return None


def reject_reason(info: Any) -> str:
    """Why the inverter list gave no device, or an empty string. @zara"""
    if not isinstance(info, dict):
        return "Solplanet dongle did not answer with a JSON object"
    if not inverters(info):
        return "Solplanet dongle listed no inverter serial number"
    return ""


def meter_present(data: Any) -> bool:
    """Return True for a timestamp or a non-zero value, False for a zero stub. @zara"""
    if not isinstance(data, dict):
        return False
    stamp = data.get("tim")
    if isinstance(stamp, str) and stamp.strip():
        return True
    return any(
        (value := _field(data, key)) is not None and value != 0
        for key in ("pac", "itd", "otd", "iet", "oet")
    )


def _channels(device: SolplanetDevice, data: dict[str, Any]) -> None:
    # community map: vpv 0.1 V, ipv 0.01 A per MPPT
    voltages = _list(data, "vpv")[:MAX_MPPT]
    currents = _list(data, "ipv")[:MAX_MPPT]
    solar = 0.0
    solar_seen = False
    for index in range(1, max(len(voltages), len(currents)) + 1):
        voltage = _scaled(
            voltages[index - 1] if index <= len(voltages) else None, 0.1, 0, MAX_PV_V
        )
        current = _scaled(
            currents[index - 1] if index <= len(currents) else None, 0.01, 0, MAX_PV_A
        )
        # Inputs 3 and above stay hidden while dark, as on Modbus.
        if index > 2 and not voltage and not current:
            continue
        if voltage is None and current is None:
            continue
        power = None
        if voltage is not None and current is not None:
            power = _between(voltage * current, 0, MAX_MPPT_W)
        role = indexed_role("power_solar_mppt", index)
        _set(device, role, power, 0)
        _set(device, indexed_role("voltage_solar_mppt", index), voltage)
        _set(device, indexed_role("current_solar_mppt", index), current)
        if power is not None:
            device.derived.add(role)
            solar += power
            solar_seen = True
    if solar_seen:
        _set(device, "power_solar", _between(solar, 0, MAX_POWER_W), 0)
        device.derived.add("power_solar")


def _inverter(item: dict[str, Any], data: dict[str, Any]) -> SolplanetDevice:
    ident = _identity_of(item)
    device = SolplanetDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer="AISWEI",
        model=ident["model"],
    )
    firmware = _text(item.get("msw"), alnum=False)
    if firmware:
        device.vendor["firmware"] = firmware
    _channels(device, data)
    # community map: tmp 0.1 °C, fac 0.01 Hz, vac 0.1 V per phase
    _set(
        device,
        "temperature_inverter",
        _scaled(_field(data, "tmp"), 0.1, -25, 120),
    )
    _set(device, "frequency_grid", _scaled(_field(data, "fac"), 0.01, 45, 65), 2)
    phases = _list(data, "vac")
    if phases:
        _set(device, "voltage_grid", _scaled(phases[0], 0.1, 180, 280))
    for key, index in (("voltage_grid_l2", 1), ("voltage_grid_l3", 2)):
        if index < len(phases):
            voltage = _scaled(phases[index], 0.1, 180, 280)
            if voltage is not None:
                device.vendor[key] = round(voltage, 1)
    # community map: pac W, the inverter AC measurement; not used as power_grid
    _set(
        device,
        "power_inverter_ac_output",
        _scaled(_field(data, "pac"), 1.0, -MAX_POWER_W, MAX_POWER_W),
        0,
    )
    # community map: etd and eto 0.1 kWh, the inverter counter (can include the battery)
    today = _scaled(_field(data, "etd"), 0.1, 0, MAX_ENERGY_TODAY)
    total = _scaled(_field(data, "eto"), 0.1, 0, MAX_ENERGY_TOTAL)
    if today is not None:
        device.vendor["inverter_energy_today"] = round(today, 1)
    if total is not None:
        device.vendor["inverter_energy_total"] = round(total, 1)
    return device


def _meter(device: SolplanetDevice, data: Any) -> None:
    if not meter_present(data):
        return
    # community map: pac W, positive = import
    grid = _scaled(_field(data, "pac"), 1.0, -MAX_POWER_W, MAX_POWER_W)
    if grid is not None:
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0.0, grid), 0)
        _set(device, "power_grid_export", max(0.0, -grid), 0)
    # community map: itd/otd 0.01 kWh, iet/oet 0.1 kWh
    for role, key, gain, high in (
        ("energy_grid_import_today", "itd", 0.01, MAX_ENERGY_TODAY),
        ("energy_grid_export_today", "otd", 0.01, MAX_ENERGY_TODAY),
        ("energy_grid_import_total", "iet", 0.1, MAX_ENERGY_TOTAL),
        ("energy_grid_export_total", "oet", 0.1, MAX_ENERGY_TOTAL),
    ):
        _set(device, role, _scaled(_field(data, key), gain, 0, high), 2)


def _battery(device: SolplanetDevice, data: Any) -> None:
    if not isinstance(data, dict):
        return
    # community map: ppv W and etdpv/etopv 0.1 kWh are PV values of the hybrid
    solar = _scaled(_field(data, "ppv"), 1.0, 0, MAX_POWER_W)
    if solar is not None:
        _set(device, "power_solar", solar, 0)
        device.derived.discard("power_solar")
    _set(
        device,
        "energy_solar_today",
        _scaled(_field(data, "etdpv"), 0.1, 0, MAX_ENERGY_TODAY),
    )
    _set(
        device,
        "energy_solar_total",
        _scaled(_field(data, "etopv"), 0.1, 0, MAX_ENERGY_TOTAL),
    )
    status = _field(data, "bst")
    if status is None or int(status) not in BATTERY_PRESENT:
        return
    # community map: pb W, positive = discharging
    output = _scaled(_field(data, "pb"), 1.0, -MAX_BATTERY_W, MAX_BATTERY_W)
    if output is not None:
        battery = -output
        _set(device, "power_battery", battery, 0)
        _set(device, "power_battery_charge", max(0.0, battery), 0)
        _set(device, "power_battery_discharge", max(0.0, -battery), 0)
    # community map: vb 0.01 V, tb 0.1 °C, soc and soh 1 %
    volts = _scaled(_field(data, "vb"), 0.01, 20, 900)
    if volts is not None:
        device.vendor["battery_voltage"] = round(volts, 2)
    _set(
        device,
        "temperature_battery",
        _scaled(_field(data, "tb"), 0.1, -20, 70),
    )
    _set(device, "battery_soc", _scaled(_field(data, "soc"), 1.0, 0, 100), 0)
    soh = _scaled(_field(data, "soh"), 1.0, 0, 100)
    if soh is not None and soh > 0:
        _set(device, "battery_soh", soh, 0)


def _build(responses: dict[str, Any]) -> dict[str, SolplanetDevice]:
    info = responses.get("info")
    live = responses.get("inverters")
    batteries = responses.get("batteries")
    if not isinstance(live, dict):
        return {}
    if not isinstance(batteries, dict):
        batteries = {}
    primary = primary_serial(info)
    devices: dict[str, SolplanetDevice] = {}
    for item in inverters(info):
        data = live.get(item["isn"])
        if not isinstance(data, dict):
            continue
        device = _inverter(item, data)
        if is_storage(item):
            _battery(device, batteries.get(item["isn"]))
        if item["isn"] == primary:
            _meter(device, responses.get("meter"))
        devices[device.serial] = device
    return devices


def build_devices(responses: dict[str, Any]) -> dict[str, SolplanetDevice]:
    """Parse the dongle answers into one device per inverter. Never raises. @zara

    ``responses``: ``info`` (inverter list), ``inverters`` (serial -> live data),
    ``meter`` (meter live data or None), ``batteries`` (serial -> battery data).
    """
    try:
        return _build(responses if isinstance(responses, dict) else {})
    except Exception:
        return {}
