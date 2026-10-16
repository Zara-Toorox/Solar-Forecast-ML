# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""One-time hint which "S-INV Anlage" sensors belong into the energy dashboard. @zara

S-INV never writes the energy preferences itself: existing grid, solar or battery
entries would be counted twice. The hint lists only the installation sensors that
exist on this install, so the user picks them in the dashboard settings.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.storage import Store

from . import contract
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORE_KEY = f"{DOMAIN}.energy_hint"
NOTIFICATION_ID = f"{DOMAIN}_energy_dashboard"
# site entities appear after the first device updates
FIRST_CHECK_SECONDS = 120
# (row key, roles); a row is listed only when all of its roles exist
ROWS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("grid_import", ("energy_grid_import_total",)),
    ("grid_export", ("energy_grid_export_total",)),
    ("solar", ("energy_solar_total",)),
    ("battery_in", ("energy_battery_charge_total",)),
    ("battery_out", ("energy_battery_discharge_total",)),
    ("grid_power", ("power_grid",)),
    ("solar_power", ("power_solar",)),
    ("battery_power", ("power_battery_discharge", "power_battery_charge")),
    ("battery_soc", ("battery_soc",)),
)
# the hint is worth showing once one of these energy counters exists
ENERGY_ROWS = frozenset(
    {"grid_import", "grid_export", "solar", "battery_in", "battery_out"}
)
TEXTS: dict[str, dict[str, str]] = {
    "de": {
        "title": "S-INV im Energie-Dashboard eintragen",
        "intro": "Die Sensoren des Geräts „S-INV Anlage“ fassen alle Wechselrichter und Akkus zusammen. Trage sie unter Einstellungen → Dashboards → Energie selbst ein. Nimm dafür nur diese Anlagen-Sensoren, nicht zusätzlich die Zähler einzelner Geräte und keine anderen Sensoren für dieselbe Energie – sonst wird doppelt gezählt.",
        "head": "| Im Energie-Dashboard | Sensor |\n|---|---|",
        "grid_import": "Netz: Netzbezug",
        "grid_export": "Netz: Netzeinspeisung",
        "solar": "Solarproduktion",
        "battery_in": "Akku: Energie in den Akku",
        "battery_out": "Akku: Energie aus dem Akku",
        "grid_power": "Netz: Leistung (Standard, positiv = Bezug)",
        "solar_power": "Solar: Leistung",
        "battery_power": "Akku: Leistung (zwei Sensoren: Entladen, Laden)",
        "battery_soc": "Akku: Ladestand",
    },
    "en": {
        "title": "Add S-INV to the energy dashboard",
        "intro": 'The sensors of the device "S-INV Anlage" combine all inverters and batteries. Add them yourself under Settings → Dashboards → Energy. Use only these installation sensors, not also the counters of single devices or other sensors for the same energy – otherwise it is counted twice.',
        "head": "| In the energy dashboard | Sensor |\n|---|---|",
        "grid_import": "Grid: grid consumption",
        "grid_export": "Grid: return to grid",
        "solar": "Solar production",
        "battery_in": "Battery: energy going in",
        "battery_out": "Battery: energy coming out",
        "grid_power": "Grid: power (standard, positive = consumption)",
        "solar_power": "Solar: power",
        "battery_power": "Battery: power (two sensors: discharge, charge)",
        "battery_soc": "Battery: state of charge",
    },
    "fr": {
        "title": "Ajouter S-INV au tableau de bord énergie",
        "intro": "Les capteurs de l'appareil « S-INV Anlage » regroupent tous les onduleurs et batteries. Ajoutez-les vous-même sous Paramètres → Tableaux de bord → Énergie. Utilisez uniquement ces capteurs de l'installation, pas en plus les compteurs des appareils individuels ni d'autres capteurs pour la même énergie – sinon l'énergie est comptée deux fois.",
        "head": "| Dans le tableau de bord énergie | Capteur |\n|---|---|",
        "grid_import": "Réseau : consommation du réseau",
        "grid_export": "Réseau : injection dans le réseau",
        "solar": "Production solaire",
        "battery_in": "Batterie : énergie entrante",
        "battery_out": "Batterie : énergie sortante",
        "grid_power": "Réseau : puissance (standard, positive = consommation)",
        "solar_power": "Solaire : puissance",
        "battery_power": "Batterie : puissance (deux capteurs : décharge, charge)",
        "battery_soc": "Batterie : état de charge",
    },
}


def available_rows(hass: HomeAssistant) -> list[tuple[str, list[str]]]:
    """Return (row key, entity ids) for every row whose site sensors exist. @zara"""
    registry = er.async_get(hass)
    rows: list[tuple[str, list[str]]] = []
    for key, roles in ROWS:
        entity_ids = [
            registry.async_get_entity_id(
                "sensor", DOMAIN, contract.system_unique_id(role)
            )
            for role in roles
        ]
        if all(entity_ids):
            rows.append((key, [eid for eid in entity_ids if eid]))
    return rows


def message(language: str, rows: list[tuple[str, list[str]]]) -> tuple[str, str]:
    """Build title and Markdown body in the HA language (German, English, French). @zara"""
    texts = TEXTS.get(language.split("-")[0].lower(), TEXTS["en"])
    lines = [texts["intro"], "", texts["head"]]
    lines.extend(
        f"| {texts[key]} | {', '.join(f'`{eid}`' for eid in entity_ids)} |"
        for key, entity_ids in rows
    )
    return texts["title"], "\n".join(lines)


async def _configured_stats(hass: HomeAssistant) -> set[str]:
    """Statistic ids already used in the energy preferences, if readable. @zara"""
    if "energy" not in hass.config.components:
        return set()
    try:
        from homeassistant.components.energy.data import (  # noqa: PLC0415
            async_get_manager,
        )

        data: Any = (await async_get_manager(hass)).data
    except (ImportError, AttributeError):
        return set()
    if not isinstance(data, dict):
        return set()
    return {
        value
        for source in data.get("energy_sources", [])
        for key, value in source.items()
        if key.startswith("stat_") and isinstance(value, str)
    }


async def async_show_hint(hass: HomeAssistant, store: Store) -> bool:
    """Show the hint once; returns True when it is done (shown or not needed). @zara"""
    stored = await store.async_load()
    if isinstance(stored, dict) and stored.get("shown"):
        return True
    rows = available_rows(hass)
    if not any(key in ENERGY_ROWS for key, _ids in rows):
        return False  # no energy counters yet: retry at the next start
    used = await _configured_stats(hass)
    if not any(eid in used for _key, ids in rows for eid in ids):
        title, body = message(hass.config.language, rows)
        persistent_notification.async_create(hass, body, title, NOTIFICATION_ID)
    await store.async_save({"shown": True})
    return True


def async_setup_energy_hint(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Check once shortly after the installation entry has started. @zara"""
    store: Store = Store(hass, 1, STORE_KEY)

    async def check(_now: Any = None) -> None:
        try:
            await async_show_hint(hass, store)
        except Exception:  # the hint must never disturb the installation entry
            _LOGGER.debug("S-INV energy dashboard hint failed", exc_info=True)

    entry.async_on_unload(async_call_later(hass, FIRST_CHECK_SECONDS, check))
