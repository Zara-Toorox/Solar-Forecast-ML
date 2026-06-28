# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Power Sources Data Collector for SFML Stats. @zara"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Any, AsyncIterator

import aiosqlite

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

from .utils.time_utils import as_ha_local, ha_now, ha_today

from .const import (
    CONF_SENSOR_SOLAR_TO_HOUSE,
    CONF_SENSOR_SOLAR_TO_BATTERY,
    CONF_SENSOR_BATTERY_TO_HOUSE,
    CONF_SENSOR_GRID_TO_HOUSE,
    CONF_SENSOR_GRID_TO_BATTERY,
    CONF_SENSOR_HOME_CONSUMPTION,
    CONF_SENSOR_HOUSE_TO_GRID,
    CONF_SENSOR_BATTERY_SOC,
    CONF_SENSOR_SMARTMETER_IMPORT,
    CONF_SENSOR_SMARTMETER_EXPORT,
    SENSOR_W_TO_DAILY_KWH_MAP,
    CONF_SENSOR_HEATPUMP_DAILY,
    CONF_SENSOR_HEATINGROD_DAILY,
    CONF_SENSOR_WALLBOX_DAILY,
    CONF_SENSOR_HEATPUMP_POWER,
    CONF_SENSOR_HEATINGROD_POWER,
    CONF_SENSOR_WALLBOX_POWER,
)

_W_KEY_TO_DB_COLUMN: dict[str, str] = {
    CONF_SENSOR_SOLAR_TO_BATTERY: "solar_to_battery_kwh",
    CONF_SENSOR_BATTERY_TO_HOUSE: "battery_to_house_kwh",
    CONF_SENSOR_GRID_TO_BATTERY: "grid_to_battery_kwh",
    CONF_SENSOR_HOME_CONSUMPTION: "home_consumption_kwh",
    CONF_SENSOR_SMARTMETER_IMPORT: "smartmeter_import_kwh",
    CONF_SENSOR_SMARTMETER_EXPORT: "smartmeter_export_kwh",
}
from .sfml_data_reader import SFMLDataReader

_LOGGER = logging.getLogger(__name__)

COLLECTION_INTERVAL = 60
LIVE_MIN_INTERVAL = 5  # Minimum seconds between live DB writes (debounce)

MAX_DATA_AGE_DAYS = 7


