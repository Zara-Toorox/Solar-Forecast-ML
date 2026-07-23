"""In-memory ownership registry with an optional SQLite projection."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

import aiosqlite

from .contracts import DomainLease, DomainManifest, OperationSpec, SERVICE_API_VERSION
from .errors import (
    DomainNotRegistered,
    ManifestInvalid,
    OperationNotRegistered,
)

REGISTRY_TABLES = frozenset(
    {
        "shared_schema_domain",
        "shared_schema_object",
        "shared_schema_migration",
        "shared_schema_compatibility",
    }
)


@dataclass(slots=True)
class _Registration:
    manifest: DomainManifest
    lease_ids: set[str]


class DomainRegistry:
    """Validate manifests and issue revocable, process-local leases."""

    def __init__(self) -> None:
        self._registrations: dict[str, _Registration] = {}
        self._leases: dict[str, str] = {}

    def register(self, manifest: DomainManifest) -> DomainLease:
        manifest.validate()
        existing = self._registrations.get(manifest.domain_id)
        if existing is not None and existing.manifest.checksum != manifest.checksum:
            raise ManifestInvalid(
                "Domain is already registered with a different manifest",
                domain=manifest.domain_id,
            )
        lease_id = uuid4().hex
        if existing is None:
            existing = _Registration(manifest=manifest, lease_ids=set())
            self._registrations[manifest.domain_id] = existing
        existing.lease_ids.add(lease_id)
        self._leases[lease_id] = manifest.domain_id
        return DomainLease(
            domain_id=manifest.domain_id,
            lease_id=lease_id,
            manifest_checksum=manifest.checksum,
            api_version=SERVICE_API_VERSION,
            schema_version=manifest.schema_version,
        )

    def unregister(self, lease: DomainLease) -> bool:
        domain_id = self._leases.pop(lease.lease_id, None)
        if domain_id != lease.domain_id:
            raise DomainNotRegistered(
                "Unknown or revoked domain lease", domain=lease.domain_id
            )
        registration = self._registrations[domain_id]
        registration.lease_ids.discard(lease.lease_id)
        if registration.lease_ids:
            return False
        del self._registrations[domain_id]
        return True

    def validate_lease(self, lease: DomainLease) -> DomainManifest:
        domain_id = self._leases.get(lease.lease_id)
        registration = self._registrations.get(lease.domain_id)
        if (
            domain_id != lease.domain_id
            or registration is None
            or registration.manifest.checksum != lease.manifest_checksum
        ):
            raise DomainNotRegistered(
                "Unknown or revoked domain lease", domain=lease.domain_id
            )
        return registration.manifest

    def operation(self, lease: DomainLease, operation_id: str) -> OperationSpec:
        manifest = self.validate_lease(lease)
        for operation in manifest.operations:
            if operation.operation_id == operation_id:
                return operation
        raise OperationNotRegistered(
            "Operation is not registered",
            domain=lease.domain_id,
            operation=operation_id,
        )

    @property
    def domains(self) -> tuple[str, ...]:
        return tuple(sorted(self._registrations))


async def bootstrap_registry(connection: aiosqlite.Connection) -> None:
    """Create only the four WP03 registry tables, idempotently."""

    await connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS shared_schema_domain (
            domain_id TEXT PRIMARY KEY,
            owner_repository TEXT NOT NULL,
            repository_version TEXT NOT NULL,
            schema_version INTEGER NOT NULL CHECK (schema_version >= 0),
            min_service_version TEXT NOT NULL,
            max_service_version TEXT NOT NULL,
            manifest_checksum TEXT NOT NULL,
            status TEXT NOT NULL CHECK (
                status IN ('active', 'degraded', 'read_only', 'incompatible',
                           'legacy_imported', 'unregistered')
            ),
            last_migration_id TEXT,
            registered_at_utc TEXT NOT NULL,
            updated_at_utc TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_shared_schema_domain_owner
            ON shared_schema_domain(owner_repository);
        CREATE INDEX IF NOT EXISTS idx_shared_schema_domain_status
            ON shared_schema_domain(status);

        CREATE TABLE IF NOT EXISTS shared_schema_object (
            object_name TEXT PRIMARY KEY,
            object_type TEXT NOT NULL CHECK (object_type IN ('table', 'view', 'index')),
            domain_id TEXT NOT NULL REFERENCES shared_schema_domain(domain_id)
                ON DELETE RESTRICT,
            writer_domain TEXT REFERENCES shared_schema_domain(domain_id)
                ON DELETE RESTRICT,
            access_mode TEXT NOT NULL CHECK (access_mode IN ('private', 'shared_read', 'registry')),
            retention_class TEXT NOT NULL CHECK (retention_class IN ('durable', 'rebuildable', 'ephemeral')),
            destructive_policy TEXT NOT NULL CHECK (destructive_policy IN ('forbidden', 'migration_only')),
            created_by_migration_id TEXT,
            schema_fingerprint TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
            registered_at_utc TEXT NOT NULL,
            updated_at_utc TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_shared_schema_object_domain_type
            ON shared_schema_object(domain_id, object_type);
        CREATE INDEX IF NOT EXISTS idx_shared_schema_object_writer
            ON shared_schema_object(writer_domain);
        CREATE INDEX IF NOT EXISTS idx_shared_schema_object_active
            ON shared_schema_object(domain_id) WHERE is_active = 1;

        CREATE TABLE IF NOT EXISTS shared_schema_migration (
            migration_id TEXT PRIMARY KEY,
            domain_id TEXT NOT NULL REFERENCES shared_schema_domain(domain_id),
            from_version INTEGER NOT NULL,
            to_version INTEGER NOT NULL CHECK (to_version > from_version),
            checksum TEXT NOT NULL,
            repository_version TEXT NOT NULL,
            service_version TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('registered', 'running', 'applied', 'failed', 'rolled_back')),
            backup_id TEXT,
            started_at_utc TEXT,
            finished_at_utc TEXT,
            error_code TEXT,
            details_redacted TEXT,
            UNIQUE(domain_id, from_version, to_version, checksum)
        );
        CREATE INDEX IF NOT EXISTS idx_shared_schema_migration_domain_version
            ON shared_schema_migration(domain_id, to_version);
        CREATE INDEX IF NOT EXISTS idx_shared_schema_migration_status_started
            ON shared_schema_migration(status, started_at_utc);

        CREATE TABLE IF NOT EXISTS shared_schema_compatibility (
            consumer_domain TEXT NOT NULL REFERENCES shared_schema_domain(domain_id),
            consumer_repository_version TEXT NOT NULL,
            provider_domain TEXT NOT NULL REFERENCES shared_schema_domain(domain_id),
            min_provider_schema INTEGER NOT NULL,
            max_provider_schema INTEGER NOT NULL,
            min_service_version TEXT NOT NULL,
            max_service_version TEXT NOT NULL,
            contract_version INTEGER NOT NULL,
            registered_at_utc TEXT NOT NULL,
            PRIMARY KEY (consumer_domain, consumer_repository_version, provider_domain),
            CHECK (max_provider_schema >= min_provider_schema)
        );
        CREATE INDEX IF NOT EXISTS idx_shared_schema_compatibility_provider
            ON shared_schema_compatibility(provider_domain, min_provider_schema, max_provider_schema);
        """
    )


