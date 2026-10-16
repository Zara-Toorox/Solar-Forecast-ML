# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""SunSpec model 160 (multiple MPPT) parser for Fronius GEN24 over Modbus TCP. @zara

Source: Fronius GEN24/Tauro/Verto Modbus register maps 1.2.7-2. Addresses here are
wire addresses (documented register minus one). The model chain starts after the
"SunS" marker at 40000/40001: every model begins with its id and length, the next
model follows after id + length + 2 registers, 0xFFFF ends the chain. Model 160
is integer + scale factor in both the float and the int+SF variant.

Model 160 offsets from its id register: scale factors DCA 2, DCV 3, DCW 4, DCWH 5,
module count 8, module n from 10 + 20 * (n - 1): id +0, label +1..+8, DCA +9,
DCV +10, DCW +11, DCWH (acc32, Wh) +12/+13. On GEN24 with storage, modules 3 and 4
are the battery port ("StCha 3" charging, "StDisCha 4" discharging), not PV.
Up to firmware 1.30 the battery counters read 0 while the other direction is
active; since 1.31 both count continuously.
"""

from __future__ import annotations

from dataclasses import dataclass
import struct

SUNS_ADDRESS = 40000
SUNS_MARKER = (0x5375, 0x6E53)
CHAIN_START = 40002
CHAIN_END = 0xFFFF
MPPT_MODEL = 160
MAX_MODELS = 20
MAX_MODULES = 4
MODULE_STRIDE = 20
# plausible scale factors; anything else is treated as not implemented
SF_RANGE = range(-10, 11)
# plausibility limits for one GEN24: tracker power and lifetime energy
MAX_TRACKER_W = 100_000
MAX_ENERGY_KWH = 100_000_000


@dataclass(frozen=True)
class Module:
    """One input of model 160: PV tracker or battery port. @zara"""

    index: int
    label: str
    current: float | None
    voltage: float | None
    power: float | None
    energy_wh: float | None

    @property
    def is_pv(self) -> bool:
        """Return True for a PV tracker ("MPPT n"). @zara"""
        return self.label.upper().startswith("MPPT")


def is_sunspec(marker: list[int]) -> bool:
    """Return True when the two registers at 40000 read "SunS". @zara"""
    return tuple(marker[:2]) == SUNS_MARKER


def _sf(value: int) -> int | None:
    """Signed SunSpec scale factor; 0x8000 means not implemented. @zara"""
    if value == 0x8000:
        return None
    factor = struct.unpack(">h", struct.pack(">H", value))[0]
    return factor if factor in SF_RANGE else None


def _scaled(value: int, factor: int | None) -> float | None:
    if factor is None or value == 0xFFFF:
        return None
    return value * 10.0**factor


def _label(registers: list[int]) -> str:
    data = b"".join(struct.pack(">H", value) for value in registers)
    return "".join(
        c
        for c in data.split(b"\x00", 1)[0].decode("ascii", "ignore")
        if c.isprintable()
    ).strip()


def parse_mppt(block: list[int]) -> list[Module]:
    """Parse model 160 read from its id register (id, length, body). @zara"""
    if len(block) < 10 or block[0] != MPPT_MODEL:
        return []
    dca_sf, dcv_sf, dcw_sf, dcwh_sf = (_sf(block[i]) for i in range(2, 6))
    count = min(block[8], MAX_MODULES)
    modules: list[Module] = []
    for index in range(1, count + 1):
        base = 10 + MODULE_STRIDE * (index - 1)
        if base + 14 > len(block):
            break
        energy_raw = (block[base + 12] << 16) | block[base + 13]
        modules.append(
            Module(
                index=index,
                label=_label(block[base + 1 : base + 9]),
                current=_scaled(block[base + 9], dca_sf),
                voltage=_scaled(block[base + 10], dcv_sf),
                power=_bounded(_scaled(block[base + 11], dcw_sf), MAX_TRACKER_W),
                # acc32: 0 means not accumulated (Datamanager, old firmware)
                energy_wh=energy_raw * 10.0**dcwh_sf
                if energy_raw and dcwh_sf is not None
                else None,
            )
        )
    return modules


def _bounded(value: float | None, limit: float) -> float | None:
    return value if value is not None and 0 <= value <= limit else None


def pv_energy_kwh(modules: list[Module]) -> float | None:
    """Lifetime PV energy of all trackers, or None unless every tracker counts. @zara"""
    pv = [module for module in modules if module.is_pv]
    if not pv or any(module.energy_wh is None for module in pv):
        return None
    return _bounded(
        sum(module.energy_wh or 0.0 for module in pv) / 1000, MAX_ENERGY_KWH
    )


def battery_energy_kwh(modules: list[Module]) -> tuple[float, float] | None:
    """(charged, discharged) kWh of the battery port, or None. @zara

    Both counters must be running; firmware up to 1.30 zeroes the inactive one.
    """
    charge = next((m for m in modules if m.label.upper().startswith("STCHA")), None)
    discharge = next(
        (m for m in modules if m.label.upper().startswith("STDISCHA")), None
    )
    if charge is None or discharge is None:
        return None
    if not charge.energy_wh or not discharge.energy_wh:
        return None
    charged = _bounded(charge.energy_wh / 1000, MAX_ENERGY_KWH)
    discharged = _bounded(discharge.energy_wh / 1000, MAX_ENERGY_KWH)
    if charged is None or discharged is None:
        return None
    return charged, discharged
