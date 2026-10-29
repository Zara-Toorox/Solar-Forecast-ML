# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Solakon ONE adapter for the S-INV contract (Modbus TCP, read only). @zara

Register map: Solakon ONE Modbus Protokoll v.02/26. Modbus TCP is on by default as
soon as the device is in the network (LAN before WLAN), port 502, unit 1. All
values are holding registers (function 0x03) at the documented address; 32-bit
values are high word first. "Faktor" is the divisor of the raw value.

Documented signs used directly:
- [Meter collection] active power 39168: positive = feeding the grid ->
  contract ``power_grid`` (positive import) = -39168
Battery power: Battery 1 power 39230 (I32 W) has no documented sign. An
MQ2200-M-H on 2026-10-15 reported it negative while charging; a WF2000M on
2026-10-24 reported it positive while charging. Solakon's own integration
publishes the register unchanged. S-INV does not assume a model sign. It learns,
per serial, whether a positive raw value is charging or discharging by watching
which of the 0.01 kWh counters 39605 and 39609 rises while |39230| is at least
20 W. Until two such periods agree, the three battery power roles stay
unpublished. The "[Energy storage module 1]" register 39162 is not the battery
of the Solakon ONE.
BMS1 counts as present when 37002 reports online or when it reports a design
energy and a state of health; MQ2200 firmware leaves 37002 unset.
Grid roles need a meter or CT connected to the Solakon ONE (38801 = 1). The house
consumption is derived: inverter active power minus the meter's feed-in. The
energy counters 39621/39625 ("output"/"enter") are the device's own AC output and
input, not the grid point, and stay vendor values.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import struct
from typing import Any

from ..contract import indexed_role

VENDOR = "solakon"
NAME = "Solakon"
CONNECTION_LOCAL = "local_modbus_solakon"
DEFAULT_SCAN_SECONDS = 10
MIN_SCAN_SECONDS = 5
DEFAULT_PORT = 502
DEFAULT_UNIT_ID = 1
REQUEST_GAP_SECONDS = 0.1
IDENTITY_BLOCKS: tuple[tuple[int, int], ...] = ((30000, 32), (39050, 3))
INPUT_BLOCKS: tuple[tuple[int, int], ...] = (
    (39118, 24),  # PV total, grid voltage, inverter power, frequency, temperature
    (39149, 21),  # yield, battery power, meter power
    (39225, 14),  # load power, battery 1/2 voltage, current and power
    (39601, 28),  # energy counters
    (37002, 1),  # BMS1 online
    (37609, 27),  # BMS1 values
    (38801, 1),  # meter 1 / CT 1 connected
)
OPTIONAL_BLOCKS: tuple[tuple[int, int], ...] = (
    (37700, 1),  # BMS2 online
    (38307, 27),  # BMS2 values
    (39424, 1),  # battery SoC of the device
)
# the four PV inputs: voltage/current interleaved from 39070, power (I32) from 39279;
# the MPPT count register 39052 reports fewer trackers than there are inputs
PV_INPUTS = 4
PV_BLOCKS: tuple[tuple[int, int], ...] = (
    (39070, 2 * PV_INPUTS),
    (39279, 2 * PV_INPUTS),
)
ONLINE = 1


@dataclass(frozen=True)
class VendorSpec:
    """Display and unit definition of a value without a contract role. @zara"""

    unit: str | None
    device_class: str | None
    state_class: str | None
    name_en: str
    name_de: str


VENDOR_SPECS: dict[str, VendorSpec] = {
    "load_power": VendorSpec(
        "W", "power", "measurement", "Load power (device)", "Lastleistung (Gerät)"
    ),
    "ac_output_energy_total": VendorSpec(
        "kWh", "energy", "total_increasing", "AC output total", "AC-Ausgabe gesamt"
    ),
    "ac_input_energy_total": VendorSpec(
        "kWh", "energy", "total_increasing", "AC input total", "AC-Aufnahme gesamt"
    ),
}


@dataclass
class SolakonDevice:
    """One Solakon ONE with its battery. @zara"""

    serial: str
    kind: str
    name: str
    manufacturer: str
    model: str
    roles: dict[str, Any] = field(default_factory=dict)
    vendor: dict[str, Any] = field(default_factory=dict)
    derived: set[str] = field(default_factory=set)
    battery_raw: int | None = None
    battery_sign: str = "undetermined"
    battery_sign_observations: int = 0
    battery_sign_conflicts: int = 0


