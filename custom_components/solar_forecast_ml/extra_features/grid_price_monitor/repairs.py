"""Repair flows for Solar Forecast GPM."""

from __future__ import annotations

from typing import Any

from homeassistant.components.repairs import ConfirmRepairFlow, RepairsFlow
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResult


class LicenseRecommendedRepairFlow(RepairsFlow):
    """Start reauth so a grandfathered entry can add a license key."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            entry_id = (self.data or {}).get("entry_id")
            if entry_id:
                entry = self.hass.config_entries.async_get_entry(entry_id)
                if entry is not None:
                    entry.async_start_reauth(self.hass)
            return self.async_create_entry(data={})
        return self.async_show_form(step_id="confirm")


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str] | None,
) -> RepairsFlow:
    if issue_id.startswith("license_recommended"):
        return LicenseRecommendedRepairFlow()
    return ConfirmRepairFlow()
