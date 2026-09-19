# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# ******************************************************************************
"""Repair flows for STATS tariff centralization."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components.repairs import ConfirmRepairFlow, RepairsFlow
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import issue_registry as ir

from .const import CONF_LEGACY_FIXED_PRICE_CT, DOMAIN
from .core.price_mode import ISSUE_PRICE_CONFIG_MOVED, gpm_snapshot


class PriceConfigMovedToGpmRepairFlow(RepairsFlow):
    """Move leftover STATS fixed-price config to GPM."""

    def _entry_and_price(self) -> tuple[Any, str]:
        entries = self.hass.config_entries.async_entries(DOMAIN)
        entry = entries[0] if entries else None
        price = ""
        if entry is not None:
            merged = {**entry.data, **entry.options}
            raw = merged.get(CONF_LEGACY_FIXED_PRICE_CT)
            if raw not in (None, ""):
                try:
                    price = f"{float(raw):.2f}"
                except (TypeError, ValueError):
                    price = str(raw)
        return entry, price

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        return await self.async_step_menu()

    async def async_step_menu(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        _entry, price = self._entry_and_price()
        return self.async_show_menu(
            step_id="menu",
            menu_options=["use_gpm_fixed", "use_gpm_dynamic"],
            description_placeholders={"legacy_price": price or "—"},
        )

    async def async_step_use_gpm_fixed(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        _entry, price = self._entry_and_price()
        snapshot = gpm_snapshot(self.hass) or {}
        if user_input is not None:
            if snapshot.get("tariff_mode") == "fixed":
                ir.async_delete_issue(self.hass, DOMAIN, ISSUE_PRICE_CONFIG_MOVED)
                return self.async_create_entry(data={})
            return self.async_show_form(
                step_id="use_gpm_fixed",
                data_schema=vol.Schema({}),
                errors={"base": "gpm_not_fixed"},
                description_placeholders={"legacy_price": price or "—"},
            )
        return self.async_show_form(
            step_id="use_gpm_fixed",
            data_schema=vol.Schema({}),
            description_placeholders={"legacy_price": price or "—"},
        )

    async def async_step_use_gpm_dynamic(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        entry, price = self._entry_and_price()
        if user_input is not None:
            if entry is not None:
                new_data = {**entry.data}
                new_data.pop(CONF_LEGACY_FIXED_PRICE_CT, None)
                self.hass.config_entries.async_update_entry(entry, data=new_data)
            ir.async_delete_issue(self.hass, DOMAIN, ISSUE_PRICE_CONFIG_MOVED)
            return self.async_create_entry(data={})
        return self.async_show_form(
            step_id="use_gpm_dynamic",
            data_schema=vol.Schema({}),
            description_placeholders={"legacy_price": price or "—"},
        )


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str] | None,
) -> RepairsFlow:
    if issue_id == ISSUE_PRICE_CONFIG_MOVED:
        return PriceConfigMovedToGpmRepairFlow()
    return ConfirmRepairFlow()
