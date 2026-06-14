# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# ******************************************************************************

"""
Hubble — The human-to-code communication interface for Solar Forecast ML.
Handles user-friendly logging, persistent notifications, and native HA Repairs.

@zara
"""

import logging
from typing import Any, Dict, Optional
from homeassistant.core import HomeAssistant
from homeassistant.helpers.issue_registry import IssueSeverity as Severity, async_create_issue, async_delete_issue

_LOGGER = logging.getLogger("solar_forecast_ml.hubble")


class Hubble:
    """Hubble communication interface. @zara"""

    @staticmethod
    def info(message: str) -> None:
        """Log an informational message from Hubble. @zara"""
        _LOGGER.info("[Hubble] Info: %s", message)

    @staticmethod
    def warning(message: str) -> None:
        """Log a warning message from Hubble. @zara"""
        _LOGGER.warning("[Hubble] Warnung: %s", message)

    @staticmethod
    def error(message: str) -> None:
        """Log an error message from Hubble. @zara"""
        _LOGGER.error("[Hubble] Fehler: %s", message)

    @staticmethod
    def async_create_issue(
        hass: HomeAssistant,
        issue_id: str,
        title: str,
        description: str,
        severity: Severity = Severity.WARNING,
    ) -> None:
        """Create or update a native HA Repairs issue via Hubble. @zara"""
        try:
            async_create_issue(
                hass,
                domain="solar_forecast_ml",
                issue_id=issue_id,
                is_fixable=False,
                severity=severity,
                translation_key="hubble_issue",
                translation_placeholders={
                    "title": title,
                    "description": description,
                },
            )
            _LOGGER.debug("[Hubble] Created repairs issue '%s': %s", issue_id, title)
        except Exception as e:
            _LOGGER.debug("Failed to create repairs issue: %s", e)

    @staticmethod
    def async_dismiss_issue(hass: HomeAssistant, issue_id: str) -> None:
        """Remove a Repairs issue since the problem is resolved. @zara"""
        try:
            async_delete_issue(hass, domain="solar_forecast_ml", issue_id=issue_id)
            _LOGGER.debug("[Hubble] Dismissed repairs issue '%s'", issue_id)
        except Exception as e:
            _LOGGER.debug("Failed to dismiss repairs issue: %s", e)
