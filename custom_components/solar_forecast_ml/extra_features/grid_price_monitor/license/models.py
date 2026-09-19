"""Typed offline license models."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class LicenseStatus(StrEnum):
    """Stable status values shared with capability consumers."""

    NOT_PROVIDED = "not_provided"
    VALID = "valid"
    INVALID_FORMAT = "invalid_format"
    INVALID_SIGNATURE = "invalid_signature"
    WRONG_PRODUCT = "wrong_product"
    UNSUPPORTED_VERSION = "unsupported_version"
    UNKNOWN_KEY_ID = "unknown_key_id"
    NOT_YET_VALID = "not_yet_valid"
    EXPIRED = "expired"
    MISSING_ENTITLEMENT = "missing_entitlement"
    VALIDATION_ERROR = "validation_error"


@dataclass(frozen=True, slots=True)
class LicensePayload:
    version: int
    key_id: str
    license_id: str
    product: str
    issued_at: datetime
    expires_at: datetime | None
    entitlements: frozenset[str]
    customer_ref: str | None = None
    order_ref: str | None = None
    max_installations: int | None = None


@dataclass(frozen=True, slots=True)
class LicenseValidationResult:
    status: LicenseStatus
    payload: LicensePayload | None
    entitlements: frozenset[str]
    message_key: str

    def __repr__(self) -> str:
        return (
            "LicenseValidationResult("
            f"status={self.status!r}, payload={'present' if self.payload else None}, "
            f"entitlements={sorted(self.entitlements)!r}, message_key={self.message_key!r})"
        )
