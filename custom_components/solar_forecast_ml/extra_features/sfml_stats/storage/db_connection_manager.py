# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Stats x86 DB-Version part of Solar Forecast ML DB
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Centralized database connection manager for SFML Stats. @zara"""
from __future__ import annotations

import asyncio
import logging
import random
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING, AsyncIterator

import aiosqlite

from ..const import SOLAR_FORECAST_DB

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

from ..utils.time_utils import naive_ha_local

_LOGGER = logging.getLogger(__name__)


def get_manager() -> DatabaseConnectionManager | None:
    """Get the current database manager instance if available. @zara"""
    instance = DatabaseConnectionManager._instance
    _LOGGER.debug("get_manager() called, returning: %s (connected: %s)",
                  instance is not None,
                  instance.is_connected if instance else False)
    return instance


class DatabaseConnectionManager:
    """Singleton manager for SQLite database connections. @zara"""

    _instance: DatabaseConnectionManager | None = None
    _lock: asyncio.Lock = asyncio.Lock()

    def __init__(self, config_path: Path, hass: HomeAssistant | None = None) -> None:
        """Initialize the database connection manager. @zara"""
        self._config_path = config_path
        self._db_path = config_path / SOLAR_FORECAST_DB
        self._hass = hass
        self._connection: aiosqlite.Connection | None = None
        self._is_connected = False
        self._connect_lock = asyncio.Lock()
        self._write_lock = asyncio.Lock()

    @classmethod
    async def get_instance(cls, hass: HomeAssistant) -> DatabaseConnectionManager:
        """Get or create the singleton instance. @zara"""
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    config_path = Path(hass.config.path())
                    cls._instance = cls(config_path, hass)
                    await cls._instance.connect()
        return cls._instance

    @classmethod
    async def close_instance(cls) -> None:
        """Close and reset the singleton instance. @zara"""
        if cls._instance is not None:
            async with cls._lock:
                if cls._instance is not None:
                    await cls._instance.close()
                    cls._instance = None

    @property
    def db_path(self) -> Path:
        """Return the database file path. @zara"""
        return self._db_path

    @property
    def is_available(self) -> bool:
        """Check if database file exists. @zara"""
        return self._db_path.exists()

    @property
    def is_connected(self) -> bool:
        """Check if connection is active. @zara"""
        return self._is_connected and self._connection is not None

    async def connect(self) -> bool:
        """Establish database connection. @zara"""
        async with self._connect_lock:
            if self._is_connected and self._connection is not None:
                _LOGGER.debug("Database already connected")
                return True

            if not self.is_available:
                _LOGGER.warning("Database not found: %s", self._db_path)
                return False

            conn: aiosqlite.Connection | None = None
            try:
                conn = await aiosqlite.connect(
                    str(self._db_path), timeout=60.0, isolation_level="IMMEDIATE"
                )
                await self._configure_connection(conn, self._hass)
                self._connection = conn
                self._is_connected = True
                _LOGGER.info("Database connection established (DELETE mode, 30s timeout): %s", self._db_path)
                return True
            except Exception as err:
                _LOGGER.error("Failed to connect to database: %s", err)
                if conn is not None:
                    await conn.close()
                self._connection = None
                self._is_connected = False
                return False

    @staticmethod
    def _ha_localtime_converter(hass: HomeAssistant | None):
        def to_ha_localtime(timestamp_str: str) -> str:

            if hass is None:
                return timestamp_str
            try:
                return naive_ha_local(timestamp_str, hass).isoformat()
            except Exception:
                return timestamp_str

        return to_ha_localtime

    @classmethod
    async def _configure_connection(cls, conn: aiosqlite.Connection, hass: HomeAssistant | None = None) -> None:
        """Apply shared SQLite connection settings before use. @zara"""
        conn.row_factory = aiosqlite.Row
        await conn.execute("PRAGMA foreign_keys = ON")
        await conn.execute("PRAGMA journal_mode = DELETE")
        await conn.execute("PRAGMA busy_timeout = 30000")
        await conn.create_function("ha_localtime", 1, cls._ha_localtime_converter(hass))

    async def ensure_gpm_tables(self) -> None:
        """Create GPM tables if they do not exist. @zara"""
        async with self._write_lock:
            if not await self._ensure_connected():
                raise RuntimeError("Database not available")

            try:
                await self._connection.executescript("""
                CREATE TABLE IF NOT EXISTS GPM_price_cache_meta (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    last_fetch TEXT,
                    valid_until TEXT,
                    country TEXT,
                    CHECK (id = 1)
                );

                CREATE TABLE IF NOT EXISTS GPM_price_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL UNIQUE,
                    price REAL NOT NULL,
                    total_price REAL,
                    hour INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS GPM_price_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL UNIQUE,
                    price_net REAL NOT NULL,
                    total_price REAL,
                    hour INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_gpm_price_history_ts ON GPM_price_history(timestamp);

                CREATE TABLE IF NOT EXISTS GPM_daily_averages (
                    date TEXT PRIMARY KEY,
                    average_net REAL NOT NULL,
                    average_total REAL NOT NULL,
                    min_price REAL,
                    max_price REAL
                );

                CREATE TABLE IF NOT EXISTS GPM_monthly_summaries (
                    month TEXT PRIMARY KEY,
                    average_price REAL NOT NULL,
                    cheap_hours INTEGER NOT NULL DEFAULT 0,
                    country TEXT
                );

                CREATE TABLE IF NOT EXISTS GPM_price_extremes (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    all_time_low REAL,
                    all_time_low_date TEXT,
                    all_time_high REAL,
                    all_time_high_date TEXT,
                    CHECK (id = 1)
                );

                CREATE TABLE IF NOT EXISTS GPM_battery_stats (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    energy_today_wh REAL DEFAULT 0.0,
                    energy_week_wh REAL DEFAULT 0.0,
                    energy_month_wh REAL DEFAULT 0.0,
                    current_day INTEGER,
                    current_week INTEGER,
                    current_month INTEGER,
                    CHECK (id = 1)
                );

                CREATE TABLE IF NOT EXISTS GPM_battery_totals (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    today_kwh REAL DEFAULT 0.0,
                    week_kwh REAL DEFAULT 0.0,
                    month_kwh REAL DEFAULT 0.0,
                    CHECK (id = 1)
                );

                CREATE TABLE IF NOT EXISTS GPM_current_price (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    timestamp TEXT NOT NULL,
                    spot_price_net REAL,
                    spot_price_gross REAL,
                    total_price REAL,
                    price_next_hour REAL,
                    is_cheap INTEGER DEFAULT 0,
                    average_today REAL,
                    cheapest_today REAL,
                    most_expensive_today REAL,
                    country TEXT,
                    last_updated TEXT NOT NULL,
                    CHECK (id = 1)
                );
                """)
                await self._connection.commit()
                _LOGGER.info("GPM tables ensured successfully")
            except Exception as err:
                await self._rollback_after_failed_write()
                _LOGGER.error("Failed to create GPM tables: %s", err)
                raise

    async def close(self) -> None:
        """Close database connection. @zara"""
        if self._connection is not None:
            try:
                await self._connection.close()
                _LOGGER.info("Database connection closed")
            except Exception as err:
                _LOGGER.error("Error closing database connection: %s", err)
            finally:
                self._connection = None
                self._is_connected = False

    async def execute(self, query: str, params: tuple | list | None = None):
        """Execute a query and return cursor. @zara"""
        if not self.is_connected:
            raise RuntimeError("Database not connected")

        if params is None:
            params = []

        return self._connection.execute(query, params)

    async def get_connection(self) -> aiosqlite.Connection:
        """Get the active database connection. @zara"""
        if not self.is_connected:
            raise RuntimeError("Database not connected")
        return self._connection

    async def _ensure_connected(self) -> bool:
        """Verify connection is alive, reconnect if needed. @zara"""
        if self._connection is not None:
            try:
                await self._connection.execute("SELECT 1")
                return True
            except Exception:
                _LOGGER.warning("Database connection lost, attempting reconnect")
                self._connection = None
                self._is_connected = False

        return await self.connect()

    async def execute_read(self, query: str, params: tuple | list | None = None) -> list[aiosqlite.Row]:
        """Execute a read query with retry on lock and auto-reconnect. @zara"""
        if params is None:
            params = []

        for attempt in range(3):
            if not await self._ensure_connected():
                raise RuntimeError("Database not available")
            try:
                async with self._connection.execute(query, params) as cursor:
                    return await cursor.fetchall()
            except aiosqlite.OperationalError as err:
                if "database is locked" in str(err) and attempt < 2:
                    wait = (0.1 * (3 ** attempt)) + random.uniform(0, 0.05)
                    _LOGGER.warning(
                        "Stats DB locked on read (attempt %d/3), retrying in %.2fs",
                        attempt + 1, wait
                    )
                    await asyncio.sleep(wait)
                    continue
                if attempt == 0:
                    _LOGGER.warning("Read query failed (attempt 1), reconnecting: %s", err)
                    self._connection = None
                    self._is_connected = False
                    continue
                raise

    @staticmethod
    def _is_locked_error(err: BaseException) -> bool:
        err_str = str(err).lower()
        return "database is locked" in err_str or "database is busy" in err_str

    @staticmethod
    def _retry_wait(attempt: int) -> float:
        return (0.1 * (3 ** attempt)) + random.uniform(0, 0.05)

    async def _rollback_after_failed_write(self) -> None:
        if self._connection is None:
            return
        try:
            await self._connection.rollback()
        except Exception as rollback_err:
            _LOGGER.debug(
                "Stats DB rollback after failed write did not complete: %s", rollback_err
            )

    async def execute_write(self, query: str, params: tuple | list | None = None) -> None:
        """Execute a serialized write query with retry, auto-commit and auto-reconnect. @zara"""
        if params is None:
            params = []

        async with self._write_lock:
            for attempt in range(3):
                if not await self._ensure_connected():
                    raise RuntimeError("Database not available")
                try:
                    await self._connection.execute(query, params)
                    await self._connection.commit()
                    return
                except aiosqlite.OperationalError as err:
                    if self._is_locked_error(err):
                        await self._rollback_after_failed_write()
                        if attempt < 2:
                            wait = self._retry_wait(attempt)
                            _LOGGER.debug(
                                "Stats DB locked on write (attempt %d/3), retrying in %.2fs",
                                attempt + 1, wait
                            )
                            await asyncio.sleep(wait)
                            continue
                        _LOGGER.warning("Stats DB write failed after 3 lock attempts: %s", err)
                        raise
                    if attempt == 0:
                        await self._rollback_after_failed_write()
                        _LOGGER.warning("Write query failed (attempt 1), reconnecting: %s", err)
                        self._connection = None
                        self._is_connected = False
                        continue
                    await self._rollback_after_failed_write()
                    raise

    @asynccontextmanager
    async def write_transaction(self) -> AsyncIterator[aiosqlite.Connection]:
        """Run a multi-statement write under the shared writer lock."""
        async with self._write_lock:
            for attempt in range(3):
                if not await self._ensure_connected():
                    raise RuntimeError("Database not available")
                try:
                    await self._connection.execute("BEGIN IMMEDIATE")
                    break
                except aiosqlite.OperationalError as err:
                    await self._rollback_after_failed_write()
                    if self._is_locked_error(err) and attempt < 2:
                        wait = self._retry_wait(attempt)
                        _LOGGER.debug(
                            "Stats DB locked when opening write transaction (attempt %d/3), retrying in %.2fs",
                            attempt + 1, wait
                        )
                        await asyncio.sleep(wait)
                        continue
                    if attempt == 0 and not self._is_locked_error(err):
                        _LOGGER.warning("Write transaction failed to open, reconnecting: %s", err)
                        self._connection = None
                        self._is_connected = False
                        continue
                    raise
            else:
                raise RuntimeError("Database write transaction could not be opened")

            try:
                yield self._connection
                await self._connection.commit()
            except Exception:
                await self._rollback_after_failed_write()
                raise

    @classmethod
    @asynccontextmanager
    async def connect_direct_safe(
        cls, db_path: Path, hass: HomeAssistant | None = None
    ) -> AsyncIterator[aiosqlite.Connection]:
        """Establish a direct, robust SQLite connection with safe defaults. @zara"""
        conn = await aiosqlite.connect(
            str(db_path), timeout=60.0, isolation_level="IMMEDIATE"
        )
        try:
            await cls._configure_connection(conn, hass)
            yield conn
        finally:
            await conn.close()

    @asynccontextmanager
    async def get_connection_ctx(self) -> AsyncIterator[aiosqlite.Connection]:
        """Context manager for multi-statement operations. @zara"""
        if not await self._ensure_connected():
            raise RuntimeError("Database not available")
        yield self._connection
