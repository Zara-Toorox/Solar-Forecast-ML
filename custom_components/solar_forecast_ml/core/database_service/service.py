"""Central database service implementation for WP03-M."""

from __future__ import annotations

import asyncio
import hashlib
import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from time import monotonic
from types import MappingProxyType
from collections.abc import Awaitable, Callable
from typing import Any, Mapping, TypeVar
from uuid import uuid4

import aiosqlite

from .contracts import (
    DatabaseCapabilities,
    DatabaseHealth,
    DomainLease,
    DomainManifest,
    IdempotencyMode,
    OperationResult,
    OperationSpec,
    SERVICE_API_VERSION,
    SERVICE_VERSION,
    ServiceState,
    Value,
    WritePriority,
)
from .errors import (
    ConstraintViolation,
    DatabaseBusy,
    IdempotencyConflict,
    IntegrityFailure,
    ManifestInvalid,
    ServiceUnavailable,
    TransactionTimeout,
)
from .registry import (
    DomainRegistry,
    bootstrap_registry,
    mark_domain_unregistered,
    persist_manifest,
)
from .writer_queue import WriterQueue

T = TypeVar("T")


class CentralDatabaseService:
    """Own one writer connection and expose registered, scoped operations."""

    api_version = SERVICE_API_VERSION
    service_version = SERVICE_VERSION

    def __init__(
        self,
        database_path: Path,
        *,
        create_database: bool = False,
        bootstrap_schema: bool = False,
        max_queue_size: int = 256,
        max_domain_queue_size: int = 64,
        busy_timeout_ms: int = 30_000,
    ) -> None:
        self._path = database_path.expanduser().resolve(strict=False)
        self._create_database = create_database
        self._bootstrap_schema = bootstrap_schema
        self._max_queue_size = max_queue_size
        self._max_domain_queue_size = max_domain_queue_size
        self._busy_timeout_ms = busy_timeout_ms
        self._connection: aiosqlite.Connection | None = None
        self._queue: WriterQueue | None = None
        self._shared_database_manager: Any | None = None
        self._shared_connection_lease: Any | None = None
        self._registry = DomainRegistry()
        self._state = ServiceState.NEW
        self._lifecycle_lock = asyncio.Lock()
        self._commits = 0
        self._rollbacks = 0
        self._last_error_code: str | None = None
        self._idempotency: dict[tuple[str, str, str], tuple[str, OperationResult]] = {}
        self._idempotency_inflight: dict[tuple[str, str, str], tuple[str, asyncio.Task[OperationResult]]] = {}
        self.database_id = hashlib.sha256(str(self._path).encode()).hexdigest()[:16]

    @property
    def state(self) -> ServiceState:
        return self._state

    @property
    def database_path(self) -> Path:
        return self._path

    @property
    def uses_shared_writer(self) -> bool:
        """Return whether this service delegates writes to the SFML owner."""

        return self._shared_database_manager is not None

    async def attach_database_manager(self, database_manager: Any) -> None:
        """Adopt the legacy SFML writer without opening another connection."""

        async with self._lifecycle_lock:
            manager_path = Path(database_manager.db_path).expanduser().resolve(
                strict=False
            )
            if manager_path != self._path:
                raise ServiceUnavailable("SFML database writer uses a different path")
            if self._state is ServiceState.READY:
                if self._shared_database_manager is database_manager:
                    return
                raise ServiceUnavailable("Database service already owns a writer")
            if self._state not in {
                ServiceState.NEW,
                ServiceState.DATABASE_MISSING,
                ServiceState.STOPPED,
            }:
                raise ServiceUnavailable("Service cannot adopt a writer in its current state")

            lease = await database_manager.acquire_shared_connection_lease()
            connection = lease.connection
            if connection is None:
                await database_manager.release_shared_connection_lease(lease)
                raise ServiceUnavailable("SFML database writer is not connected")
            try:
                self._connection = connection
                self._shared_database_manager = database_manager
                self._shared_connection_lease = lease
                self._queue = WriterQueue(
                    connection,
                    max_size=self._max_queue_size,
                    max_domain_size=self._max_domain_queue_size,
                    busy_timeout_ms=self._busy_timeout_ms,
                    shared_connection=True,
                )
                self._state = ServiceState.READY
            except BaseException:
                self._connection = None
                self._shared_database_manager = None
                self._shared_connection_lease = None
                await database_manager.release_shared_connection_lease(lease)
                raise

    async def detach_database_manager(self, database_manager: Any) -> None:
        """Release an unloaded entry's writer so a reload can attach a new one."""

        async with self._lifecycle_lock:
            if self._shared_database_manager is not database_manager:
                return

            async def cleanup() -> None:
                if self._queue is not None:
                    await self._queue.shutdown(drain=True)
                    self._queue = None
                lease = self._shared_connection_lease
                await database_manager.release_shared_connection_lease(
                    lease, close=True
                )
                self._shared_database_manager = None
                self._shared_connection_lease = None
                self._connection = None
                self._state = ServiceState.NEW

            await self._await_cleanup(cleanup())

    async def start(self) -> None:
        async with self._lifecycle_lock:
            if self._state is ServiceState.READY:
                return
            if self._state not in {
                ServiceState.NEW,
                ServiceState.STOPPED,
                ServiceState.DATABASE_MISSING,
            }:
                raise ServiceUnavailable("Service cannot start from its current state")
            self._state = ServiceState.STARTING
            exists, regular_file = await asyncio.to_thread(self._inspect_path)
            if exists and not regular_file:
                self._state = ServiceState.DEGRADED_READ_ONLY
                raise ServiceUnavailable("Database path is not a regular file")
            if not exists and not self._create_database:
                self._state = ServiceState.DATABASE_MISSING
                return
            if not self._path.parent.is_dir():
                self._state = ServiceState.DATABASE_MISSING
                return
            try:
                self._connection = await aiosqlite.connect(
                    self._path,
                    isolation_level=None,
                    timeout=self._busy_timeout_ms / 1000,
                )
                await self._configure_connection(self._connection)
                if self._bootstrap_schema:
                    await self._connection.execute("BEGIN IMMEDIATE")
                    try:
                        await bootstrap_registry(self._connection)
                        await self._connection.commit()
                    except BaseException:
                        await self._connection.rollback()
                        raise
                await self._assert_integrity(self._connection)
                self._queue = WriterQueue(
                    self._connection,
                    max_size=self._max_queue_size,
                    max_domain_size=self._max_domain_queue_size,
                    busy_timeout_ms=self._busy_timeout_ms,
                )
                self._state = ServiceState.READY
            except BaseException:
                self._state = ServiceState.DEGRADED_READ_ONLY
                if self._connection is not None:
                    await self._connection.close()
                    self._connection = None
                raise

    async def stop(self, *, drain: bool = False) -> None:
        async with self._lifecycle_lock:
            if self._state in {ServiceState.NEW, ServiceState.STOPPED}:
                self._state = ServiceState.STOPPED
                return

            async def cleanup() -> None:
                self._state = ServiceState.STOPPING
                if self._queue is not None:
                    await self._queue.shutdown(drain=drain)
                    self._queue = None
                if self._shared_database_manager is not None:
                    manager = self._shared_database_manager
                    lease = self._shared_connection_lease
                    await manager.release_shared_connection_lease(lease, close=True)
                    self._shared_database_manager = None
                    self._shared_connection_lease = None
                    self._connection = None
                elif self._connection is not None:
                    await self._connection.close()
                    self._connection = None
                self._state = ServiceState.STOPPED

            await self._await_cleanup(cleanup())

    def get_capabilities(self) -> DatabaseCapabilities:
        return DatabaseCapabilities(
            api_version=self.api_version,
            service_version=self.service_version,
            supports_registry=self._bootstrap_schema,
            max_queue_size=self._max_queue_size,
            max_domain_queue_size=self._max_domain_queue_size,
            journal_mode="delete",
        )

    async def register_domain(self, manifest: DomainManifest) -> DomainLease:
        self._require_ready()
        lease = self._registry.register(manifest)
        if self._bootstrap_schema:
            try:
                await self._submit_internal(
                    "registry.register",
                    lambda connection: self._persist_manifest(connection, manifest),
                )
            except BaseException:
                self._registry.unregister(lease)
                raise
        return lease

    async def unregister_domain(self, lease: DomainLease) -> None:
        final_lease = self._registry.unregister(lease)
        if final_lease and self._bootstrap_schema:
            await self._submit_internal(
                "registry.unregister",
                lambda connection: self._mark_domain_unregistered(
                    connection, lease.domain_id
                ),
            )

    async def execute_domain_operation(
        self,
        lease: DomainLease,
        operation: str,
        payload: Mapping[str, Value],
        *,
        idempotency_key: str | None = None,
        deadline: float | None = None,
    ) -> OperationResult:
        self._require_ready()
        spec = self._registry.operation(lease, operation)
        manifest = self._registry.validate_lease(lease)
        self._validate_payload(spec, payload, idempotency_key)
        payload_hash = self._payload_hash(payload)
        idempotency_id = (lease.domain_id, operation, idempotency_key or "")
        if idempotency_key is not None:
            previous = self._idempotency.get(idempotency_id)
            if previous is not None:
                if previous[0] != payload_hash:
                    raise IdempotencyConflict(
                        "Idempotency key was used for a different payload",
                        domain=lease.domain_id,
                        operation=operation,
                    )
                return previous[1]
            inflight = self._idempotency_inflight.get(idempotency_id)
            if inflight is not None:
                if inflight[0] != payload_hash:
                    raise IdempotencyConflict(
                        "Idempotency key was used for a different payload",
                        domain=lease.domain_id,
                        operation=operation,
                    )
                return await asyncio.shield(inflight[1])

        request_id = uuid4().hex
        queue = self._require_queue()
        class_deadline = monotonic() + self._queue_wait_limit(spec)
        effective_deadline = (
            min(deadline, class_deadline) if deadline is not None else class_deadline
        )

        async def runner(connection: aiosqlite.Connection) -> OperationResult:
            runtime_deadline = min(
                effective_deadline,
                monotonic() + (spec.timeout_ms / 1000),
            )
            return await self._execute_transaction(
                connection,
                request_id,
                lease.domain_id,
                spec,
                payload,
                frozenset(item.name for item in manifest.objects),
                runtime_deadline,
            )

        async def submit() -> OperationResult:
            return await queue.submit(
                domain_id=lease.domain_id,
                operation_id=operation,
                priority=spec.priority,
                deadline=effective_deadline,
                timeout=spec.timeout_ms / 1000,
                runner=runner,
            )

        if idempotency_key is not None:
            async def finalize() -> OperationResult:
                try:
                    result = await submit()
                except BaseException:
                    self._idempotency_inflight.pop(idempotency_id, None)
                    raise
                self._idempotency[idempotency_id] = (payload_hash, result)
                self._idempotency_inflight.pop(idempotency_id, None)
                return result

            task = asyncio.create_task(finalize())
            self._idempotency_inflight[idempotency_id] = (payload_hash, task)
            return await asyncio.shield(task)
        return await submit()

    async def fetch_domain_operation(
        self,
        lease: DomainLease,
        operation: str,
        payload: Mapping[str, Value],
        *,
        deadline: float | None = None,
    ) -> tuple[tuple[Value, ...], ...]:
        """Return rows for one lease-authorized read-only manifest operation."""

        self._require_ready()
        spec = self._registry.operation(lease, operation)
        self._registry.validate_lease(lease)
        if spec.write_tables:
            raise ManifestInvalid("Fetch operation must not declare writes")
        self._validate_payload(spec, payload, None)

        queue = self._require_queue()
        class_deadline = monotonic() + self._queue_wait_limit(spec)
        effective_deadline = (
            min(deadline, class_deadline) if deadline is not None else class_deadline
        )

        async def runner(
            connection: aiosqlite.Connection,
        ) -> tuple[tuple[Value, ...], ...]:
            runtime_deadline = min(
                effective_deadline,
                monotonic() + (spec.timeout_ms / 1000),
            )
            return await self._execute_read(
                connection,
                lease.domain_id,
                spec,
                payload,
                runtime_deadline,
            )

        return await queue.submit(
            domain_id=lease.domain_id,
            operation_id=operation,
            priority=spec.priority,
            deadline=effective_deadline,
            timeout=spec.timeout_ms / 1000,
            runner=runner,
        )

    async def get_health(self) -> DatabaseHealth:
        queue_size = self._queue.size if self._queue is not None else 0
        return DatabaseHealth(
            state=self._state,
            database_id=self.database_id,
            registered_domains=self._registry.domains,
            queue_size=queue_size,
            commits=self._commits,
            rollbacks=self._rollbacks,
            last_error_code=self._last_error_code,
            details=MappingProxyType({"database_path": str(self._path)}),
        )

    async def run_quick_check(self) -> str:
        self._require_ready()

        async def check(connection: aiosqlite.Connection) -> str:
            cursor = await connection.execute("PRAGMA quick_check")
            try:
                row = await cursor.fetchone()
            finally:
                await cursor.close()
            return str(row[0]) if row else "missing_result"

        return await self._submit_internal("integrity.quick_check", check)

    def _inspect_path(self) -> tuple[bool, bool]:
        exists = self._path.exists()
        return exists, self._path.is_file() if exists else False

    async def _configure_connection(self, connection: aiosqlite.Connection) -> None:
        pragmas = (
            "PRAGMA foreign_keys=ON",
            f"PRAGMA busy_timeout={self._busy_timeout_ms}",
            "PRAGMA journal_mode=DELETE",
            "PRAGMA synchronous=NORMAL",
            "PRAGMA query_only=OFF",
            "PRAGMA locking_mode=NORMAL",
            "PRAGMA recursive_triggers=OFF",
            "PRAGMA trusted_schema=OFF",
        )
        for statement in pragmas:
            cursor = await connection.execute(statement)
            await cursor.close()
        expected = {
            "foreign_keys": 1,
            "journal_mode": "delete",
            "query_only": 0,
            "locking_mode": "normal",
        }
        for name, value in expected.items():
            cursor = await connection.execute(f"PRAGMA {name}")
            try:
                row = await cursor.fetchone()
            finally:
                await cursor.close()
            if row is None or str(row[0]).lower() != str(value).lower():
                raise IntegrityFailure(f"SQLite rejected required PRAGMA {name}")

    async def _assert_integrity(self, connection: aiosqlite.Connection) -> None:
        cursor = await connection.execute("PRAGMA quick_check")
        try:
            row = await cursor.fetchone()
        finally:
            await cursor.close()
        if row != ("ok",):
            raise IntegrityFailure("SQLite quick_check failed")

    async def _persist_manifest(
        self, connection: aiosqlite.Connection, manifest: DomainManifest
    ) -> None:
        if self._shared_database_manager is not None:
            await self._shared_database_manager.async_run_serialized_transaction(
                lambda shared_connection: persist_manifest(shared_connection, manifest)
            )
            return
        await connection.execute("BEGIN IMMEDIATE")
        try:
            await persist_manifest(connection, manifest)
            await connection.commit()
        except BaseException:
            await connection.rollback()
            raise

    async def _mark_domain_unregistered(
        self, connection: aiosqlite.Connection, domain_id: str
    ) -> None:
        if self._shared_database_manager is not None:
            await self._shared_database_manager.async_run_serialized_transaction(
                lambda shared_connection: mark_domain_unregistered(
                    shared_connection, domain_id
                )
            )
            return
        await connection.execute("BEGIN IMMEDIATE")
        try:
            await mark_domain_unregistered(connection, domain_id)
            await connection.commit()
        except BaseException:
            await connection.rollback()
            raise

    async def _execute_transaction(
        self,
        connection: aiosqlite.Connection,
        request_id: str,
        domain_id: str,
        operation: OperationSpec,
        payload: Mapping[str, Value],
        owned_tables: frozenset[str],
        deadline: float | None = None,
    ) -> OperationResult:
        if self._shared_database_manager is not None:
            try:
                result = await self._shared_database_manager.async_run_serialized_transaction(
                    lambda shared_connection: self._execute_shared_transaction(
                        shared_connection,
                        request_id,
                        operation,
                        payload,
                        owned_tables,
                    ),
                    deadline=deadline,
                )
                self._commits += 1
                return result
            except BaseException as error:
                self._rollbacks += 1
                translated = self._translate_sqlite_error(
                    error, domain_id, operation.operation_id
                )
                self._last_error_code = getattr(
                    translated, "code", type(translated).__name__
                )
                raise translated from error

        rows_affected = 0
        allowed_writes = operation.write_tables
        # SQLite reads foreign-key parents while enforcing a declared write.
        # Those reads are implicit and remain confined to this domain's objects.
        allowed_reads = operation.read_tables | allowed_writes | owned_tables

        def authorize(
            action: int,
            table: str | None,
            _column: str | None,
            database: str | None,
            _trigger: str | None,
        ) -> int:
            if action == sqlite3.SQLITE_TRANSACTION:
                return sqlite3.SQLITE_OK
            if database != "main":
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_READ:
                return (
                    sqlite3.SQLITE_OK
                    if table in allowed_reads
                    else sqlite3.SQLITE_DENY
                )
            if action in {
                sqlite3.SQLITE_INSERT,
                sqlite3.SQLITE_UPDATE,
                sqlite3.SQLITE_DELETE,
            }:
                return (
                    sqlite3.SQLITE_OK
                    if table in allowed_writes
                    else sqlite3.SQLITE_DENY
                )
            return sqlite3.SQLITE_DENY

        try:
            await connection.set_authorizer(authorize)
            await connection.execute("BEGIN IMMEDIATE")
            for statement in operation.statements:
                parameters = tuple(payload[name] for name in statement.parameters)
                cursor = await connection.execute(statement.sql, parameters)
                try:
                    if cursor.rowcount > 0:
                        rows_affected += cursor.rowcount
                finally:
                    await cursor.close()
            await connection.commit()
            self._commits += 1
            return OperationResult(
                request_id=request_id,
                status="committed",
                rows_affected=rows_affected,
                committed_at_utc=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            )
        except BaseException as error:
            await connection.rollback()
            self._rollbacks += 1
            translated = self._translate_sqlite_error(
                error, domain_id, operation.operation_id
            )
            self._last_error_code = getattr(
                translated, "code", type(translated).__name__
            )
            raise translated from error
        finally:
            await connection.set_authorizer(None)

    async def _execute_read(
        self,
        connection: aiosqlite.Connection,
        domain_id: str,
        operation: OperationSpec,
        payload: Mapping[str, Value],
        deadline: float | None = None,
    ) -> tuple[tuple[Value, ...], ...]:
        if self._shared_database_manager is not None:
            try:
                return await self._shared_database_manager.async_run_serialized_transaction(
                    lambda shared_connection: self._execute_shared_read(
                        shared_connection, operation, payload
                    ),
                    deadline=deadline,
                )
            except BaseException as error:
                translated = self._translate_sqlite_error(
                    error, domain_id, operation.operation_id
                )
                self._last_error_code = getattr(
                    translated, "code", type(translated).__name__
                )
                raise translated from error

        allowed_reads = operation.read_tables

        def authorize(
            action: int,
            table: str | None,
            _column: str | None,
            database: str | None,
            _trigger: str | None,
        ) -> int:
            if action == sqlite3.SQLITE_SELECT:
                return sqlite3.SQLITE_OK
            if database != "main":
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_READ:
                return sqlite3.SQLITE_OK if table in allowed_reads else sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_DENY

        try:
            await connection.set_authorizer(authorize)
            rows: list[tuple[Value, ...]] = []
            for statement in operation.statements:
                parameters = tuple(payload[name] for name in statement.parameters)
                cursor = await connection.execute(statement.sql, parameters)
                try:
                    rows.extend(tuple(row) for row in await cursor.fetchall())
                finally:
                    await cursor.close()
            return tuple(rows)
        except BaseException as error:
            translated = self._translate_sqlite_error(
                error, domain_id, operation.operation_id
            )
            self._last_error_code = getattr(
                translated, "code", type(translated).__name__
            )
            raise translated from error
        finally:
            await connection.set_authorizer(None)

    async def _execute_shared_transaction(
        self,
        connection: aiosqlite.Connection,
        request_id: str,
        operation: OperationSpec,
        payload: Mapping[str, Value],
        owned_tables: frozenset[str],
    ) -> OperationResult:
        """Execute a manifest operation inside DatabaseManager's transaction gate."""

        rows_affected = 0
        allowed_writes = operation.write_tables
        allowed_reads = operation.read_tables | allowed_writes | owned_tables

        def authorize(
            action: int,
            table: str | None,
            _column: str | None,
            database: str | None,
            _trigger: str | None,
        ) -> int:
            if action == sqlite3.SQLITE_TRANSACTION:
                return sqlite3.SQLITE_OK
            if database != "main":
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_READ:
                return sqlite3.SQLITE_OK if table in allowed_reads else sqlite3.SQLITE_DENY
            if action in {
                sqlite3.SQLITE_INSERT,
                sqlite3.SQLITE_UPDATE,
                sqlite3.SQLITE_DELETE,
            }:
                return sqlite3.SQLITE_OK if table in allowed_writes else sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_DENY

        try:
            await connection.set_authorizer(authorize)
            for statement in operation.statements:
                parameters = tuple(payload[name] for name in statement.parameters)
                cursor = await connection.execute(statement.sql, parameters)
                try:
                    if cursor.rowcount > 0:
                        rows_affected += cursor.rowcount
                finally:
                    await cursor.close()
            return OperationResult(
                request_id=request_id,
                status="committed",
                rows_affected=rows_affected,
                committed_at_utc=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            )
        finally:
            await connection.set_authorizer(None)

    async def _execute_shared_read(
        self,
        connection: aiosqlite.Connection,
        operation: OperationSpec,
        payload: Mapping[str, Value],
    ) -> tuple[tuple[Value, ...], ...]:
        allowed_reads = operation.read_tables

        def authorize(
            action: int,
            table: str | None,
            _column: str | None,
            database: str | None,
            _trigger: str | None,
        ) -> int:
            if action == sqlite3.SQLITE_SELECT:
                return sqlite3.SQLITE_OK
            if database != "main":
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_READ:
                return sqlite3.SQLITE_OK if table in allowed_reads else sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_DENY

        try:
            await connection.set_authorizer(authorize)
            rows: list[tuple[Value, ...]] = []
            for statement in operation.statements:
                parameters = tuple(payload[name] for name in statement.parameters)
                cursor = await connection.execute(statement.sql, parameters)
                try:
                    rows.extend(tuple(row) for row in await cursor.fetchall())
                finally:
                    await cursor.close()
            return tuple(rows)
        finally:
            await connection.set_authorizer(None)

    async def _submit_internal(
        self,
        operation: str,
        runner: Callable[[aiosqlite.Connection], Awaitable[T]],
    ) -> T:
        queue = self._require_queue()
        deadline = monotonic() + 2
        async def serialized_runner(connection: aiosqlite.Connection) -> T:
            if self._shared_database_manager is not None:
                return await self._shared_database_manager.async_run_serialized_transaction(
                    runner, deadline=deadline
                )
            return await runner(connection)

        return await queue.submit(
            domain_id="_registry",
            operation_id=operation,
            priority=WritePriority.CORE,
            deadline=deadline,
            timeout=2,
            runner=serialized_runner,
        )

    def _require_ready(self) -> None:
        if self._state is not ServiceState.READY:
            raise ServiceUnavailable("Central database service is not ready")

    def _require_queue(self) -> WriterQueue:
        if self._queue is None:
            raise ServiceUnavailable("Central database writer is not available")
        return self._queue

    @staticmethod
    async def _await_cleanup(operation: Awaitable[Any]) -> Any:
        """Finish lifecycle cleanup before re-propagating caller cancellation."""

        task = asyncio.create_task(operation)
        cancelled = False
        while not task.done():
            try:
                await asyncio.shield(task)
            except asyncio.CancelledError:
                cancelled = True
        result = await task
        if cancelled:
            raise asyncio.CancelledError
        return result

    @staticmethod
    def _queue_wait_limit(operation: OperationSpec) -> float:
        return {10: 2.0, 20: 5.0, 30: 5.0, 40: 30.0}[int(operation.priority)]

    @staticmethod
    def _validate_payload(
        operation: OperationSpec,
        payload: Mapping[str, Value],
        idempotency_key: str | None,
    ) -> None:
        required = {
            name for statement in operation.statements for name in statement.parameters
        }
        if set(payload) != required:
            raise ManifestInvalid(
                "Operation payload does not match its statement contract"
            )
        if any(
            not isinstance(value, (type(None), bool, int, float, str, bytes))
            for value in payload.values()
        ):
            raise ManifestInvalid("Operation payload contains an unsupported value")
        if operation.idempotency is IdempotencyMode.REQUIRED and not idempotency_key:
            raise ManifestInvalid("Operation requires an idempotency key")
        if (
            operation.idempotency is IdempotencyMode.FORBIDDEN
            and idempotency_key is not None
        ):
            raise ManifestInvalid("Operation forbids idempotency keys")

    @staticmethod
    def _payload_hash(payload: Mapping[str, Value]) -> str:
        encoded = json.dumps(
            sorted(payload.items()),
            separators=(",", ":"),
            default=lambda value: {"bytes": value.hex()},
        )
        return hashlib.sha256(encoded.encode()).hexdigest()

    @staticmethod
    def _translate_sqlite_error(
        error: BaseException, domain: str, operation: str
    ) -> BaseException:
        if isinstance(error, TimeoutError):
            return TransactionTimeout(
                "Database transaction exceeded its runtime budget",
                domain=domain,
                operation=operation,
            )
        if isinstance(error, sqlite3.IntegrityError):
            return ConstraintViolation(
                "SQLite constraint rejected the operation",
                domain=domain,
                operation=operation,
            )
        if isinstance(error, sqlite3.OperationalError) and any(
            marker in str(error).lower() for marker in ("locked", "busy")
        ):
            return DatabaseBusy(
                "SQLite database is busy", domain=domain, operation=operation
            )
        return error
