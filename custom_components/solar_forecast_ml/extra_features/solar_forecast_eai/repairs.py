"""Repair flow for incomplete heat-pump hydraulics after migration."""

from __future__ import annotations

from typing import Any

from homeassistant import data_entry_flow
from homeassistant.components.repairs import ConfirmRepairFlow, RepairsFlow
from homeassistant.core import HomeAssistant

from .const import DOMAIN, ISSUE_HYDRAULICS_SETUP_INCOMPLETE


class HydraulicsIncompleteRepairFlow(RepairsFlow):
    """Explain why KPIs are locked and send the user to reconfigure."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        return await self.async_step_confirm()

    async def async_step_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        if user_input is not None:
            entry_id = (self.data or {}).get("entry_id")
            if entry_id:
                self.hass.async_create_task(
                    self.hass.config_entries.flow.async_init(
                        DOMAIN,
                        context={
                            "source": "reconfigure",
                            "entry_id": entry_id,
                            "show_advanced_options": True,
                        },
                        data={},
                    )
                )
            # Abort rather than create an entry: Home Assistant resolves a repair
            # issue on every flow result except ABORT. Opening the reconfigure
            # dialog is not an answer yet, and a user who abandons it would
            # otherwise be left with locked KPIs and no visible reason. The
            # reconfigure writes the entry, which reloads it and re-runs
            # _async_sync_hydraulics_repair — that is what clears the issue.
            return self.async_abort(reason="reconfigure_started")
        return self.async_show_form(step_id="confirm")


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str | int | float | None] | None,
) -> RepairsFlow:
    if issue_id.startswith(ISSUE_HYDRAULICS_SETUP_INCOMPLETE):
        return HydraulicsIncompleteRepairFlow()
    return ConfirmRepairFlow()
