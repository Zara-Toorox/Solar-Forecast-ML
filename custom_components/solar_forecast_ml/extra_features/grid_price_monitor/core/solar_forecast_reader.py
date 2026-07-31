# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import date, datetime

from ..storage import GPMDatabaseConnector

_LOGGER = logging.getLogger(__name__)


@dataclass
class SolarForecast:
    """Solar forecast data from SFML @zara"""

    forecast_date: str
    prediction_kwh: float
    forecast_type: str  # 'today', 'tomorrow', 'day_after_tomorrow'
    source: str | None = None
    locked: bool = False


class SolarForecastReader:
    """Reads solar forecast data from the shared SFML database @zara

    The SFML integration stores daily forecasts in the 'daily_forecasts' table.
    This reader pulls today/tomorrow predictions to calculate smart charging targets.
    """

    def __init__(self, db: GPMDatabaseConnector) -> None:
        """Initialize the forecast reader @zara"""
        self._db = db

    async def async_get_forecasts(self) -> dict[str, SolarForecast | None]:
        """Get latest forecasts for today and tomorrow @zara

        Returns:
            Dict with keys 'today' and 'tomorrow', values are SolarForecast or None
        """
        result: dict[str, SolarForecast | None] = {
            "today": None,
            "tomorrow": None,
        }

        for attempt in range(3):
            try:
                rows = await self._db.fetchall(
                    """SELECT forecast_type, forecast_date, prediction_kwh, source, locked
                       FROM daily_forecasts df1
                       WHERE forecast_type IN ('today', 'tomorrow')
                       AND created_at = (
                           SELECT MAX(created_at) FROM daily_forecasts df2
                           WHERE df2.forecast_type = df1.forecast_type
                       )""",
                )

                for row in rows:
                    forecast_type = row[0]
                    forecast = SolarForecast(
                        forecast_date=row[1],
                        prediction_kwh=row[2] or 0.0,
                        forecast_type=forecast_type,
                        source=row[3],
                        locked=bool(row[4]),
                    )
                    if forecast_type in result:
                        result[forecast_type] = forecast
                break

            except Exception as err:
                if "locked" in str(err).lower() and attempt < 2:
                    _LOGGER.debug("DB locked on forecast read attempt %d, retrying...", attempt + 1)
                    await asyncio.sleep(1 + attempt)
                    continue
                _LOGGER.debug("Could not read SFML forecasts: %s", err)

        return result

    async def async_get_relevant_forecast_kwh(self) -> float | None:
        """Get the most relevant solar forecast in kWh for charging decisions @zara

        Logic:
        - Night (0-6h): Use today's forecast (sun comes soon)
        - Day/Evening (6-24h): Use tomorrow's forecast (next solar day)

        Returns:
            Predicted solar energy in kWh, or None if no forecast available
        """
        forecasts = await self.async_get_forecasts()
        now = datetime.now()
        current_hour = now.hour

        if current_hour < 6:
            # Night: sun comes today
            forecast = forecasts.get("today")
            label = "today"
        else:
            # Day/Evening: next solar day is tomorrow
            forecast = forecasts.get("tomorrow")
            label = "tomorrow"

        if forecast is None:
            _LOGGER.debug("No SFML forecast available for %s", label)
            return None

        _LOGGER.debug(
            "Using %s solar forecast: %.2f kWh (source=%s, locked=%s)",
            label,
            forecast.prediction_kwh,
            forecast.source,
            forecast.locked,
        )
        return forecast.prediction_kwh
