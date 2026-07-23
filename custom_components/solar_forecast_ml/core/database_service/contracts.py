"""Immutable contracts for the central database service."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from enum import Enum, IntEnum
from types import MappingProxyType
from typing import Mapping, TypeAlias

from packaging.specifiers import InvalidSpecifier, SpecifierSet
from packaging.version import InvalidVersion, Version

from .errors import CompatibilityError, ManifestInvalid, OwnershipViolation

SERVICE_API_VERSION = "1.0.0"
SERVICE_VERSION = "1.0.0"
Value: TypeAlias = None | bool | int | float | str | bytes

_DOMAIN_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,62}$")
_OBJECT_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,126}$")
_WRITE_PATTERN = re.compile(
    r"^\s*(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM)\s+([a-z][a-z0-9_]*)",
    re.IGNORECASE,
)
_READ_PATTERN = re.compile(r"\b(?:FROM|JOIN)\s+([a-z][a-z0-9_]*)", re.IGNORECASE)
_PROHIBITED_SQL = re.compile(
    r"\b(?:ATTACH|DETACH|VACUUM|PRAGMA|CREATE|ALTER|DROP|REINDEX)\b",
    re.IGNORECASE,
)


class ServiceState(str, Enum):
    NEW = "new"
    STARTING = "starting"
    READY = "ready"
    DEGRADED_READ_ONLY = "degraded_read_only"
    DATABASE_MISSING = "database_missing"
    INCOMPATIBLE = "incompatible"
    STOPPING = "stopping"
    STOPPED = "stopped"


class WritePriority(IntEnum):
    CORE = 10
    INTERACTIVE = 20
    NORMAL = 30
    REBUILDABLE = 40


class IdempotencyMode(str, Enum):
    FORBIDDEN = "forbidden"
    OPTIONAL = "optional"
    REQUIRED = "required"


@dataclass(frozen=True, slots=True)
class ObjectSpec:
    name: str
    object_type: str = "table"
    writer_domain: str | None = None
    access_mode: str = "private"
    retention_class: str = "ephemeral"
    destructive_policy: str = "forbidden"
    schema_fingerprint: str = ""


@dataclass(frozen=True, slots=True)
class StatementSpec:
    statement_id: str
    sql: str
    parameters: tuple[str, ...] = ()
    write_tables: frozenset[str] = frozenset()
    read_tables: frozenset[str] = frozenset()

    @property
    def fingerprint(self) -> str:
        return hashlib.sha256(self.sql.encode()).hexdigest()


@dataclass(frozen=True, slots=True)
class OperationSpec:
    operation_id: str
    statements: tuple[StatementSpec, ...]
    write_tables: frozenset[str]
    read_tables: frozenset[str] = frozenset()
    priority: WritePriority = WritePriority.NORMAL
    timeout_ms: int = 500
    max_batch_rows: int = 250
    idempotency: IdempotencyMode = IdempotencyMode.FORBIDDEN


@dataclass(frozen=True, slots=True)
class DomainManifest:
    domain_id: str
    owner_repository: str
    repository_version: str
    service_api: str
    schema_version: int = 0
    contract_version: int = 1
    objects: tuple[ObjectSpec, ...] = ()
    operations: tuple[OperationSpec, ...] = ()
    read_domains: frozenset[str] = frozenset()

    def validate(self) -> None:
        if self.contract_version != 1:
            raise ManifestInvalid("Unsupported manifest contract version")
        if not _DOMAIN_PATTERN.fullmatch(self.domain_id):
            raise ManifestInvalid("Invalid domain identifier", domain=self.domain_id)
        if self.schema_version < 0:
            raise ManifestInvalid(
                "Schema version must be non-negative", domain=self.domain_id
            )
        try:
            Version(self.repository_version)
            compatible = Version(SERVICE_API_VERSION) in SpecifierSet(self.service_api)
        except (InvalidSpecifier, InvalidVersion) as error:
            raise ManifestInvalid(
                "Invalid version declaration", domain=self.domain_id
            ) from error
        if not compatible:
            raise CompatibilityError(
                "Manifest does not support this service API", domain=self.domain_id
            )

        objects = {item.name: item for item in self.objects}
        if len(objects) != len(self.objects):
            raise ManifestInvalid("Duplicate object declaration", domain=self.domain_id)
        for item in self.objects:
            if not _OBJECT_PATTERN.fullmatch(item.name):
                raise ManifestInvalid(
                    "Invalid database object name", domain=self.domain_id
                )
            if item.object_type not in {"table", "view", "index"}:
                raise ManifestInvalid(
                    "Invalid database object type", domain=self.domain_id
                )
            if item.object_type != "view" and item.writer_domain != self.domain_id:
                raise OwnershipViolation("Foreign object writer", domain=self.domain_id)
            if self.domain_id not in {"core", "wp03_test"} and not item.name.startswith(
                f"{self.domain_id}_"
            ):
                raise OwnershipViolation(
                    "Object lacks its domain prefix", domain=self.domain_id
                )

        operation_ids: set[str] = set()
        for operation in self.operations:
            if operation.operation_id in operation_ids:
                raise ManifestInvalid(
                    "Duplicate operation declaration", domain=self.domain_id
                )
            operation_ids.add(operation.operation_id)
            if not 1 <= operation.timeout_ms <= 2_000:
                raise ManifestInvalid(
                    "Operation timeout outside service limits", domain=self.domain_id
                )
            if not 1 <= operation.max_batch_rows <= 250:
                raise ManifestInvalid(
                    "Operation batch size outside service limits", domain=self.domain_id
                )
            if not operation.write_tables.issubset(objects):
                raise OwnershipViolation(
                    "Operation writes an undeclared object", domain=self.domain_id
                )
            if not operation.read_tables.issubset(objects):
                raise OwnershipViolation(
                    "Operation reads an undeclared object", domain=self.domain_id
                )
            self._validate_statements(operation)

    def _validate_statements(self, operation: OperationSpec) -> None:
        statement_ids: set[str] = set()
        for statement in operation.statements:
            if statement.statement_id in statement_ids:
                raise ManifestInvalid(
                    "Duplicate statement declaration", domain=self.domain_id
                )
            statement_ids.add(statement.statement_id)
            sql = statement.sql.strip()
            if not sql or ";" in sql or _PROHIBITED_SQL.search(sql):
                raise ManifestInvalid(
                    "Unsafe SQL in operation manifest", domain=self.domain_id
                )
            if sql.count("?") != len(statement.parameters):
                raise ManifestInvalid(
                    "Statement parameters do not match its placeholders",
                    domain=self.domain_id,
                )
            match = _WRITE_PATTERN.match(sql)
            actual_write = frozenset({match.group(1)}) if match else frozenset()
            actual_reads = frozenset(_READ_PATTERN.findall(sql)) - actual_write
            if actual_write != statement.write_tables:
                raise OwnershipViolation(
                    "SQL write scope differs from its declaration",
                    domain=self.domain_id,
                )
            if not actual_write.issubset(operation.write_tables):
                raise OwnershipViolation(
                    "Statement writes outside operation scope", domain=self.domain_id
                )
            if not actual_reads.issubset(statement.read_tables | operation.read_tables):
                raise OwnershipViolation(
                    "Statement reads outside operation scope", domain=self.domain_id
                )

    @property
    def checksum(self) -> str:
        payload = {
            "contract_version": self.contract_version,
            "domain_id": self.domain_id,
            "owner_repository": self.owner_repository,
            "repository_version": self.repository_version,
            "service_api": self.service_api,
            "schema_version": self.schema_version,
            "read_domains": sorted(self.read_domains),
            "objects": [
                {
                    "name": item.name,
                    "object_type": item.object_type,
                    "writer_domain": item.writer_domain,
                    "access_mode": item.access_mode,
                    "retention_class": item.retention_class,
                    "destructive_policy": item.destructive_policy,
                    "schema_fingerprint": item.schema_fingerprint,
                }
                for item in self.objects
            ],
            "operations": [
                {
                    "operation_id": operation.operation_id,
                    "write_tables": sorted(operation.write_tables),
                    "read_tables": sorted(operation.read_tables),
                    "priority": int(operation.priority),
                    "timeout_ms": operation.timeout_ms,
                    "max_batch_rows": operation.max_batch_rows,
                    "idempotency": operation.idempotency.value,
                    "statements": [
                        {
                            "statement_id": statement.statement_id,
                            "fingerprint": statement.fingerprint,
                            "parameters": statement.parameters,
                            "write_tables": sorted(statement.write_tables),
                            "read_tables": sorted(statement.read_tables),
                        }
                        for statement in operation.statements
                    ],
                }
                for operation in self.operations
            ],
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()


@dataclass(frozen=True, slots=True)
class DomainLease:
    domain_id: str
    lease_id: str
    manifest_checksum: str
    api_version: str
    schema_version: int


@dataclass(frozen=True, slots=True)
class OperationResult:
    request_id: str
    status: str
    rows_affected: int
    committed_at_utc: str


@dataclass(frozen=True, slots=True)
class DatabaseCapabilities:
    api_version: str
    service_version: str
    supports_registry: bool
    max_queue_size: int
    max_domain_queue_size: int
    journal_mode: str


@dataclass(frozen=True, slots=True)
class DatabaseHealth:
    state: ServiceState
    database_id: str
    registered_domains: tuple[str, ...]
    queue_size: int
    commits: int
    rollbacks: int
    last_error_code: str | None
    details: Mapping[str, str] = field(default_factory=lambda: MappingProxyType({}))