class PowerSourcesCollector:
    """Collects power sources data periodically and stores in SFML DB. @zara"""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any], data_path: Path) -> None:
        """Initialize the collector. @zara"""
        self.hass = hass
        self.config = config
        self.data_path = data_path
        self._db_path = Path(hass.config.path()) / "solar_forecast_ml" / "solar_forecast.db"
        self._task: asyncio.Task | None = None
        self._running = False
        self._live_columns_ensured = False
        self._last_live_write: float = 0
        self._live_unsub: list = []
        self._sfml_reader = SFMLDataReader(hass)

    @asynccontextmanager
    async def _get_db(self) -> AsyncIterator[aiosqlite.Connection]:
        """Get DB connection via manager with direct fallback. @zara"""
        from .storage.db_connection_manager import get_manager, DatabaseConnectionManager
        manager = get_manager()
        if manager is not None and manager.is_connected:
            yield await manager.get_connection()
            return
        async with DatabaseConnectionManager.connect_direct_safe(self._db_path) as conn:
            yield conn

    @property
    def is_db_available(self) -> bool:
        """Check if SFML database is available. @zara"""
        return self._db_path.exists()

    async def _execute_write(self, query: str, params: tuple = ()) -> None:
        """Execute writes through the shared STATS connection manager."""
        from .storage.db_connection_manager import DatabaseConnectionManager, get_manager

        manager = get_manager()
        if manager is None:
            manager = await DatabaseConnectionManager.get_instance(self.hass)
        elif not manager.is_connected:
            await manager.connect()
        await manager.execute_write(query, params)

    @staticmethod
    def _is_locked_error(err: BaseException) -> bool:
        err_str = str(err).lower()
        return "database is locked" in err_str or "database is busy" in err_str

    async def start(self) -> None:
        """Start the data collection task. @zara"""
        if self._running:
            return

        if not self.is_db_available:
            _LOGGER.warning("SFML database not found at %s - Power Sources Collector disabled", self._db_path)
            return

        self._running = True
        self._task = asyncio.create_task(self._collection_loop())
        self._setup_live_listeners()
        _LOGGER.info("Power Sources Collector started (using SFML database)")

    async def stop(self) -> None:
        """Stop the data collection task. @zara"""
        self._running = False
        for unsub in self._live_unsub:
            unsub()
        self._live_unsub.clear()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        _LOGGER.info("Power Sources Collector stopped")

    async def _collection_loop(self) -> None:
        """Main collection loop. @zara"""
        while self._running:
            try:
                await self._collect_data()
            except Exception as e:
                _LOGGER.error("Error collecting power sources data: %s", e)

            await asyncio.sleep(COLLECTION_INTERVAL)

    def _setup_live_listeners(self) -> None:
        """Register state change listeners for non-SFML flow sensors. @zara"""
        from homeassistant.helpers.event import async_track_state_change_event

        entity_ids = []
        for key in (CONF_SENSOR_SOLAR_TO_BATTERY,):
            entity_id = self.config.get(key)
            if entity_id:
                entity_ids.append(entity_id)

        if not entity_ids:
            _LOGGER.debug("No non-SFML live flow sensors configured - periodic tracking only")
            return

        unsub = async_track_state_change_event(
            self.hass, entity_ids, self._on_live_sensor_change
        )
        self._live_unsub.append(unsub)
        _LOGGER.info("Live flow tracking active for %d sensors", len(entity_ids))

    async def _on_live_sensor_change(self, event) -> None:
        """Handle sensor state change - write to sensor_power_live. @zara"""
        import time
        now_ts = time.monotonic()
        if now_ts - self._last_live_write < LIVE_MIN_INTERVAL:
            return
        self._last_live_write = now_ts

        try:
            await self._write_live_power()
        except Exception as e:
            _LOGGER.error("Error writing live power data: %s", e)

    async def _write_live_power(self) -> None:
        """Write current power values to sensor_power_live. @zara"""
        local_now = ha_now(self.hass)
        solar_power = await self._sfml_reader.get_live_power() or 0
        solar_to_battery = self._get_sensor_value(CONF_SENSOR_SOLAR_TO_BATTERY) or 0
        panel_groups = await self._sfml_reader.get_live_panel_groups()
        panel_values = [group.get("power") for group in panel_groups[:4]]
        while len(panel_values) < 4:
            panel_values.append(None)
        panel1, panel2, panel3, panel4 = panel_values

        async with self._get_db() as db:
            if not self._live_columns_ensured:
                await self._ensure_power_live_columns(db)
                self._live_columns_ensured = True

            await db.execute("""
                INSERT INTO sensor_power_live (
                    timestamp, power_watt, solar_to_battery_watt,
                    panel1_watt, panel2_watt, panel3_watt, panel4_watt
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                local_now.strftime("%Y-%m-%d %H:%M:%S"),
                solar_power,
                solar_to_battery,
                panel1, panel2, panel3, panel4,
            ))

            # Retention cleanup (nur jede 100. Schreiboperation)
            import random
            if random.random() < 0.01:
                cutoff = (local_now - timedelta(days=MAX_DATA_AGE_DAYS)).strftime("%Y-%m-%d %H:%M:%S")
                await db.execute(
                    "DELETE FROM sensor_power_live WHERE timestamp < ?",
                    (cutoff,)
                )

            await db.commit()

    async def _collect_data(self) -> None:
        """Collect current power values and store in SFML database. @zara"""
        now = datetime.now(timezone.utc)
        local_now = as_ha_local(now, self.hass)

        solar_power = await self._sfml_reader.get_live_power()

        solar_to_house = self._get_sensor_value(CONF_SENSOR_SOLAR_TO_HOUSE)
        solar_to_battery = self._get_sensor_value(CONF_SENSOR_SOLAR_TO_BATTERY)
        battery_to_house = self._get_sensor_value(CONF_SENSOR_BATTERY_TO_HOUSE)
        grid_to_house = self._get_sensor_value(CONF_SENSOR_GRID_TO_HOUSE)
        grid_to_battery = self._get_sensor_value(CONF_SENSOR_GRID_TO_BATTERY)
        home_consumption = self._get_sensor_value(CONF_SENSOR_HOME_CONSUMPTION)
        house_to_grid = self._get_sensor_value(CONF_SENSOR_HOUSE_TO_GRID)
        battery_soc = self._get_sensor_value(CONF_SENSOR_BATTERY_SOC)
        smartmeter_import = self._get_sensor_value(CONF_SENSOR_SMARTMETER_IMPORT)
        smartmeter_export = self._get_sensor_value(CONF_SENSOR_SMARTMETER_EXPORT)

        heatpump_w = self._get_sensor_value(CONF_SENSOR_HEATPUMP_POWER)
        heatingrod_w = self._get_sensor_value(CONF_SENSOR_HEATINGROD_POWER)
        wallbox_w = self._get_sensor_value(CONF_SENSOR_WALLBOX_POWER)

        if solar_power is not None and solar_power < 0:
            solar_power = 0.0
        if solar_to_house is not None and solar_to_house < 0:
            solar_to_house = 0.0
        if solar_to_battery is not None and solar_to_battery < 0:
            solar_to_battery = 0.0
        if house_to_grid is not None and house_to_grid < 0:
            house_to_grid = 0.0

        if solar_to_house is None and solar_power is not None:
            solar_to_battery_val = solar_to_battery or 0
            solar_to_house = max(0, solar_power - solar_to_battery_val)
            _LOGGER.debug("Calculated solar_to_house: %.1f W (solar %.1f - battery %.1f)",
                         solar_to_house, solar_power, solar_to_battery_val)

        if grid_to_house is None and home_consumption is not None:
            solar_to_house_val = solar_to_house or 0
            battery_to_house_val = battery_to_house or 0
            grid_to_house = max(0, home_consumption - solar_to_house_val - battery_to_house_val)
            _LOGGER.debug("Calculated grid_to_house: %.1f W (consumption %.1f - solar %.1f - battery %.1f)",
                         grid_to_house, home_consumption, solar_to_house_val, battery_to_house_val)

        if smartmeter_import is None and grid_to_house is not None:
            grid_to_battery_val = grid_to_battery or 0
            smartmeter_import = grid_to_house + grid_to_battery_val
            _LOGGER.debug("Calculated smartmeter_import: %.1f W", smartmeter_import)

        if house_to_grid is None and solar_power is not None:
            solar_to_house_val = solar_to_house or 0
            solar_to_battery_val = solar_to_battery or 0
            house_to_grid = max(0, solar_power - solar_to_house_val - solar_to_battery_val)
            _LOGGER.debug("Calculated house_to_grid: %.1f W", house_to_grid)

        if smartmeter_export is None:
            smartmeter_export = house_to_grid

        if smartmeter_export is None and solar_power is not None:
            solar_to_house_val = solar_to_house or 0
            solar_to_battery_val = solar_to_battery or 0
            smartmeter_export = max(0, solar_power - solar_to_house_val - solar_to_battery_val)
            _LOGGER.debug("Calculated smartmeter_export: %.1f W", smartmeter_export)

        try:
            await self._execute_write("""
                INSERT OR REPLACE INTO stats_power_sources (
                    timestamp, date, hour,
                    solar_power_w, house_consumption_w,
                    solar_to_house_w, solar_to_battery_w,
                    solar_to_grid_w, battery_to_house_w,
                    grid_to_house_w, grid_to_battery_w
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                now.isoformat(),
                local_now.strftime("%Y-%m-%d"),
                local_now.hour,
                solar_power or 0,
                home_consumption or 0,
                solar_to_house or 0,
                solar_to_battery or 0,
                house_to_grid or 0,
                battery_to_house or 0,
                grid_to_house or 0,
                grid_to_battery or 0,
            ))

            cutoff = (now - timedelta(days=MAX_DATA_AGE_DAYS)).isoformat()
            await self._execute_write(
                "DELETE FROM stats_power_sources WHERE timestamp < ?",
                (cutoff,),
            )
        except Exception as e:
            if self._is_locked_error(e):
                _LOGGER.debug("Power sources data write skipped after DB lock retries: %s", e)
            else:
                _LOGGER.error("Error inserting power sources data into DB: %s", e)

        try:
            await self._write_live_power()
        except Exception as e:
            _LOGGER.error("Error writing SFML live power snapshot: %s", e)

        _LOGGER.debug(
            "Collected power data: solar_power=%.1f, solar_to_house=%.1f, solar_to_battery=%.1f, battery=%.1f, grid=%.1f, consumption=%.1f, soc=%s",
            solar_power or 0, solar_to_house or 0, solar_to_battery or 0, battery_to_house or 0, grid_to_house or 0,
            home_consumption or 0, battery_soc
        )

        data_point = {
            "solar_power": solar_power,
            "solar_to_house": solar_to_house,
            "solar_to_battery": solar_to_battery,
            "house_to_grid": house_to_grid,
            "battery_to_house": battery_to_house,
            "grid_to_house": grid_to_house,
            "grid_to_battery": grid_to_battery,
            "home_consumption": home_consumption,
            "battery_soc": battery_soc,
            "smartmeter_import": smartmeter_import,
            "smartmeter_export": smartmeter_export,
            "heatpump_w": heatpump_w,
            "heatingrod_w": heatingrod_w,
            "wallbox_w": wallbox_w,
        }
        await self._update_daily_stats(now, data_point)

    def _get_sensor_value(self, config_key: str) -> float | None:
        """Get sensor value from Home Assistant. @zara"""
        entity_id = self.config.get(config_key)
        if not entity_id:
            return None

        state = self.hass.states.get(entity_id)
        if not state or state.state in ('unknown', 'unavailable'):
            return None

        try:
            return float(state.state)
        except (ValueError, TypeError):
            return None

    async def get_history(self, hours: int = 24) -> list[dict[str, Any]]:
        """Get historical data for the specified number of hours from SFML database. @zara"""
        if not self.is_db_available:
            return []

        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()

        try:
            async with self._get_db() as db:
                async with db.execute("""
                    SELECT timestamp, date, hour,
                           solar_power_w, house_consumption_w,
                           solar_to_house_w, solar_to_battery_w,
                           solar_to_grid_w, battery_to_house_w,
                           grid_to_house_w, grid_to_battery_w
                    FROM stats_power_sources
                    WHERE timestamp > ?
                    ORDER BY timestamp ASC
                """, (cutoff,)) as cursor:
                    rows = await cursor.fetchall()

            result = []
            for row in rows:
                result.append({
                    "timestamp": row["timestamp"],
                    "solar_power": row["solar_power_w"],
                    "solar_to_house": row["solar_to_house_w"],
                    "solar_to_battery": row["solar_to_battery_w"],
                    "house_to_grid": row["solar_to_grid_w"],
                    "battery_to_house": row["battery_to_house_w"],
                    "grid_to_house": row["grid_to_house_w"],
                    "grid_to_battery": row["grid_to_battery_w"],
                    "home_consumption": row["house_consumption_w"],
                    "battery_soc": None,
                })
            return result
        except Exception as e:
            _LOGGER.error("Error reading power sources history from DB: %s", e)
            return []

    async def _ensure_power_live_columns(self, db: aiosqlite.Connection) -> None:
        """Ensure panel columns exist in sensor_power_live table. @zara"""
        async with db.execute("PRAGMA table_info(sensor_power_live)") as cursor:
            rows = await cursor.fetchall()
            existing = {row[1] for row in rows}

        for col in ("panel1_watt", "panel2_watt", "panel3_watt", "panel4_watt"):
            if col not in existing:
                try:
                    await db.execute(f"ALTER TABLE sensor_power_live ADD COLUMN {col} REAL")
                    _LOGGER.info("Added column %s to sensor_power_live", col)
                except Exception:
                    pass
        await db.commit()

    async def _ensure_db_columns(self, db: aiosqlite.Connection) -> None:
        """Ensure all required columns exist in stats_daily_energy table. @zara"""
        async with db.execute("PRAGMA table_info(stats_daily_energy)") as cursor:
            rows = await cursor.fetchall()
            existing_columns = {row[1] for row in rows}

        new_columns = [
            ("grid_to_battery_kwh", "REAL DEFAULT 0"),
            ("smartmeter_import_kwh", "REAL DEFAULT 0"),
            ("smartmeter_export_kwh", "REAL DEFAULT 0"),
            ("consumer_heatpump_kwh", "REAL DEFAULT 0"),
            ("consumer_heatingrod_kwh", "REAL DEFAULT 0"),
            ("consumer_wallbox_kwh", "REAL DEFAULT 0"),
        ]

        for col_name, col_type in new_columns:
            if col_name not in existing_columns:
                try:
                    await db.execute(f"ALTER TABLE stats_daily_energy ADD COLUMN {col_name} {col_type}")
                    _LOGGER.info("Added column %s to stats_daily_energy", col_name)
                except Exception as e:
                    _LOGGER.debug("Column %s might already exist: %s", col_name, e)

        await db.commit()

    async def _update_daily_stats(self, now: datetime, data_point: dict[str, Any]) -> None:
        """Update daily statistics in stats_daily_energy table. @zara"""
        if not self.is_db_available:
            return

        local_now = as_ha_local(now, self.hass)
        today_str = local_now.strftime("%Y-%m-%d")

        interval_hours = COLLECTION_INTERVAL / 3600

        solar_to_house_kwh = ((data_point.get("solar_to_house") or 0) * interval_hours) / 1000
        solar_to_battery_kwh = ((data_point.get("solar_to_battery") or 0) * interval_hours) / 1000
        battery_to_house_kwh = ((data_point.get("battery_to_house") or 0) * interval_hours) / 1000
        grid_to_house_kwh = ((data_point.get("grid_to_house") or 0) * interval_hours) / 1000
        grid_to_battery_kwh = ((data_point.get("grid_to_battery") or 0) * interval_hours) / 1000
        home_consumption_kwh = ((data_point.get("home_consumption") or 0) * interval_hours) / 1000
        smartmeter_import_kwh = ((data_point.get("smartmeter_import") or 0) * interval_hours) / 1000
        smartmeter_export_kwh = ((data_point.get("smartmeter_export") or 0) * interval_hours) / 1000
        flow_solar_yield_kwh = solar_to_house_kwh + solar_to_battery_kwh + smartmeter_export_kwh

        # Numerische Integration für Großverbraucher (W zu kWh)
        heatpump_kwh = ((data_point.get("heatpump_w") or 0) * interval_hours) / 1000
        heatingrod_kwh = ((data_point.get("heatingrod_w") or 0) * interval_hours) / 1000
        wallbox_kwh = ((data_point.get("wallbox_w") or 0) * interval_hours) / 1000

        solar_power = data_point.get("solar_power") or 0

        try:
            sfml_solar_yield_kwh = await self._sfml_reader.get_live_yield()
            async with self._get_db() as db:
                await self._ensure_db_columns(db)

                async with db.execute(
                    "SELECT * FROM stats_daily_energy WHERE date = ?",
                    (today_str,)
                ) as cursor:
                    existing = await cursor.fetchone()

                if existing:
                    await db.execute("""
                        UPDATE stats_daily_energy SET
                            solar_yield_kwh = solar_yield_kwh + ?,
                            solar_to_house_kwh = solar_to_house_kwh + ?,
                            solar_to_battery_kwh = solar_to_battery_kwh + ?,
                            battery_to_house_kwh = battery_to_house_kwh + ?,
                            grid_to_house_kwh = grid_to_house_kwh + ?,
                            grid_to_battery_kwh = COALESCE(grid_to_battery_kwh, 0) + ?,
                            home_consumption_kwh = home_consumption_kwh + ?,
                            smartmeter_import_kwh = COALESCE(smartmeter_import_kwh, 0) + ?,
                            smartmeter_export_kwh = COALESCE(smartmeter_export_kwh, 0) + ?,
                            consumer_heatpump_kwh = COALESCE(consumer_heatpump_kwh, 0) + ?,
                            consumer_heatingrod_kwh = COALESCE(consumer_heatingrod_kwh, 0) + ?,
                            consumer_wallbox_kwh = COALESCE(consumer_wallbox_kwh, 0) + ?,
                            peak_solar_w = MAX(peak_solar_w, ?),
                            peak_solar_time = CASE WHEN ? > peak_solar_w THEN ? ELSE peak_solar_time END
                        WHERE date = ?
                    """, (
                        flow_solar_yield_kwh,
                        solar_to_house_kwh,
                        solar_to_battery_kwh,
                        battery_to_house_kwh,
                        grid_to_house_kwh,
                        grid_to_battery_kwh,
                        home_consumption_kwh,
                        smartmeter_import_kwh,
                        smartmeter_export_kwh,
                        heatpump_kwh,
                        heatingrod_kwh,
                        wallbox_kwh,
                        solar_power,
                        solar_power,
                        local_now.strftime("%H:%M"),
                        today_str,
                    ))
                else:
                    await db.execute("""
                        INSERT INTO stats_daily_energy (
                            date, solar_yield_kwh, solar_to_house_kwh, solar_to_battery_kwh,
                            battery_to_house_kwh, grid_to_house_kwh, grid_to_battery_kwh,
                            home_consumption_kwh, smartmeter_import_kwh, smartmeter_export_kwh,
                            consumer_heatpump_kwh, consumer_heatingrod_kwh, consumer_wallbox_kwh,
                            peak_solar_w, peak_solar_time
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        today_str,
                        flow_solar_yield_kwh,
                        solar_to_house_kwh,
                        solar_to_battery_kwh,
                        battery_to_house_kwh,
                        grid_to_house_kwh,
                        grid_to_battery_kwh,
                        home_consumption_kwh,
                        smartmeter_import_kwh,
                        smartmeter_export_kwh,
                        heatpump_kwh,
                        heatingrod_kwh,
                        wallbox_kwh,
                        solar_power,
                        local_now.strftime("%H:%M"),
                    ))

                for w_key, db_col in _W_KEY_TO_DB_COLUMN.items():
                    daily_key = SENSOR_W_TO_DAILY_KWH_MAP.get(w_key)
                    if not daily_key:
                        continue
                    daily_entity = self.config.get(daily_key)
                    if not daily_entity:
                        continue
                    value = self._get_sensor_value(daily_key)
                    if value is not None:
                        await db.execute(
                            f"UPDATE stats_daily_energy SET {db_col} = ? WHERE date = ?",
                            (round(max(0, value), 4), today_str)
                        )

                _consumer_daily_map = {
                    CONF_SENSOR_HEATPUMP_DAILY: "consumer_heatpump_kwh",
                    CONF_SENSOR_HEATINGROD_DAILY: "consumer_heatingrod_kwh",
                    CONF_SENSOR_WALLBOX_DAILY: "consumer_wallbox_kwh",
                }
                for sensor_key, db_col in _consumer_daily_map.items():
                    entity_id = self.config.get(sensor_key)
                    if not entity_id:
                        continue
                    value = self._get_sensor_value(sensor_key)
                    if value is not None:
                        await db.execute(
                            f"UPDATE stats_daily_energy SET {db_col} = ? WHERE date = ?",
                            (round(max(0, value), 4), today_str)
                        )

                if sfml_solar_yield_kwh is not None:
                    await db.execute("""
                        UPDATE stats_daily_energy SET
                            solar_yield_kwh = ?,
                            autarkie_percent = CASE
                                WHEN home_consumption_kwh > 0
                                THEN MIN(100, MAX(0, (solar_to_house_kwh + MAX(0, battery_to_house_kwh - grid_to_battery_kwh)) / home_consumption_kwh * 100))
                                ELSE 0
                            END,
                            self_consumption_kwh = MIN(?, solar_to_house_kwh + solar_to_battery_kwh)
                        WHERE date = ?
                    """, (
                        round(sfml_solar_yield_kwh, 4),
                        round(sfml_solar_yield_kwh, 4),
                        today_str,
                    ))
                else:
                    await db.execute("""
                        UPDATE stats_daily_energy SET
                            solar_yield_kwh = solar_to_house_kwh + solar_to_battery_kwh + COALESCE(smartmeter_export_kwh, 0),
                            autarkie_percent = CASE
                                WHEN home_consumption_kwh > 0
                                THEN MIN(100, MAX(0, (solar_to_house_kwh + MAX(0, battery_to_house_kwh - grid_to_battery_kwh)) / home_consumption_kwh * 100))
                                ELSE 0
                            END,
                            self_consumption_kwh = solar_to_house_kwh + solar_to_battery_kwh
                        WHERE date = ?
                    """, (today_str,))

                await db.commit()
        except Exception as e:
            _LOGGER.error("Error updating daily stats in DB: %s", e)

    async def get_daily_stats(self, days: int = 7) -> dict[str, Any]:
        """Get daily statistics for the specified number of days from SFML database. @zara"""
        if not self.is_db_available:
            return {"version": 1, "last_updated": None, "days": {}}

        cutoff = (ha_today(self.hass) - timedelta(days=days)).isoformat()

        try:
            async with self._get_db() as db:
                async with db.execute("""
                    SELECT date, solar_yield_kwh, solar_to_house_kwh, solar_to_battery_kwh,
                           battery_to_house_kwh, battery_charge_solar_kwh, battery_charge_grid_kwh,
                           grid_to_house_kwh, grid_to_battery_kwh,
                           grid_export_kwh, smartmeter_import_kwh, smartmeter_export_kwh,
                           home_consumption_kwh,
                           autarkie_percent, self_consumption_kwh, peak_solar_w, peak_solar_time
                    FROM stats_daily_energy
                    WHERE date >= ?
                    ORDER BY date DESC
                """, (cutoff,)) as cursor:
                    rows = await cursor.fetchall()

            filtered_days = {}
            for row in rows:
                solar_to_house = row["solar_to_house_kwh"] or 0
                solar_to_battery = row["solar_to_battery_kwh"] or 0
                solar_yield = row["solar_yield_kwh"] or 0
                self_cons_pct = (
                    ((solar_to_house + solar_to_battery) / solar_yield * 100)
                    if solar_yield > 0 else 0
                )
                grid_to_house = row["grid_to_house_kwh"] or 0
                # Use accumulator value, fall back to sensor value
                grid_to_battery = row["grid_to_battery_kwh"] or row["battery_charge_grid_kwh"] or 0
                grid_export = row["grid_export_kwh"] or row["smartmeter_export_kwh"] or 0
                battery_to_house = row["battery_to_house_kwh"] or 0
                # Charge from solar: accumulator or sensor
                charge_solar = solar_to_battery or row["battery_charge_solar_kwh"] or 0
                total_charged = charge_solar + grid_to_battery
                filtered_days[row["date"]] = {
                    "date": row["date"],
                    "solar_total_kwh": solar_yield,
                    "solar_yield_kwh": solar_yield,
                    "solar_to_house_kwh": solar_to_house,
                    "solar_to_battery_kwh": solar_to_battery,
                    "battery_to_house_kwh": battery_to_house,
                    "battery_charge_solar_kwh": charge_solar,
                    "battery_charge_grid_kwh": grid_to_battery,
                    "battery_total_charged_kwh": total_charged,
                    "grid_to_house_kwh": grid_to_house,
                    "grid_to_battery_kwh": grid_to_battery,
                    "grid_import_kwh": grid_to_house + grid_to_battery,
                    "grid_export_kwh": grid_export,
                    "home_consumption_kwh": row["home_consumption_kwh"] or 0,
                    "autarky_percent": row["autarkie_percent"] or 0,
                    "self_consumption_percent": min(100, self_cons_pct),
                    "peak_solar_w": row["peak_solar_w"] or 0,
                    "peak_solar_time": row["peak_solar_time"],
                }

            return {
                "version": 1,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "days": filtered_days
            }
        except Exception as e:
            _LOGGER.error("Error reading daily stats from DB: %s", e)
            return {"version": 1, "last_updated": None, "days": {}}
