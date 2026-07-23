"""Public WP03-M central database service capability."""

from .bootstrap import (
    DATABASE_SERVICE_KEY,
    async_setup_database_service,
    async_shutdown_database_service,
    async_wait_for_database_service,
)
from .contracts import (
    DatabaseCapabilities,
    DatabaseHealth,
    DomainLease,
    DomainManifest,
    IdempotencyMode,
    ObjectSpec,
    OperationResult,
    OperationSpec,
    SERVICE_API_VERSION,
    SERVICE_VERSION,
    ServiceState,
    StatementSpec,
    WritePriority,
)
from .errors import DatabaseServiceError
from .service import CentralDatabaseService

__all__ = [
    "DATABASE_SERVICE_KEY",
    "SERVICE_API_VERSION",
    "SERVICE_VERSION",
    "CentralDatabaseService",
    "DatabaseCapabilities",
    "DatabaseHealth",
    "DatabaseServiceError",
    "DomainLease",
    "DomainManifest",
    "IdempotencyMode",
    "ObjectSpec",
    "OperationResult",
    "OperationSpec",
    "ServiceState",
    "StatementSpec",
    "WritePriority",
    "async_setup_database_service",
    "async_shutdown_database_service",
    "async_wait_for_database_service",
]
