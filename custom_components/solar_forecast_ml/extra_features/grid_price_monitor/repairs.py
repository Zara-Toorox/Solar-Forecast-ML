"""Repair flows for Solar Forecast GPM."""

from __future__ import annotations

from homeassistant.components.repairs import ConfirmRepairFlow, RepairsFlow
from homeassistant.core import HomeAssistant


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict[str, str] | None,
) -> RepairsFlow:
    """License issues are hints only. Remaining issues use the confirm flow."""
    return ConfirmRepairFlow()
