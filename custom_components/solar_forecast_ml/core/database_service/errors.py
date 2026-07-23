"""Typed failures exposed by the central database service."""

from __future__ import annotations

from typing import Any


class DatabaseServiceError(Exception):
    """Base class carrying safe, structured diagnostics."""

    code = "database_service_error"
    retryable = False

    def __init__(
        self,
        message: str,
        *,
        domain: str | None = None,
        operation: str | None = None,
        request_id: str | None = None,
        retry_after: float | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.domain = domain
        self.operation = operation
        self.request_id = request_id
        self.retry_after = retry_after
        self.details = details or {}


class ServiceUnavailable(DatabaseServiceError):
    code = "service_unavailable"


class ServiceStopping(DatabaseServiceError):
    code = "service_stopping"


class DomainNotRegistered(DatabaseServiceError):
    code = "domain_not_registered"


class ManifestInvalid(DatabaseServiceError):
    code = "manifest_invalid"


class CompatibilityError(DatabaseServiceError):
    code = "compatibility_error"


class OwnershipViolation(DatabaseServiceError):
    code = "ownership_violation"


class UnknownDatabaseObject(DatabaseServiceError):
    code = "unknown_database_object"


class OperationNotRegistered(DatabaseServiceError):
    code = "operation_not_registered"


class StatementNotAllowed(DatabaseServiceError):
    code = "statement_not_allowed"


class QueueFull(DatabaseServiceError):
    code = "queue_full"
    retryable = True


class QueueTimeout(DatabaseServiceError):
    code = "queue_timeout"
    retryable = True


class TransactionTimeout(DatabaseServiceError):
    code = "transaction_timeout"


class DatabaseBusy(DatabaseServiceError):
    code = "database_busy"
    retryable = True


class ConstraintViolation(DatabaseServiceError):
    code = "constraint_violation"


class ReadOnlyDomain(DatabaseServiceError):
    code = "read_only_domain"


class IntegrityFailure(DatabaseServiceError):
    code = "integrity_failure"


class IdempotencyConflict(DatabaseServiceError):
    code = "idempotency_conflict"
