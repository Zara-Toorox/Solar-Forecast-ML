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
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING, AsyncIterator

import aiosqlite

from ..const import SOLAR_FORECAST_DB

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

from ..utils.time_utils import naive_ha_local

_LOGGER = logging.getLogger(__name__)

STATS_SCHEMA_VERSION = 1

# STATS owns only these tables.  Tables from SFML and GPM deliberately do not
# appear here: they are consumed through their published database contracts.
_STATS_TABLES: dict[str, str] = {
    "stats_schema_meta": """CREATE TABLE IF NOT EXISTS stats_schema_meta (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    "stats_daily_energy": """CREATE TABLE IF NOT EXISTS stats_daily_energy (
        date TEXT PRIMARY KEY, solar_yield_kwh REAL DEFAULT 0, grid_import_kwh REAL DEFAULT 0,
        grid_export_kwh REAL DEFAULT 0, solar_to_house_kwh REAL DEFAULT 0,
        solar_to_battery_kwh REAL DEFAULT 0, battery_to_house_kwh REAL DEFAULT 0,
        battery_charge_solar_kwh REAL DEFAULT 0, battery_charge_grid_kwh REAL DEFAULT 0,
        grid_to_house_kwh REAL DEFAULT 0, grid_to_battery_kwh REAL DEFAULT 0,
        home_consumption_kwh REAL DEFAULT 0, smartmeter_import_kwh REAL DEFAULT 0,
        smartmeter_export_kwh REAL DEFAULT 0, consumer_heatpump_kwh REAL DEFAULT 0,
        consumer_heatingrod_kwh REAL DEFAULT 0, consumer_wallbox_kwh REAL DEFAULT 0,
        inverter_ac_output_kwh REAL, battery_charge_dc_kwh REAL, battery_discharge_dc_kwh REAL,
        grid_import_extra_kwh REAL DEFAULT 0, price_ct_kwh REAL, autarkie_percent REAL,
        self_consumption_kwh REAL, peak_solar_w REAL DEFAULT 0, peak_solar_time TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    "stats_hourly_billing": """CREATE TABLE IF NOT EXISTS stats_hourly_billing (
        hour_key TEXT PRIMARY KEY, date TEXT NOT NULL, hour INTEGER NOT NULL,
        grid_import_kwh REAL DEFAULT 0, grid_import_cost_ct REAL DEFAULT 0,
        grid_export_kwh REAL DEFAULT 0, feed_in_revenue_ct REAL DEFAULT 0,
        feed_in_tariff_ct REAL DEFAULT 0, price_ct_kwh REAL DEFAULT 0,
        grid_to_house_kwh REAL DEFAULT 0, grid_to_battery_kwh REAL DEFAULT 0,
        solar_yield_kwh REAL DEFAULT 0, solar_to_house_kwh REAL DEFAULT 0,
        solar_to_battery_kwh REAL DEFAULT 0, battery_to_house_kwh REAL DEFAULT 0,
        home_consumption_kwh REAL DEFAULT 0, consumer_heatpump_kwh REAL DEFAULT 0,
        consumer_heatpump_cost_ct REAL DEFAULT 0, consumer_heatingrod_kwh REAL DEFAULT 0,
        consumer_heatingrod_cost_ct REAL DEFAULT 0, consumer_wallbox_kwh REAL DEFAULT 0,
        consumer_wallbox_cost_ct REAL DEFAULT 0, battery_soc_min REAL,
        battery_soc_avg REAL, battery_soc_max REAL, battery_soc_end REAL,
        data_source TEXT DEFAULT 'aggregator')""",
    "stats_power_sources": """CREATE TABLE IF NOT EXISTS stats_power_sources (
        timestamp TEXT PRIMARY KEY, date TEXT NOT NULL, hour INTEGER NOT NULL,
        solar_power_w REAL, inverter_ac_output_w REAL, battery_power_dc_w REAL,
        house_consumption_w REAL, solar_to_house_w REAL, solar_to_battery_w REAL,
        solar_to_grid_w REAL, battery_to_house_w REAL, grid_to_house_w REAL,
        grid_to_battery_w REAL, battery_soc REAL)""",
    "stats_consumer_atlas_config": """CREATE TABLE IF NOT EXISTS stats_consumer_atlas_config (
        consumer_id TEXT PRIMARY KEY, name TEXT NOT NULL, entity_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'other', icon TEXT NOT NULL DEFAULT 'plug',
        color TEXT NOT NULL DEFAULT '#06b6d4', start_kwh REAL NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP)""",
    "stats_consumer_atlas_daily": """CREATE TABLE IF NOT EXISTS stats_consumer_atlas_daily (
        date TEXT NOT NULL, consumer_id TEXT NOT NULL, kwh REAL NOT NULL DEFAULT 0,
        peak_w REAL NOT NULL DEFAULT 0, peak_time TEXT, last_power_w REAL NOT NULL DEFAULT 0,
        samples INTEGER NOT NULL DEFAULT 0, updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(date, consumer_id))""",
    "stats_energy_efficiency_daily": """CREATE TABLE IF NOT EXISTS stats_energy_efficiency_daily (
        date TEXT PRIMARY KEY, solar_dc_input_kwh REAL, inverter_ac_output_kwh REAL,
        battery_charge_dc_kwh REAL, battery_discharge_dc_kwh REAL,
        pv_dc_sample_kwh REAL NOT NULL DEFAULT 0, pv_ac_sample_kwh REAL NOT NULL DEFAULT 0,
        battery_dc_sample_kwh REAL NOT NULL DEFAULT 0, battery_ac_sample_kwh REAL NOT NULL DEFAULT 0,
        mixed_dc_sample_kwh REAL NOT NULL DEFAULT 0, mixed_ac_sample_kwh REAL NOT NULL DEFAULT 0,
        system_input_sample_kwh REAL NOT NULL DEFAULT 0, system_output_sample_kwh REAL NOT NULL DEFAULT 0,
        inverter_efficiency_percent REAL, battery_discharge_efficiency_percent REAL,
        mixed_efficiency_percent REAL, system_efficiency_percent REAL,
        ac_measurement_seconds REAL NOT NULL DEFAULT 0, battery_measurement_seconds REAL NOT NULL DEFAULT 0,
        pv_sample_seconds REAL NOT NULL DEFAULT 0, battery_sample_seconds REAL NOT NULL DEFAULT 0,
        mixed_sample_seconds REAL NOT NULL DEFAULT 0, system_sample_seconds REAL NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'live', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    "stats_energy_efficiency_meta": """CREATE TABLE IF NOT EXISTS stats_energy_efficiency_meta (
        key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    "stats_settings": """CREATE TABLE IF NOT EXISTS stats_settings (
        key TEXT PRIMARY KEY, value TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
    "stats_forecast_comparison": """CREATE TABLE IF NOT EXISTS stats_forecast_comparison (
        date TEXT PRIMARY KEY, actual_kwh REAL, sfml_forecast_kwh REAL,
        sfml_accuracy_percent REAL, external_1_kwh REAL, external_1_accuracy_percent REAL,
        external_2_kwh REAL, external_2_accuracy_percent REAL, best_source TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
}

_REQUIRED_COLUMNS: dict[str, dict[str, str]] = {
    "stats_daily_energy": {"grid_to_battery_kwh": "REAL DEFAULT 0", "smartmeter_import_kwh": "REAL DEFAULT 0", "smartmeter_export_kwh": "REAL DEFAULT 0", "consumer_heatpump_kwh": "REAL DEFAULT 0", "consumer_heatingrod_kwh": "REAL DEFAULT 0", "consumer_wallbox_kwh": "REAL DEFAULT 0", "inverter_ac_output_kwh": "REAL", "battery_charge_dc_kwh": "REAL", "battery_discharge_dc_kwh": "REAL", "grid_import_extra_kwh": "REAL DEFAULT 0", "peak_solar_w": "REAL DEFAULT 0", "peak_solar_time": "TEXT"},
    "stats_power_sources": {"battery_soc": "REAL", "inverter_ac_output_w": "REAL", "battery_power_dc_w": "REAL"},
    "stats_hourly_billing": {"feed_in_revenue_ct": "REAL DEFAULT 0", "feed_in_tariff_ct": "REAL DEFAULT 0", "consumer_heatpump_kwh": "REAL DEFAULT 0", "consumer_heatpump_cost_ct": "REAL DEFAULT 0", "consumer_heatingrod_kwh": "REAL DEFAULT 0", "consumer_heatingrod_cost_ct": "REAL DEFAULT 0", "consumer_wallbox_kwh": "REAL DEFAULT 0", "consumer_wallbox_cost_ct": "REAL DEFAULT 0"},
    "stats_consumer_atlas_config": {"start_kwh": "REAL NOT NULL DEFAULT 0"},
    "stats_energy_efficiency_daily": {"mixed_dc_sample_kwh": "REAL NOT NULL DEFAULT 0", "mixed_ac_sample_kwh": "REAL NOT NULL DEFAULT 0", "mixed_efficiency_percent": "REAL", "mixed_sample_seconds": "REAL NOT NULL DEFAULT 0", "system_sample_seconds": "REAL NOT NULL DEFAULT 0"},
}

_STATS_INDEXES: dict[str, str] = {
    "idx_stats_hourly_billing_date_hour": "CREATE INDEX IF NOT EXISTS idx_stats_hourly_billing_date_hour ON stats_hourly_billing(date, hour)",
    "idx_stats_power_sources_date_timestamp": "CREATE INDEX IF NOT EXISTS idx_stats_power_sources_date_timestamp ON stats_power_sources(date, timestamp)",
    "idx_stats_consumer_atlas_daily_date": "CREATE INDEX IF NOT EXISTS idx_stats_consumer_atlas_daily_date ON stats_consumer_atlas_daily(date)",
    "idx_stats_forecast_comparison_date": "CREATE INDEX IF NOT EXISTS idx_stats_forecast_comparison_date ON stats_forecast_comparison(date)",
}


def _canonical_index_contract() -> dict[str, tuple[str, tuple[str, ...]]]:
    connection = sqlite3.connect(":memory:")
    try:
        for ddl in _STATS_TABLES.values():
            connection.execute(ddl)
        result: dict[str, tuple[str, tuple[str, ...]]] = {}
        for name, ddl in _STATS_INDEXES.items():
            connection.execute(ddl)
            table = connection.execute(
                "SELECT tbl_name FROM sqlite_master WHERE type = 'index' AND name = ?", (name,)
            ).fetchone()[0]
            columns = tuple(
                row[2] for row in connection.execute(f"PRAGMA index_info({name})")
            )
            result[name] = (table, columns)
        return result
    finally:
        connection.close()

# Historical STATS ownership records mention this table, but no active canonical
# source reads or writes it. It is deliberately retired rather than recreated.
_RETIRED_STATS_TABLES = {"stats_billing_totals"}

_SFML_CORE_TABLES = ("daily_summaries", "daily_forecasts", "hourly_predictions")
_OWNED_TABLE_CONTRACT: dict[str, dict[str, tuple[str, int]]] = {
    "stats_schema_meta": {"key": ("TEXT", 1), "value": ("TEXT", 0)},
    "stats_daily_energy": {"date": ("TEXT", 1), "solar_yield_kwh": ("REAL", 0), "peak_solar_w": ("REAL", 0)},
    "stats_hourly_billing": {"hour_key": ("TEXT", 1), "date": ("TEXT", 0), "hour": ("INTEGER", 0)},
    "stats_power_sources": {"timestamp": ("TEXT", 1), "date": ("TEXT", 0), "hour": ("INTEGER", 0)},
    "stats_consumer_atlas_config": {"consumer_id": ("TEXT", 1), "name": ("TEXT", 0), "entity_id": ("TEXT", 0)},
    "stats_consumer_atlas_daily": {"date": ("TEXT", 1), "consumer_id": ("TEXT", 2)},
    "stats_energy_efficiency_daily": {"date": ("TEXT", 1)},
    "stats_energy_efficiency_meta": {"key": ("TEXT", 1), "value": ("TEXT", 0)},
    "stats_settings": {"key": ("TEXT", 1), "value": ("TEXT", 0)},
    "stats_forecast_comparison": {"date": ("TEXT", 1), "actual_kwh": ("REAL", 0), "sfml_forecast_kwh": ("REAL", 0)},
}

# Full type contract for owned data. Extra legacy columns are intentionally
# tolerated; absent primary-key columns cannot be added safely and therefore
# fail closed through the PK contract below.
_OWNED_TABLE_CONTRACT.update({
    "stats_schema_meta": {"key": ("TEXT", 1), "value": ("TEXT", 0), "updated_at": ("TEXT", 0)},
    "stats_daily_energy": {"date": ("TEXT", 1), "solar_yield_kwh": ("REAL", 0), "grid_import_kwh": ("REAL", 0), "grid_export_kwh": ("REAL", 0), "solar_to_house_kwh": ("REAL", 0), "solar_to_battery_kwh": ("REAL", 0), "battery_to_house_kwh": ("REAL", 0), "grid_to_house_kwh": ("REAL", 0), "grid_to_battery_kwh": ("REAL", 0), "home_consumption_kwh": ("REAL", 0), "smartmeter_import_kwh": ("REAL", 0), "smartmeter_export_kwh": ("REAL", 0), "consumer_heatpump_kwh": ("REAL", 0), "consumer_heatingrod_kwh": ("REAL", 0), "consumer_wallbox_kwh": ("REAL", 0), "inverter_ac_output_kwh": ("REAL", 0), "battery_charge_dc_kwh": ("REAL", 0), "battery_discharge_dc_kwh": ("REAL", 0), "grid_import_extra_kwh": ("REAL", 0), "price_ct_kwh": ("REAL", 0), "autarkie_percent": ("REAL", 0), "self_consumption_kwh": ("REAL", 0), "peak_solar_w": ("REAL", 0), "peak_solar_time": ("TEXT", 0), "updated_at": ("TEXT", 0)},
    "stats_hourly_billing": {"hour_key": ("TEXT", 1), "date": ("TEXT", 0), "hour": ("INTEGER", 0), "grid_import_kwh": ("REAL", 0), "grid_import_cost_ct": ("REAL", 0), "grid_export_kwh": ("REAL", 0), "feed_in_revenue_ct": ("REAL", 0), "feed_in_tariff_ct": ("REAL", 0), "price_ct_kwh": ("REAL", 0), "grid_to_house_kwh": ("REAL", 0), "grid_to_battery_kwh": ("REAL", 0), "solar_yield_kwh": ("REAL", 0), "solar_to_house_kwh": ("REAL", 0), "solar_to_battery_kwh": ("REAL", 0), "battery_to_house_kwh": ("REAL", 0), "home_consumption_kwh": ("REAL", 0), "consumer_heatpump_kwh": ("REAL", 0), "consumer_heatpump_cost_ct": ("REAL", 0), "consumer_heatingrod_kwh": ("REAL", 0), "consumer_heatingrod_cost_ct": ("REAL", 0), "consumer_wallbox_kwh": ("REAL", 0), "consumer_wallbox_cost_ct": ("REAL", 0), "battery_soc_min": ("REAL", 0), "battery_soc_avg": ("REAL", 0), "battery_soc_max": ("REAL", 0), "battery_soc_end": ("REAL", 0), "data_source": ("TEXT", 0)},
    "stats_power_sources": {"timestamp": ("TEXT", 1), "date": ("TEXT", 0), "hour": ("INTEGER", 0), "solar_power_w": ("REAL", 0), "inverter_ac_output_w": ("REAL", 0), "battery_power_dc_w": ("REAL", 0), "house_consumption_w": ("REAL", 0), "solar_to_house_w": ("REAL", 0), "solar_to_battery_w": ("REAL", 0), "solar_to_grid_w": ("REAL", 0), "battery_to_house_w": ("REAL", 0), "grid_to_house_w": ("REAL", 0), "grid_to_battery_w": ("REAL", 0), "battery_soc": ("REAL", 0)},
    "stats_consumer_atlas_config": {"consumer_id": ("TEXT", 1), "name": ("TEXT", 0), "entity_id": ("TEXT", 0), "category": ("TEXT", 0), "icon": ("TEXT", 0), "color": ("TEXT", 0), "start_kwh": ("REAL", 0), "enabled": ("INTEGER", 0), "sort_order": ("INTEGER", 0), "created_at": ("TEXT", 0), "updated_at": ("TEXT", 0)},
    "stats_consumer_atlas_daily": {"date": ("TEXT", 1), "consumer_id": ("TEXT", 2), "kwh": ("REAL", 0), "peak_w": ("REAL", 0), "peak_time": ("TEXT", 0), "last_power_w": ("REAL", 0), "samples": ("INTEGER", 0), "updated_at": ("TEXT", 0)},
    "stats_energy_efficiency_daily": {"date": ("TEXT", 1), "solar_dc_input_kwh": ("REAL", 0), "inverter_ac_output_kwh": ("REAL", 0), "battery_charge_dc_kwh": ("REAL", 0), "battery_discharge_dc_kwh": ("REAL", 0), "pv_dc_sample_kwh": ("REAL", 0), "pv_ac_sample_kwh": ("REAL", 0), "battery_dc_sample_kwh": ("REAL", 0), "battery_ac_sample_kwh": ("REAL", 0), "mixed_dc_sample_kwh": ("REAL", 0), "mixed_ac_sample_kwh": ("REAL", 0), "system_input_sample_kwh": ("REAL", 0), "system_output_sample_kwh": ("REAL", 0), "inverter_efficiency_percent": ("REAL", 0), "battery_discharge_efficiency_percent": ("REAL", 0), "mixed_efficiency_percent": ("REAL", 0), "system_efficiency_percent": ("REAL", 0), "ac_measurement_seconds": ("REAL", 0), "battery_measurement_seconds": ("REAL", 0), "pv_sample_seconds": ("REAL", 0), "battery_sample_seconds": ("REAL", 0), "mixed_sample_seconds": ("REAL", 0), "system_sample_seconds": ("REAL", 0), "source": ("TEXT", 0), "updated_at": ("TEXT", 0)},
    "stats_energy_efficiency_meta": {"key": ("TEXT", 1), "value": ("TEXT", 0), "updated_at": ("TEXT", 0)},
    "stats_settings": {"key": ("TEXT", 1), "value": ("TEXT", 0), "updated_at": ("TEXT", 0)},
    "stats_forecast_comparison": {"date": ("TEXT", 1), "actual_kwh": ("REAL", 0), "sfml_forecast_kwh": ("REAL", 0), "sfml_accuracy_percent": ("REAL", 0), "external_1_kwh": ("REAL", 0), "external_1_accuracy_percent": ("REAL", 0), "external_2_kwh": ("REAL", 0), "external_2_accuracy_percent": ("REAL", 0), "best_source": ("TEXT", 0), "created_at": ("TEXT", 0), "updated_at": ("TEXT", 0)},
})

for _table_name, _contract_columns in _OWNED_TABLE_CONTRACT.items():
    _additions = _REQUIRED_COLUMNS.setdefault(_table_name, {})
    for _column_name, (_column_type, _primary_key) in _contract_columns.items():
        if not _primary_key:
            _additions.setdefault(_column_name, _column_type)


def _canonical_pragma_contract() -> dict[str, dict[str, tuple[str, int, str | None, int]]]:
    """Derive the exact SQLite contract from the canonical create statements."""
    connection = sqlite3.connect(":memory:")
    try:
        result: dict[str, dict[str, tuple[str, int, str | None, int]]] = {}
        for table, ddl in _STATS_TABLES.items():
            connection.execute(ddl)
            result[table] = {
                str(row[1]): (str(row[2]).upper(), int(row[3]), row[4], int(row[5]))
                for row in connection.execute(f"PRAGMA table_info({table})")
            }
        return result
    finally:
        connection.close()


_CANONICAL_TABLE_CONTRACT = _canonical_pragma_contract()
_LEGACY_LOGICAL_KEYS = {
    "stats_daily_energy": "date",
    "stats_hourly_billing": "hour_key",
    "stats_forecast_comparison": "date",
    "stats_consumer_atlas_config": "consumer_id",
    "stats_energy_efficiency_daily": "date",
    "stats_energy_efficiency_meta": "key",
    "stats_settings": "key",
}
_LEGACY_NONADDABLE_REQUIRED = {
    # Collector UPSERT explicitly writes both timestamps; SQLite cannot add
    # these CURRENT_TIMESTAMP defaults to a populated legacy table safely.
    "stats_forecast_comparison": {"created_at", "updated_at"},
}
_LEGACY_RUNTIME_COLUMNS = {
    "stats_power_sources": {"timestamp", "date", "hour"},
}


def _sqlite_affinity(declared_type: str) -> str:
    value = declared_type.upper()
    if "INT" in value:
        return "INTEGER"
    if any(token in value for token in ("CHAR", "CLOB", "TEXT")):
        return "TEXT"
    if "BLOB" in value or not value:
        return "BLOB"
    if any(token in value for token in ("REAL", "FLOA", "DOUB")):
        return "REAL"
    return "NUMERIC"


def _compatible_affinity(observed_type: str, expected_type: str) -> bool:
    if _sqlite_affinity(observed_type) == _sqlite_affinity(expected_type):
        return True
    return (
        _sqlite_affinity(expected_type) == "TEXT"
        and _sqlite_affinity(observed_type) == "NUMERIC"
        and any(token in observed_type.upper() for token in ("TIMESTAMP", "DATETIME"))
    )
_CANONICAL_INDEX_CONTRACT = _canonical_index_contract()


def _compatible_add_column_definition(
    column: tuple[str, int, str | None, int],
) -> str | None:
    """Return a lossless SQLite ALTER definition, or None when migration is unsafe."""
    column_type, not_null, default, primary_key = column
    if primary_key or (not_null and (default is None or "CURRENT_" in default.upper())):
        return None
    parts = [column_type]
    if not_null:
        parts.append("NOT NULL")
    if default is not None:
        parts.append(f"DEFAULT {default}")
    return " ".join(parts)


_REQUIRED_COLUMNS = {
    table: {
        column: definition
        for column, contract in columns.items()
        if (definition := _compatible_add_column_definition(contract)) is not None
    }
    for table, columns in _CANONICAL_TABLE_CONTRACT.items()
}


class StatsSchemaIncompatibleError(RuntimeError):
    """Raised when a STATS-owned table cannot satisfy its compatibility contract."""


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

    async def close(self) -> None:
        """Close the active database connection."""
        if self._connection is not None:
            try:
                await self._connection.close()
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

    @staticmethod
    async def _table_columns(conn: aiosqlite.Connection, table: str) -> dict[str, str]:
        async with conn.execute(f"PRAGMA table_info({table})") as cursor:
            rows = await cursor.fetchall()
        return {str(row[1]): str(row[2]).upper() for row in rows}

    @staticmethod
    async def _table_contract(
        conn: aiosqlite.Connection, table: str
    ) -> dict[str, tuple[str, int, str | None, int]]:
        async with conn.execute(f"PRAGMA table_info({table})") as cursor:
            rows = await cursor.fetchall()
        return {
            str(row[1]): (str(row[2]).upper(), int(row[3]), row[4], int(row[5]))
            for row in rows
        }

    @staticmethod
    async def _has_unique_column(
        conn: aiosqlite.Connection, table: str, column: str, contract: dict[str, tuple[str, int, str | None, int]]
    ) -> bool:
        if contract.get(column, ("", 0, None, 0))[3]:
            return True
        async with conn.execute(f"PRAGMA index_list({table})") as cursor:
            indexes = await cursor.fetchall()
        for index in indexes:
            if not index[2]:
                continue
            async with conn.execute(f"PRAGMA index_info({index[1]})") as cursor:
                columns = tuple(row[2] for row in await cursor.fetchall())
            if columns == (column,):
                return True
        return False

    async def async_bootstrap_stats_schema(self) -> None:
        """Create and migrate the STATS-owned schema under the single writer lock.

        This gate is intentionally invoked during integration startup.  Runtime
        collectors only consume the contract and never perform opportunistic DDL.
        """
        async with self.write_transaction() as conn:
            async with conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ) as cursor:
                existing_tables = {row[0] for row in await cursor.fetchall()}
            missing_core = set(_SFML_CORE_TABLES) - existing_tables
            if missing_core:
                raise StatsSchemaIncompatibleError(
                    f"SFML core schema unavailable: {', '.join(sorted(missing_core))}"
                )
            legacy_tables = set(_STATS_TABLES) & existing_tables
            for ddl in _STATS_TABLES.values():
                await conn.execute(ddl)

            for table, additions in _REQUIRED_COLUMNS.items():
                columns = await self._table_columns(conn, table)
                for name, definition in additions.items():
                    if name not in columns:
                        await conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
                    elif columns[name] != definition.split()[0]:
                        raise StatsSchemaIncompatibleError(
                            f"{table}.{name} is {columns[name]}, expected {definition.split()[0]}"
                        )

            power_contract = await self._table_contract(conn, "stats_power_sources")
            if not await self._has_unique_column(
                conn, "stats_power_sources", "timestamp", power_contract
            ):
                try:
                    await conn.execute(
                        "CREATE UNIQUE INDEX idx_stats_power_sources_timestamp_unique "
                        "ON stats_power_sources(timestamp)"
                    )
                except aiosqlite.IntegrityError as err:
                    raise StatsSchemaIncompatibleError(
                        "stats_power_sources.timestamp contains duplicates; unique migration is unsafe"
                    ) from err

            for ddl in _STATS_INDEXES.values():
                await conn.execute(ddl)

            for name, (table, expected_columns) in _CANONICAL_INDEX_CONTRACT.items():
                async with conn.execute(f"PRAGMA index_info({name})") as cursor:
                    columns = tuple(row[2] for row in await cursor.fetchall())
                if columns != expected_columns:
                    raise StatsSchemaIncompatibleError(
                        f"{name} is incompatible on {table}: {columns}, expected {expected_columns}"
                    )

            for table, ddl in _STATS_TABLES.items():
                columns = await self._table_columns(conn, table)
                if not columns:
                    raise StatsSchemaIncompatibleError(f"STATS schema table unavailable: {table}")

            for table, required in _CANONICAL_TABLE_CONTRACT.items():
                actual = await self._table_contract(conn, table)
                required_columns = required if table not in legacy_tables else {
                    column: required[column] for column in _REQUIRED_COLUMNS[table]
                }
                logical_key = _LEGACY_LOGICAL_KEYS.get(table)
                if logical_key:
                    required_columns[logical_key] = required[logical_key]
                for column in _LEGACY_NONADDABLE_REQUIRED.get(table, set()):
                    required_columns[column] = required[column]
                for column in _LEGACY_RUNTIME_COLUMNS.get(table, set()):
                    required_columns[column] = required[column]
                for column, expected in required_columns.items():
                    observed = actual.get(column)
                    if observed is None or not _compatible_affinity(observed[0], expected[0]):
                        raise StatsSchemaIncompatibleError(
                            f"{table}.{column} is {observed}, expected compatible {expected}"
                        )
                if logical_key and not await self._has_unique_column(conn, table, logical_key, actual):
                    raise StatsSchemaIncompatibleError(
                        f"{table}.{logical_key} requires a primary key or single-column UNIQUE constraint"
                    )

            schema_columns = await self._table_columns(conn, "stats_schema_meta")
            if "key" not in schema_columns or "value" not in schema_columns:
                raise StatsSchemaIncompatibleError("stats_schema_meta has an incompatible layout")
            await conn.execute(
                """INSERT INTO stats_schema_meta (key, value, updated_at)
                   VALUES ('schema_version', ?, CURRENT_TIMESTAMP)
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value,
                                                 updated_at = excluded.updated_at
                   WHERE value <> excluded.value""",
                (str(STATS_SCHEMA_VERSION),),
            )

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
