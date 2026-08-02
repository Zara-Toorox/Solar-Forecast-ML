# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

"""
Cache Management for Solar Forecast Energy AI V16.2.0.
Handles caching logic for weather and forecast data using database operations.
Uses yield_cache table for persistent caching.

@zara
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.core import HomeAssistant

from .db_manager import DatabaseManager
from .data_io import DataManagerIO

_LOGGER = logging.getLogger(__name__)


class DataCache(DataManagerIO):
    """Handles caching logic for weather and forecast data. @zara

    V16.0.0: Uses database for persistent cache storage.
    - In-memory cache for fast access during session
    - Database persistence for yield_cache and other critical values
    - Automatic cache expiration based on max_age

    Cache Types:
    - Weather forecasts: In-memory with TTL
    - Yield values: Database persisted via yield_cache table
    """

    def __init__(self, hass: HomeAssistant, db_manager: DatabaseManager):
        """Initialize the data cache. @zara

        Args:
            hass: Home Assistant instance
            db_manager: DatabaseManager instance for DB operations
        """
        super().__init__(hass, db_manager)

        # In-memory caches
        self._cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, datetime] = {}

        _LOGGER.debug("DataCache initialized with DatabaseManager")

    async def get_cached_forecast(
        self,
        key: str,
        max_age_hours: int = 1,
    ) -> Optional[Dict[str, Any]]:
        """Get cached forecast data if not expired. @zara

        Args:
            key: Cache key identifier
            max_age_hours: Maximum age in hours before expiration

        Returns:
            Cached data or None if expired/not found
        """
        if key not in self._cache:
            return None

        cache_time = self._cache_timestamps.get(key)
        if not cache_time:
            return None

        age = datetime.now() - cache_time
        if age.total_seconds() > max_age_hours * 3600:
            _LOGGER.debug("Cache expired for key: %s", key)
            return None

        _LOGGER.debug("Cache hit for key: %s", key)
        return self._cache[key]

    async def set_cached_forecast(
        self,
        key: str,
        data: Dict[str, Any],
    ) -> None:
        """Store forecast data in cache. @zara

        Args:
            key: Cache key identifier
            data: Data to cache
        """
        self._cache[key] = data
        self._cache_timestamps[key] = datetime.now()
        _LOGGER.debug("Cached data for key: %s", key)

    async def clear_cache(self, key: Optional[str] = None) -> None:
        """Clear cache data. @zara

        Args:
            key: Specific key to clear, or None to clear all
        """
        if key:
            self._cache.pop(key, None)
            self._cache_timestamps.pop(key, None)
            _LOGGER.debug("Cleared cache for key: %s", key)
        else:
            self._cache.clear()
            self._cache_timestamps.clear()
            _LOGGER.debug("Cleared all cache data")

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics. @zara

        Returns:
            Dict with cache statistics
        """
        return {
            "total_entries": len(self._cache),
            "keys": list(self._cache.keys()),
            "oldest_entry": (
                min(self._cache_timestamps.values()) if self._cache_timestamps else None
            ),
            "newest_entry": (
                max(self._cache_timestamps.values()) if self._cache_timestamps else None
            ),
        }

    # =========================================================================
    # Yield Cache (Database Persisted)
    # =========================================================================

    async def save_yield_cache(
        self,
        value: float,
        timestamp: Optional[datetime] = None,
        date_str: Optional[str] = None,
    ) -> bool:
        """Save yield value to database cache. @zara

        Args:
            value: Yield value in kWh
            timestamp: Time of measurement (default: now)
            date_str: Date string (default: today)

        Returns:
            True if saved successfully
        """
        try:
            if timestamp is None:
                timestamp = datetime.now()
            if date_str is None:
                date_str = timestamp.date().isoformat()

            cache_data = {
                "value": value,
                "time": timestamp.isoformat(),
                "date": date_str,
            }
            await self.db.save_yield_cache(cache_data)

            # Also update in-memory cache
            self._cache["yield_current"] = value
            self._cache_timestamps["yield_current"] = timestamp

            _LOGGER.debug("Saved yield cache: %.3f kWh at %s", value, timestamp)
            return True

        except Exception as e:
            _LOGGER.error("Failed to save yield cache: %s", e)
            return False

    async def get_yield_cache(self) -> Optional[Dict[str, Any]]:
        """Get yield cache from database. @zara

        Returns:
            Dict with yield cache data or None
        """
        try:
            row = await self.fetch_one(
                "SELECT value, time, date FROM yield_cache WHERE id = 1"
            )

            if not row:
                return None

            return {
                "value": row[0],
                "time": row[1],
                "date": row[2],
            }

        except Exception as e:
            _LOGGER.error("Failed to get yield cache: %s", e)
            return None

    async def get_yield_value(self) -> Optional[float]:
        """Get current yield value from cache. @zara

        First checks in-memory cache, then falls back to database.

        Returns:
            Yield value in kWh or None
        """
        # Try in-memory first
        if "yield_current" in self._cache:
            return self._cache["yield_current"]

        # Fall back to database
        cache_data = await self.get_yield_cache()
        if cache_data:
            self._cache["yield_current"] = cache_data["value"]
            return cache_data["value"]

        return None

    # =========================================================================
    # Weather Forecast Cache (Database)
    # =========================================================================

    async def cache_weather_forecast(
        self,
        forecast_date: str,
        hour: int,
        weather_data: Dict[str, Any],
    ) -> bool:
        """Cache weather forecast to database. @zara

        Args:
            forecast_date: Date string (YYYY-MM-DD)
            hour: Hour (0-23)
            weather_data: Weather forecast data

        Returns:
            True if cached successfully
        """
        try:
            await self.execute_query(
                """INSERT INTO weather_forecast
                   (forecast_date, hour, temperature, solar_radiation_wm2, wind,
                    humidity, rain, clouds, pressure, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(forecast_date, hour) DO UPDATE SET
                       temperature = excluded.temperature,
                       solar_radiation_wm2 = excluded.solar_radiation_wm2,
                       wind = excluded.wind,
                       humidity = excluded.humidity,
                       rain = excluded.rain,
                       clouds = excluded.clouds,
                       pressure = excluded.pressure,
                       updated_at = excluded.updated_at""",
                (
                    forecast_date,
                    hour,
                    weather_data.get("temperature"),
                    weather_data.get("solar_radiation_wm2"),
                    weather_data.get("wind"),
                    weather_data.get("humidity"),
                    weather_data.get("rain"),
                    weather_data.get("clouds"),
                    weather_data.get("pressure"),
                    datetime.now(),
                ),
            )
            return True

        except Exception as e:
            _LOGGER.error("Failed to cache weather forecast: %s", e)
            return False

    async def get_cached_weather_forecast(
        self,
        forecast_date: str,
        hour: int,
    ) -> Optional[Dict[str, Any]]:
        """Get cached weather forecast from database. @zara

        Args:
            forecast_date: Date string (YYYY-MM-DD)
            hour: Hour (0-23)

        Returns:
            Weather forecast data or None
        """
        try:
            row = await self.fetch_one(
                """SELECT temperature, solar_radiation_wm2, wind, humidity,
                          rain, clouds, pressure, updated_at
                   FROM weather_forecast
                   WHERE forecast_date = ? AND hour = ?""",
                (forecast_date, hour),
            )

            if not row:
                return None

            return {
                "temperature": row[0],
                "solar_radiation_wm2": row[1],
                "wind": row[2],
                "humidity": row[3],
                "rain": row[4],
                "clouds": row[5],
                "pressure": row[6],
                "updated_at": row[7],
            }

        except Exception as e:
            _LOGGER.error("Failed to get cached weather forecast: %s", e)
            return None

    async def get_daily_weather_forecast(
        self,
        forecast_date: str,
    ) -> Dict[int, Dict[str, Any]]:
        """Get all cached weather forecasts for a day. @zara

        Args:
            forecast_date: Date string (YYYY-MM-DD)

        Returns:
            Dict mapping hour -> weather forecast data
        """
        try:
            rows = await self.fetch_all(
                """SELECT hour, temperature, solar_radiation_wm2, wind,
                          humidity, rain, clouds, pressure
                   FROM weather_forecast
                   WHERE forecast_date = ?
                   ORDER BY hour""",
                (forecast_date,),
            )

            return {
                row[0]: {
                    "hour": row[0],
                    "temperature": row[1],
                    "solar_radiation_wm2": row[2],
                    "wind": row[3],
                    "humidity": row[4],
                    "rain": row[5],
                    "clouds": row[6],
                    "pressure": row[7],
                }
                for row in rows
            }

        except Exception as e:
            _LOGGER.error("Failed to get daily weather forecast: %s", e)
            return {}

    # =========================================================================
    # Cache Maintenance
    # =========================================================================

    async def cleanup_old_cache(self, days_to_keep: int = 7) -> int:
        """Clean up old cache entries from database. @zara

        Args:
            days_to_keep: Number of days to keep

        Returns:
            Number of entries deleted
        """
        try:
            cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).date()

            # Clean weather forecasts
            weather_result = await self.fetch_one(
                """SELECT COUNT(*) FROM weather_forecast
                   WHERE forecast_date < ?""",
                (cutoff_date.isoformat(),),
            )
            weather_count = weather_result[0] if weather_result else 0

            await self.execute_query(
                "DELETE FROM weather_forecast WHERE forecast_date < ?",
                (cutoff_date.isoformat(),),
            )

            if weather_count > 0:
                _LOGGER.info(
                    "Cleaned up %d old weather cache entries",
                    weather_count,
                )

            return weather_count

        except Exception as e:
            _LOGGER.error("Failed to cleanup old cache: %s", e)
            return 0

    async def get_cache_summary(self) -> Dict[str, Any]:
        """Get comprehensive cache summary. @zara

        Returns:
            Dict with cache statistics and status
        """
        try:
            # In-memory stats
            memory_stats = await self.get_cache_stats()

            # Weather forecast count
            weather_row = await self.fetch_one(
                "SELECT COUNT(*), MIN(forecast_date), MAX(forecast_date) FROM weather_forecast"
            )

            # Yield cache
            yield_cache = await self.get_yield_cache()

            return {
                "in_memory": memory_stats,
                "weather_forecast": {
                    "total_entries": weather_row[0] if weather_row else 0,
                    "oldest_date": weather_row[1] if weather_row else None,
                    "newest_date": weather_row[2] if weather_row else None,
                },
                "yield_cache": yield_cache,
            }

        except Exception as e:
            _LOGGER.error("Failed to get cache summary: %s", e)
            return {
                "error": str(e),
                "in_memory": {"total_entries": 0},
            }