def u16(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 16-bit register. @zara"""
    return regs.get(address)


def s16(regs: dict[int, int], address: int) -> int | None:
    """Signed 16-bit register. @zara"""
    value = regs.get(address)
    return None if value is None else struct.unpack(">h", struct.pack(">H", value))[0]


def u32(regs: dict[int, int], address: int) -> int | None:
    """Unsigned 32-bit value, high word first. @zara"""
    high, low = regs.get(address), regs.get(address + 1)
    if high is None or low is None:
        return None
    return (high << 16) | low


def s32(regs: dict[int, int], address: int) -> int | None:
    """Signed 32-bit value, high word first. @zara"""
    value = u32(regs, address)
    return None if value is None else struct.unpack(">i", struct.pack(">I", value))[0]


def text(regs: dict[int, int], address: int, count: int) -> str:
    """ASCII string, two characters per register, zero padded. @zara"""
    data = b"".join(
        struct.pack(">H", regs[address + offset])
        for offset in range(count)
        if address + offset in regs
    )
    return data.split(b"\x00", 1)[0].decode("ascii", "ignore").strip()


def identity(regs: dict[int, int]) -> dict[str, str] | None:
    """Return serial and model from the identity registers, or None. @zara"""
    # the serial ends up in unique ids and logs: keep plain ASCII letters and digits
    serial = "".join(c for c in text(regs, 30016, 16) if c.isascii() and c.isalnum())
    if not serial:
        return None
    model = "".join(c for c in text(regs, 30000, 16) if c.isprintable())
    model = (
        model if model.upper().startswith(NAME.upper()) else f"{NAME} {model or 'ONE'}"
    )
    return {"serial": serial, "name": model, "model": model}


def _set(
    device: SolakonDevice, role: str, value: float | None, digits: int = 1
) -> None:
    if value is not None:
        device.roles[role] = round(value, digits)


def _scaled(value: int | None, divisor: float) -> float | None:
    return None if value is None else value / divisor


def _battery(
    regs: dict[int, int], base: int
) -> tuple[float | None, int | None, int | None]:
    """(capacity kWh or None, SoC %, SoH %) of one online BMS. @zara"""
    design = u16(regs, base + 26)  # Wh, factor 0.1
    soh = u16(regs, base + 15)
    return (
        design * 10 / 1000 if design else None,
        u16(regs, base + 3),
        soh if soh and 0 < soh <= 100 else None,
    )


def _bms_present(regs: dict[int, int], online: int, base: int) -> bool:
    """BMS online flag, or a design energy with a valid state of health. @zara"""
    if u16(regs, online) == ONLINE:
        return True
    soh = u16(regs, base + 15)
    return bool(u16(regs, base + 26)) and soh is not None and 0 < soh <= 100


def build_devices(regs: dict[int, int]) -> dict[str, SolakonDevice]:
    """Parse identity and running registers into the Solakon ONE device. @zara"""
    ident = identity(regs)
    if ident is None:
        return {}
    device = SolakonDevice(
        serial=ident["serial"],
        kind="inverter",
        name=ident["name"],
        manufacturer=NAME,
        model=ident["model"],
    )
    for index in range(1, PV_INPUTS + 1):
        offset = 2 * (index - 1)
        _set(
            device,
            indexed_role("voltage_solar_mppt", index),
            _scaled(s16(regs, 39070 + offset), 10),
        )
        _set(
            device,
            indexed_role("current_solar_mppt", index),
            _scaled(s16(regs, 39071 + offset), 100),
            2,
        )
        _set(
            device,
            indexed_role("power_solar_mppt", index),
            s32(regs, 39279 + offset),
            0,
        )
    _set(device, "power_solar", s32(regs, 39118), 0)  # kW x1000 = W
    active = s32(regs, 39134)
    _set(device, "power_inverter_ac_output", active, 0)
    _set(device, "voltage_grid", _scaled(s16(regs, 39123), 10))
    _set(device, "frequency_grid", _scaled(s16(regs, 39139), 100), 2)
    _set(device, "temperature_inverter", _scaled(s16(regs, 39141), 10))
    _set(device, "energy_solar_total", _scaled(u32(regs, 39601), 100), 2)
    _set(device, "energy_solar_today", _scaled(u32(regs, 39603), 100), 2)

    meter = s32(regs, 39168)
    if meter is not None and u16(regs, 38801) == ONLINE:
        grid = -meter
        _set(device, "power_grid", grid, 0)
        _set(device, "power_grid_import", max(0, grid), 0)
        _set(device, "power_grid_export", max(0, -grid), 0)
        _set(device, "energy_grid_export_total", _scaled(u32(regs, 39613), 100), 2)
        _set(device, "energy_grid_import_total", _scaled(u32(regs, 39617), 100), 2)
        if active is not None:
            _set(device, "power_house", active - meter, 0)
            device.derived.add("power_house")

    packs = [
        _battery(regs, base)
        for online, base in ((37002, 37609), (37700, 38307))
        if _bms_present(regs, online, base)
    ]
    # battery SoC register of the device itself (not in the PDF, used by Solakon's
    # own integration); covers firmware whose BMS registers stay empty
    device_soc = u16(regs, 39424)
    if packs or (device_soc is not None and 0 < device_soc <= 100):
        capacities = [pack[0] for pack in packs]
        socs = [pack[1] for pack in packs]
        if packs and all(capacities) and all(soc is not None for soc in socs):
            capacity = sum(capacities)
            _set(device, "capacity_battery", capacity, 2)
            soc = sum(c * s for c, s in zip(capacities, socs, strict=True)) / capacity
        elif packs and socs[0] is not None:
            soc = socs[0]
        else:
            soc = device_soc
        _set(device, "battery_soc", soc, 1)
        health = [pack[2] for pack in packs]
        if health and all(health):
            _set(device, "battery_soh", min(health), 0)
        if _bms_present(regs, 37002, 37609):
            # highest cell temperature of BMS1
            _set(device, "temperature_battery", _scaled(s16(regs, 37617), 10))
        device.battery_raw = s32(regs, 39230)
        _set(device, "energy_battery_charge_total", _scaled(u32(regs, 39605), 100), 2)
        _set(
            device,
            "energy_battery_discharge_total",
            _scaled(u32(regs, 39609), 100),
            2,
        )

    load = s32(regs, 39225)
    if load is not None:
        device.vendor["load_power"] = load
    for key, address in (
        ("ac_output_energy_total", 39621),
        ("ac_input_energy_total", 39625),
    ):
        value = _scaled(u32(regs, address), 100)
        if value is not None:
            device.vendor[key] = round(value, 2)
    return {device.serial: device}


# |39230| below this is not used as a sign sample: the watts are then comparable
# to a quiet register. 20 W needs half an hour to move a 0.01 kWh counter.
BATTERY_SIGN_W = 20
# 39605 and 39609 are published in 0.01 kWh steps.
COUNTER_STEP_KWH = 0.01
# One counter step can be a torn read. Two steps in the same direction reject
# that. A third would hide battery power for over an hour at 20 W.
SIGN_CONFIRMATIONS = 2
# One contrary step is the same kind of glitch and must not flip a decision
# that already took two steps. Two contrary steps are the same evidence, and
# only then does the direction change.
SIGN_REVISIONS = 2
_MIXED = 2
_POWER_ROLES = (
    "power_battery",
    "power_battery_charge",
    "power_battery_discharge",
)


def _raw_sign(raw: int | None) -> int:
    if raw is None or abs(raw) < BATTERY_SIGN_W:
        return 0
    return 1 if raw > 0 else -1


def _note_raw(state: BatteryWindow, raw: int | None) -> None:
    sign = _raw_sign(raw)
    if sign == 0:
        return
    if state.window_sign == 0:
        state.window_sign = sign
    elif state.window_sign != sign:
        state.window_sign = _MIXED


@dataclass
class BatteryWindow:
    """Open counter window and the learned sign of one Solakon serial. @zara"""

    charge_sign: int | None = None
    candidate: int | None = None
    agrees: int = 0
    conflicts: int = 0
    window_charge: float | None = None
    window_discharge: float | None = None
    window_sign: int = 0

    def snapshot(self) -> dict[str, Any]:
        """JSON-ready sign and the still-open counter window. @zara"""
        return {
            "charge_sign": self.charge_sign,
            "candidate": self.candidate,
            "agrees": self.agrees,
            "conflicts": self.conflicts,
            "window_charge": self.window_charge,
            "window_discharge": self.window_discharge,
            "window_sign": self.window_sign,
        }

    @classmethod
    def from_item(cls, raw: Any) -> BatteryWindow:
        """Restore one serial, or an empty window when the item is unusable. @zara"""
        if not isinstance(raw, dict):
            return cls()
        window = cls()
        for name in ("charge_sign", "candidate"):
            value = raw.get(name)
            if value in (1, -1):
                setattr(window, name, value)
        for name in ("agrees", "conflicts", "window_sign"):
            value = raw.get(name)
            if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                setattr(window, name, value)
        for name in ("window_charge", "window_discharge"):
            value = raw.get(name)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                setattr(window, name, float(value))
        return window


class BatterySigns:
    """Learned 39230 sign of every Solakon serial in one config entry. @zara"""

    def __init__(self) -> None:
        """Start with no device. @zara"""
        self._devices: dict[str, BatteryWindow] = {}

    def get(self, serial: str) -> BatteryWindow:
        """Return the window of one serial, creating it when needed. @zara"""
        return self._devices.setdefault(serial, BatteryWindow())

    def snapshot(self) -> dict[str, Any]:
        """JSON-ready signs. @zara"""
        return {
            "devices": {
                serial: window.snapshot() for serial, window in self._devices.items()
            }
        }

    @classmethod
    def from_snapshot(cls, raw: Any) -> BatterySigns:
        """Restore a snapshot written by ``snapshot``. @zara"""
        book = cls()
        if not isinstance(raw, dict):
            return book
        devices = raw.get("devices")
        if not isinstance(devices, dict):
            return book
        for serial, item in devices.items():
            if isinstance(serial, str) and serial:
                book._devices[serial] = BatteryWindow.from_item(item)
        return book

    def observe(
        self,
        serial: str,
        raw: int | None,
        charge: float | None,
        discharge: float | None,
    ) -> str | None:
        """Fold one poll into the open window. Return determined or redetermined. @zara

        A counter step closes the period since the previous step. The raw sign
        of that whole period, not of the closing poll alone, is the observation.
        """
        if not isinstance(charge, (int, float)) or isinstance(charge, bool):
            return None
        if not isinstance(discharge, (int, float)) or isinstance(discharge, bool):
            return None
        state = self.get(serial)
        if state.window_charge is None or state.window_discharge is None:
            state.window_charge = float(charge)
            state.window_discharge = float(discharge)
            state.window_sign = _raw_sign(raw)
            return None
        _note_raw(state, raw)
        d_charge = float(charge) - state.window_charge
        d_discharge = float(discharge) - state.window_discharge
        if d_charge < -COUNTER_STEP_KWH / 2 or d_discharge < -COUNTER_STEP_KWH / 2:
            state.window_charge = float(charge)
            state.window_discharge = float(discharge)
            state.window_sign = _raw_sign(raw)
            return None
        charge_up = d_charge >= COUNTER_STEP_KWH / 2
        discharge_up = d_discharge >= COUNTER_STEP_KWH / 2
        if not charge_up and not discharge_up:
            return None
        observation = None
        if state.window_sign in (1, -1):
            if charge_up and not discharge_up:
                observation = state.window_sign
            elif discharge_up and not charge_up:
                observation = -state.window_sign
        state.window_charge = float(charge)
        state.window_discharge = float(discharge)
        state.window_sign = _raw_sign(raw)
        if observation is None:
            return None
        return _absorb(state, observation)


def _absorb(state: BatteryWindow, observation: int) -> str | None:
    if state.charge_sign is None:
        if state.candidate in (None, observation):
            state.candidate = observation
            state.agrees += 1
            state.conflicts = 0
        else:
            state.conflicts += 1
            if state.conflicts < SIGN_REVISIONS:
                return None
            state.candidate = observation
            state.agrees = state.conflicts
            state.conflicts = 0
        if state.agrees >= SIGN_CONFIRMATIONS:
            state.charge_sign = state.candidate
            return "determined"
        return None
    if observation == state.charge_sign:
        state.conflicts = 0
        state.agrees += 1
        return None
    state.conflicts += 1
    if state.conflicts < SIGN_REVISIONS:
        return None
    state.charge_sign = observation
    state.candidate = observation
    state.agrees = state.conflicts
    state.conflicts = 0
    return "redetermined"


def publish_battery_power(device: SolakonDevice, state: BatteryWindow) -> None:
    """Publish battery power only after the sign is known. @zara"""
    for role in _POWER_ROLES:
        device.roles.pop(role, None)
    device.battery_sign_observations = state.agrees
    device.battery_sign_conflicts = state.conflicts
    raw = device.battery_raw
    if state.charge_sign not in (1, -1) or raw is None:
        device.battery_sign = "undetermined"
        return
    battery = raw * state.charge_sign
    _set(device, "power_battery", battery, 0)
    _set(device, "power_battery_charge", max(0, battery), 0)
    _set(device, "power_battery_discharge", max(0, -battery), 0)
    device.battery_sign = (
        "charging_when_raw_positive"
        if state.charge_sign == 1
        else "charging_when_raw_negative"
    )
