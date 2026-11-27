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
from datetime import datetime
from pathlib import Path
import aiosqlite

_LOGGER = logging.getLogger(__name__)

# An open write transaction blocks every other writer of the shared database.
_OPEN_TRANSACTION_WARN_SECONDS = 60.0
_LOCK_RETRIES = 3


class _TransactionOwner:
    """Task that opened the write transaction on the shared connection."""

    __slots__ = ("task", "task_name", "since", "started", "handle")

    def __init__(self, task: asyncio.Task | None, started: float) -> None:
        self.task = task
        self.task_name = task.get_name() if task is not None else "none"
        self.since = datetime.now().astimezone().isoformat(timespec="seconds")
        self.started = started
        self.handle: asyncio.TimerHandle | None = None


async def _await_to_end(awaitable) -> tuple[asyncio.Future, bool]:
    """Wait until ``awaitable`` finished, even when the caller is cancelled meanwhile.

    Returns the finished future and whether the caller was cancelled.
    """
    task = asyncio.ensure_future(awaitable)
    cancelled = False
    while not task.done():
        try:
            await asyncio.shield(task)
        except asyncio.CancelledError:
            # Remember every cancellation of the caller, also one that arrives
            # just as the task finishes; only a cancelled task itself is not ours.
            if not task.cancelled():
                cancelled = True
        except BaseException:
            pass
    return task, cancelled


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
        self._owner: _TransactionOwner | None = None

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
        """Roll back an open transaction, then close the connection @zara"""
        db = self._db
        if db is None:
            return
        try:
            await self._rollback_to_end()
        finally:
            self._db = None
            await db.close()
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
        """Execute a SQL statement with retry on lock @zara

        With ``auto_commit`` the statement is its own transaction and is rolled
        back on any failure. Without it the caller owns the transaction and ends
        it with ``commit()`` or ``rollback()``.
        """
        async def _do():
            await self._db.execute(sql, parameters)

        await self._write(_do, auto_commit)

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
        *,
        auto_commit: bool = True,
    ) -> int:
        """Execute SQL with multiple parameter sets with retry on lock @zara"""
        async def _do():
            await self._db.executemany(sql, parameters_list)

        await self._write(_do, auto_commit)
        return len(parameters_list)

    async def _write(self, operation, auto_commit: bool) -> None:
        """Run one write statement, alone or inside the caller's transaction."""
        if self._db is None:
            _LOGGER.warning("GPM DB operation skipped: no active connection")
            return
        if not auto_commit:
            self._claim_transaction()
            await self._retry_on_locked(operation)
            return
        for attempt in range(_LOCK_RETRIES + 1):
            try:
                await operation()
                await self._db.commit()
            except BaseException as err:
                owner = self._owner
                if self._owned_by_other_task(owner):
                    # Rolling back would also discard the owner's earlier steps.
                    _LOGGER.warning(
                        "GPM DB statement failed inside the open transaction of task %s: %r",
                        owner.task_name,
                        err,
                    )
                    raise
                joined_own_transaction = owner is not None
                await self._rollback_to_end()
                if (
                    not joined_own_transaction
                    and isinstance(err, Exception)
                    and "database is locked" in str(err)
                    and attempt < _LOCK_RETRIES
                ):
                    wait = (0.1 * (3 ** attempt)) + random.uniform(0, 0.05)
                    _LOGGER.warning(
                        "GPM DB locked (attempt %d/%d), retrying in %.2fs",
                        attempt + 1, _LOCK_RETRIES, wait
                    )
                    await asyncio.sleep(wait)
                    continue
                raise
            # The commit also ended a transaction that was open before.
            self._release_transaction()
            return

    async def commit(self) -> None:
        """Commit current transaction; a failed commit is rolled back @zara"""
        if self._db is None:
            _LOGGER.warning("GPM DB commit skipped: no active connection")
            return
        try:
            await self._db.commit()
        except BaseException:
            await self._rollback_to_end()
            raise
        self._release_transaction()

    async def rollback(self) -> None:
        """Roll back the current transaction, also when the caller is cancelled."""
        await self._rollback_to_end()

    async def _rollback_to_end(self) -> None:
        """Roll back completely; a cancellation of the caller is passed on afterwards."""
        self._release_transaction()
        db = self._db
        if db is None:
            return
        _task, cancelled = await _await_to_end(self._rollback_quietly(db))
        if cancelled:
            raise asyncio.CancelledError

    @staticmethod
    async def _rollback_quietly(db: aiosqlite.Connection) -> None:
        try:
            await db.rollback()
        except Exception as err:
            _LOGGER.warning("GPM DB rollback did not complete: %s", err)

    @staticmethod
    def _owned_by_other_task(owner: _TransactionOwner | None) -> bool:
        """True while another, still running task owns the open transaction."""
        if owner is None or owner.task is None:
            return False
        return owner.task is not asyncio.current_task() and not owner.task.done()

    def _claim_transaction(self) -> None:
        """The task whose statement opens the transaction owns it until it ends."""
        if self._owner is not None:
            return
        owner = _TransactionOwner(
            asyncio.current_task(), asyncio.get_running_loop().time()
        )
        self._owner = owner
        self._watch_transaction(owner)

    def _release_transaction(self) -> None:
        owner = self._owner
        self._owner = None
        if owner is not None and owner.handle is not None:
            owner.handle.cancel()
            owner.handle = None

    def _watch_transaction(self, owner: _TransactionOwner) -> None:
        owner.handle = asyncio.get_running_loop().call_later(
            _OPEN_TRANSACTION_WARN_SECONDS, self._report_open_transaction, owner
        )

    def _report_open_transaction(self, owner: _TransactionOwner) -> None:
        """Warn once while a write transaction stays open."""
        if self._owner is not owner:
            return
        owner.handle = None
        db = self._db
        if db is None:
            return
        try:
            still_open = db.in_transaction
        except Exception:
            return
        if not still_open:
            if owner.task is not None and owner.task.done():
                self._release_transaction()
            else:
                # The opening statement may still wait for the database lock.
                self._watch_transaction(owner)
            return
        elapsed = asyncio.get_running_loop().time() - owner.started
        _LOGGER.warning(
            "GPM DB write transaction still open after %gs (task %s, since %s)",
            round(elapsed, 1),
            owner.task_name,
            owner.since,
        )

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

            -- Feed-in tariff and monthly base fee (append-only, never deleted)
            CREATE TABLE IF NOT EXISTS GPM_fee_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                valid_from_utc TEXT NOT NULL,
                valid_from TEXT NOT NULL,
                feed_in_tariff_ct REAL,
                base_fee_eur_month REAL,
                origin TEXT NOT NULL
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
                "GPM_price_cache_meta",
                "history_backfill_last_run",
                "TEXT",
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
                CREATE TABLE IF NOT EXISTS GPM_fee_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    valid_from_utc TEXT NOT NULL,
                    valid_from TEXT NOT NULL,
                    feed_in_tariff_ct REAL,
                    base_fee_eur_month REAL,
                    origin TEXT NOT NULL
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
            "GPM_price_cache_meta": (
                "tariff_mode",
                "price_revision",
                "history_backfill_last_run",
            ),
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
