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
import random
from pathlib import Path
import aiosqlite

_LOGGER = logging.getLogger(__name__)


class GPMDatabaseConnector:
    """Lightweight SQLite connector for Solar Forecast GPM @zara

    Uses the shared solar_forecast.db with GPM_ prefixed tables.
    """

    def __init__(self, db_path: str) -> None:
        """Initialize the database connector @zara

        Args:
            db_path: Absolute path to the SQLite database file
        """
        self.db_path = db_path
        self._db: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        """Establish database connection and ensure tables exist @zara"""
        database_path = Path(self.db_path)
        if not database_path.is_file():
            raise FileNotFoundError(
                f"Shared SFML database is required and was not found: {database_path}"
            )
        self._db = await aiosqlite.connect(
            self.db_path, timeout=60.0, isolation_level="IMMEDIATE"
        )
        self._db.row_factory = aiosqlite.Row

        # Match SFML PRAGMA settings for shared DB compatibility
        await self._db.execute("PRAGMA foreign_keys = ON")
        await self._db.execute("PRAGMA journal_mode = DELETE")
        await self._db.execute("PRAGMA busy_timeout = 30000")

        await self._ensure_tables()
        _LOGGER.info(
            "GPM database connected: %s", self.db_path
        )

    @property
    def is_connected(self) -> bool:
        """Return True if the database connection is open @zara"""
        return self._db is not None

    async def close(self) -> None:
        """Close database connection @zara"""
        if self._db:
            await self._db.close()
            self._db = None
            _LOGGER.debug("GPM database connection closed")

    async def _retry_on_locked(self, operation, max_retries: int = 3):
        """Retry a DB operation on 'database is locked' with exponential backoff. @zara"""
        if self._db is None:
            _LOGGER.warning("GPM DB operation skipped: no active connection")
            return None
        for attempt in range(max_retries + 1):
            try:
                return await operation()
            except Exception as e:
                if "database is locked" in str(e) and attempt < max_retries:
                    wait = (0.1 * (3 ** attempt)) + random.uniform(0, 0.05)
                    _LOGGER.warning(
                        "GPM DB locked (attempt %d/%d), retrying in %.2fs",
                        attempt + 1, max_retries, wait
                    )
                    await asyncio.sleep(wait)
                else:
                    raise

    async def execute(
        self,
        sql: str,
        parameters: tuple = (),
        auto_commit: bool = True,
    ) -> None:
        """Execute a SQL statement with retry on lock @zara"""
        async def _do():
            await self._db.execute(sql, parameters)
            if auto_commit:
                await self._db.commit()

        await self._retry_on_locked(_do)

    async def fetchone(
        self,
        sql: str,
        parameters: tuple = (),
    ) -> aiosqlite.Row | None:
        """Execute SQL and fetch one row with retry on lock @zara"""
        async def _do():
            async with self._db.execute(sql, parameters) as cursor:
                return await cursor.fetchone()

        return await self._retry_on_locked(_do)

    async def fetchall(
        self,
        sql: str,
        parameters: tuple = (),
    ) -> list[aiosqlite.Row]:
        """Execute SQL and fetch all rows with retry on lock @zara"""
        async def _do():
            async with self._db.execute(sql, parameters) as cursor:
                return await cursor.fetchall()

        return await self._retry_on_locked(_do)

    async def executemany(
        self,
        sql: str,
        parameters_list: list[tuple],
    ) -> int:
        """Execute SQL with multiple parameter sets with retry on lock @zara"""
        async def _do():
            await self._db.executemany(sql, parameters_list)
            await self._db.commit()

        await self._retry_on_locked(_do)
        return len(parameters_list)

    async def commit(self) -> None:
        """Commit current transaction @zara"""
        if self._db is None:
            _LOGGER.warning("GPM DB commit skipped: no active connection")
            return
        await self._db.commit()

    async def rollback(self) -> None:
        """Roll back the current transaction."""
        if self._db is None:
            return
        await self._db.rollback()

    async def _ensure_tables(self) -> None:
        """Create all GPM tables if they don't exist @zara"""
        await self._db.executescript("""
            -- Price cache metadata (single row)
            CREATE TABLE IF NOT EXISTS GPM_price_cache_meta (
                id INTEGER PRIMARY KEY DEFAULT 1,
                last_fetch TEXT,
                valid_until TEXT,
                country TEXT,
                tariff_mode TEXT,
                price_revision INTEGER NOT NULL DEFAULT 0,
                CHECK (id = 1)
            );

            -- Price cache entries
            CREATE TABLE IF NOT EXISTS GPM_price_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL UNIQUE,
                price REAL NOT NULL,
                total_price REAL,
                hour INTEGER NOT NULL,
                price_source TEXT
            );

            -- Price history (2 years retention)
            CREATE TABLE IF NOT EXISTS GPM_price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL UNIQUE,
                price_net REAL NOT NULL,
                total_price REAL,
                hour INTEGER NOT NULL,
                price_source TEXT,
                total_price_raw REAL,
                correction_id INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_gpm_price_history_ts
                ON GPM_price_history(timestamp);

            -- Daily average statistics
            CREATE TABLE IF NOT EXISTS GPM_daily_averages (
                date TEXT PRIMARY KEY,
                average_net REAL NOT NULL,
                average_total REAL NOT NULL,
                min_price REAL,
                max_price REAL
            );

            -- Monthly summary statistics
            CREATE TABLE IF NOT EXISTS GPM_monthly_summaries (
                month TEXT PRIMARY KEY,
                average_price REAL NOT NULL,
                cheap_hours INTEGER NOT NULL DEFAULT 0,
                country TEXT
            );

            -- All-time price extremes (single row)
            CREATE TABLE IF NOT EXISTS GPM_price_extremes (
                id INTEGER PRIMARY KEY DEFAULT 1,
                all_time_low REAL,
                all_time_low_date TEXT,
                all_time_high REAL,
                all_time_high_date TEXT,
                CHECK (id = 1)
            );

            -- Battery tracker statistics (single row, replaces HA Store)
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

            -- Battery totals for statistics display (single row)
            CREATE TABLE IF NOT EXISTS GPM_battery_totals (
                id INTEGER PRIMARY KEY DEFAULT 1,
                today_kwh REAL DEFAULT 0.0,
                week_kwh REAL DEFAULT 0.0,
                month_kwh REAL DEFAULT 0.0,
                CHECK (id = 1)
            );

            -- Current price for external integrations (single row)
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
                tariff_mode TEXT,
                price_revision INTEGER,
                feed_in_tariff_ct REAL,
                base_fee_eur_month REAL,
                is_demo INTEGER NOT NULL DEFAULT 0,
                CHECK (id = 1)
            );

            -- Applied CSV / monthly price corrections
            CREATE TABLE IF NOT EXISTS GPM_price_corrections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK(kind IN ('csv','monthly')),
                status TEXT NOT NULL CHECK(status IN ('applied','reverted','stale')),
                created_at TEXT NOT NULL,
                applied_at TEXT,
                reverted_at TEXT,
                range_from TEXT NOT NULL,
                range_to TEXT NOT NULL,
                month TEXT,
                params_json TEXT NOT NULL,
                summary_json TEXT,
                rows_affected INTEGER NOT NULL DEFAULT 0,
                source_hash TEXT
            );

            -- Configuration backup (single row)
            CREATE TABLE IF NOT EXISTS GPM_config_backup (
                id INTEGER PRIMARY KEY DEFAULT 1,
                backup_time TEXT,
                config_json TEXT,
                CHECK (id = 1)
            );
        """)
        await self._db.commit()

        # Migrate existing tables: add total_price column if missing
        await self._migrate_tables()

        _LOGGER.debug("GPM database tables verified")

    async def _table_columns(self, table: str) -> list[str]:
        """Return column names for an existing table."""
        async with self._db.execute(f"PRAGMA table_info({table})") as cursor:
            return [row[1] for row in await cursor.fetchall()]

    async def _add_column_if_missing(
        self, table: str, column: str, ddl: str
    ) -> None:
        """Add a column when an older GPM schema is missing it."""
        columns = await self._table_columns(table)
        if column in columns:
            return
        await self._db.execute(
            f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"
        )
        _LOGGER.info("Migrated %s: added %s column", table, column)

    async def _migrate_tables(self) -> None:
        """Run schema migrations for existing tables @zara"""
        try:
            await self._add_column_if_missing(
                "GPM_price_history", "total_price", "REAL"
            )
            await self._add_column_if_missing(
                "GPM_price_history", "price_source", "TEXT"
            )
            await self._add_column_if_missing(
                "GPM_price_history", "total_price_raw", "REAL"
            )
            await self._add_column_if_missing(
                "GPM_price_history", "correction_id", "INTEGER"
            )
            await self._add_column_if_missing(
                "GPM_price_cache", "price_source", "TEXT"
            )
            await self._add_column_if_missing(
                "GPM_price_cache_meta", "tariff_mode", "TEXT"
            )
            await self._add_column_if_missing(
                "GPM_price_cache_meta",
                "price_revision",
                "INTEGER NOT NULL DEFAULT 0",
            )
            await self._add_column_if_missing(
                "GPM_current_price", "tariff_mode", "TEXT"
            )
            await self._add_column_if_missing(
                "GPM_current_price", "price_revision", "INTEGER"
            )
            await self._add_column_if_missing(
                "GPM_current_price", "feed_in_tariff_ct", "REAL"
            )
            await self._add_column_if_missing(
                "GPM_current_price", "base_fee_eur_month", "REAL"
            )
            await self._add_column_if_missing(
                "GPM_current_price",
                "is_demo",
                "INTEGER NOT NULL DEFAULT 0",
            )
            await self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS GPM_price_corrections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    kind TEXT NOT NULL CHECK(kind IN ('csv','monthly')),
                    status TEXT NOT NULL CHECK(status IN ('applied','reverted','stale')),
                    created_at TEXT NOT NULL,
                    applied_at TEXT,
                    reverted_at TEXT,
                    range_from TEXT NOT NULL,
                    range_to TEXT NOT NULL,
                    month TEXT,
                    params_json TEXT NOT NULL,
                    summary_json TEXT,
                    rows_affected INTEGER NOT NULL DEFAULT 0,
                    source_hash TEXT
                );
                """
            )
            await self._db.commit()
        except Exception as err:
            _LOGGER.warning("Table migration check failed: %s", err)

    async def require_price_write_schema(self) -> None:
        """Fail closed when required write columns are missing."""
        required = {
            "GPM_price_history": (
                "timestamp",
                "price_net",
                "total_price",
                "hour",
                "price_source",
                "correction_id",
                "total_price_raw",
            ),
            "GPM_price_cache": (
                "timestamp",
                "price",
                "total_price",
                "hour",
                "price_source",
            ),
            "GPM_price_cache_meta": ("tariff_mode", "price_revision"),
            "GPM_current_price": (
                "tariff_mode",
                "price_revision",
                "is_demo",
                "feed_in_tariff_ct",
                "base_fee_eur_month",
            ),
        }
        missing: list[str] = []
        for table, columns in required.items():
            existing = set(await self._table_columns(table))
            for column in columns:
                if column not in existing:
                    missing.append(f"{table}.{column}")
        if missing:
            raise RuntimeError(
                "GPM price write schema incomplete: " + ", ".join(missing)
            )