async def persist_manifest(
    connection: aiosqlite.Connection, manifest: DomainManifest
) -> None:
    """Project a validated active manifest into the registry tables."""

    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    cursor = await connection.execute(
        "SELECT owner_repository, manifest_checksum FROM shared_schema_domain "
        "WHERE domain_id = ?",
        (manifest.domain_id,),
    )
    try:
        existing_domain = await cursor.fetchone()
    finally:
        await cursor.close()
    if existing_domain is not None and existing_domain != (
        manifest.owner_repository,
        manifest.checksum,
    ):
        raise ManifestInvalid(
            "Persistent registry contains a conflicting domain manifest",
            domain=manifest.domain_id,
        )
    await connection.execute(
        """
        INSERT INTO shared_schema_domain (
            domain_id, owner_repository, repository_version, schema_version,
            min_service_version, max_service_version, manifest_checksum,
            status, registered_at_utc, updated_at_utc
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        ON CONFLICT(domain_id) DO UPDATE SET
            owner_repository = excluded.owner_repository,
            repository_version = excluded.repository_version,
            schema_version = excluded.schema_version,
            manifest_checksum = excluded.manifest_checksum,
            status = 'active',
            updated_at_utc = excluded.updated_at_utc
        """,
        (
            manifest.domain_id,
            manifest.owner_repository,
            manifest.repository_version,
            manifest.schema_version,
            "1.0.0",
            "1.x",
            manifest.checksum,
            now,
            now,
        ),
    )
    for item in manifest.objects:
        cursor = await connection.execute(
            "SELECT domain_id, writer_domain, schema_fingerprint "
            "FROM shared_schema_object WHERE object_name = ?",
            (item.name,),
        )
        try:
            existing_object = await cursor.fetchone()
        finally:
            await cursor.close()
        if existing_object is not None and existing_object != (
            manifest.domain_id,
            item.writer_domain,
            item.schema_fingerprint,
        ):
            raise ManifestInvalid(
                "Persistent registry contains a conflicting database object",
                domain=manifest.domain_id,
            )
        await connection.execute(
            """
            INSERT INTO shared_schema_object (
                object_name, object_type, domain_id, writer_domain, access_mode,
                retention_class, destructive_policy, schema_fingerprint,
                registered_at_utc, updated_at_utc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(object_name) DO UPDATE SET
                schema_fingerprint = excluded.schema_fingerprint,
                is_active = 1,
                updated_at_utc = excluded.updated_at_utc
            """,
            (
                item.name,
                item.object_type,
                manifest.domain_id,
                item.writer_domain,
                item.access_mode,
                item.retention_class,
                item.destructive_policy,
                item.schema_fingerprint,
                now,
                now,
            ),
        )


async def mark_domain_unregistered(
    connection: aiosqlite.Connection, domain_id: str
) -> None:
    """Retain registry history while revoking the final active lease."""

    now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    await connection.execute(
        "UPDATE shared_schema_domain SET status = 'unregistered', "
        "updated_at_utc = ? WHERE domain_id = ?",
        (now, domain_id),
    )
