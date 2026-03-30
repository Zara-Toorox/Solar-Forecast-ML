# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

import logging
from dataclasses import dataclass

from homeassistant.core import HomeAssistant

from .solar_forecast_reader import SolarForecastReader
from ..const import DEFAULT_MAX_SOC, DEFAULT_MIN_SOC

_LOGGER = logging.getLogger(__name__)


@dataclass
class SmartChargingState:
    """Current state of the smart charging logic @zara"""

    target_soc: float  # Calculated target SoC in %
    current_soc: float | None  # Current battery SoC in %, None if unavailable
    solar_forecast_kwh: float | None  # Relevant solar forecast in kWh
    solar_forecast_today_kwh: float | None  # Today's forecast
    solar_forecast_tomorrow_kwh: float | None  # Tomorrow's forecast
    is_active: bool  # Should grid charging be active?
    reason: str  # Human-readable reason for current state


class SmartChargingManager:
    """Manages smart charging decisions based on solar forecast and battery SoC @zara

    Calculates target SoC based on:
    - Solar forecast from SFML (how much sun is expected)
    - Battery capacity (configured by user)
    - Max/Min SoC limits (configured by user)
    - Current electricity price (cheap or not)

    The target SoC represents the maximum level to charge from grid.
    Above this level, solar energy should fill the rest.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        forecast_reader: SolarForecastReader,
        battery_capacity_kwh: float,
        soc_sensor_entity: str,
        max_soc: int = DEFAULT_MAX_SOC,
        min_soc: int = DEFAULT_MIN_SOC,
    ) -> None:
        """Initialize the smart charging manager @zara"""
        self._hass = hass
        self._forecast_reader = forecast_reader
        self._battery_capacity_kwh = battery_capacity_kwh
        self._soc_sensor_entity = soc_sensor_entity
        self._max_soc = max_soc
        self._min_soc = min_soc
        self._last_state: SmartChargingState | None = None

    @property
    def last_state(self) -> SmartChargingState | None:
        """Get the last computed state @zara"""
        return self._last_state

    def _get_current_soc(self) -> float | None:
        """Read current battery SoC from HA sensor @zara"""
        state = self._hass.states.get(self._soc_sensor_entity)
        if state is None or state.state in ("unknown", "unavailable"):
            return None
        try:
            soc = float(state.state)
            if 0 <= soc <= 100:
                return soc
            _LOGGER.warning("Battery SoC out of range (0-100): %.1f", soc)
            return None
        except (ValueError, TypeError):
            _LOGGER.warning("Invalid battery SoC value: %s", state.state)
            return None

    def _calculate_target_soc(self, solar_forecast_kwh: float | None) -> float:
        """Calculate the target SoC based on solar forecast @zara

        Formula:
            solar_percent = (forecast_kwh / battery_capacity_kwh) * 100
            target_soc = max_soc - solar_percent
            target_soc = clamp(target_soc, min_soc, max_soc)

        Returns:
            Target SoC as percentage (0-100)
        """
        if solar_forecast_kwh is None or solar_forecast_kwh <= 0:
            return float(self._max_soc)

        solar_percent = (solar_forecast_kwh / self._battery_capacity_kwh) * 100
        target_soc = self._max_soc - solar_percent

        # Clamp between min and max
        target_soc = max(self._min_soc, min(self._max_soc, target_soc))

        return round(target_soc, 1)

    async def async_update(self, is_cheap: bool) -> SmartChargingState:
        """Update smart charging state @zara

        Args:
            is_cheap: Whether current electricity price is below threshold

        Returns:
            Current SmartChargingState with charging recommendation
        """
        # Read solar forecast
        forecasts = await self._forecast_reader.async_get_forecasts()
        forecast_today = forecasts.get("today")
        forecast_tomorrow = forecasts.get("tomorrow")

        # Get relevant forecast for target calculation
        relevant_kwh = await self._forecast_reader.async_get_relevant_forecast_kwh()

        # Calculate target SoC
        target_soc = self._calculate_target_soc(relevant_kwh)

        # Read current SoC
        current_soc = self._get_current_soc()

        # Determine if grid charging should be active
        is_active, reason = self._evaluate_charging(
            is_cheap=is_cheap,
            current_soc=current_soc,
            target_soc=target_soc,
            solar_kwh=relevant_kwh,
        )

        state = SmartChargingState(
            target_soc=target_soc,
            current_soc=current_soc,
            solar_forecast_kwh=relevant_kwh,
            solar_forecast_today_kwh=forecast_today.prediction_kwh if forecast_today else None,
            solar_forecast_tomorrow_kwh=forecast_tomorrow.prediction_kwh if forecast_tomorrow else None,
            is_active=is_active,
            reason=reason,
        )

        self._last_state = state

        _LOGGER.debug(
            "Smart charging: active=%s, target_soc=%.1f%%, current_soc=%s, "
            "forecast=%.1f kWh, reason=%s",
            is_active,
            target_soc,
            f"{current_soc:.1f}%" if current_soc is not None else "N/A",
            relevant_kwh or 0,
            reason,
        )

        return state

    def _evaluate_charging(
        self,
        is_cheap: bool,
        current_soc: float | None,
        target_soc: float,
        solar_kwh: float | None,
    ) -> tuple[bool, str]:
        """Evaluate whether grid charging should be active @zara

        Returns:
            Tuple of (is_active, reason)
        """
        # Price too high → no charging
        if not is_cheap:
            return False, "price_too_high"

        # SoC sensor unavailable → fall back to price-only (safe default)
        if current_soc is None:
            return True, "soc_unavailable_fallback"

        # SoC below target → charge from grid
        if current_soc < target_soc:
            return True, "soc_below_target"

        # SoC at or above target → stop grid charging, leave room for solar
        if solar_kwh is not None and solar_kwh > 0:
            return False, "soc_reached_solar_expected"

        # SoC at target but no solar forecast → still stop at target
        return False, "soc_reached_target"

    def update_config(
        self,
        battery_capacity_kwh: float,
        soc_sensor_entity: str,
        max_soc: int,
        min_soc: int,
    ) -> None:
        """Update configuration values @zara"""
        self._battery_capacity_kwh = battery_capacity_kwh
        self._soc_sensor_entity = soc_sensor_entity
        self._max_soc = max_soc
        self._min_soc = min_soc
