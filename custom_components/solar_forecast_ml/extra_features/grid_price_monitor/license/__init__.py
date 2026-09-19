"""Offline license validation for Solar Forecast GPM."""

from .entitlements import (
    CONF_LEGACY_ENTITLED,
    FULL_PACKAGE,
    LEGACY_ENTITLEMENT,
    SOURCE_EAI_ENTRY,
    SOURCE_LEGACY,
    SOURCE_MANUAL,
    EntitlementResolution,
    has_corrections,
    has_csv_import,
    has_dynamic_tariff,
    has_tariff_models,
    has_valid_license_source,
    is_demo_entitlements,
    resolve_entitlements,
)
from .masking import mask_license_id, mask_license_key
from .models import LicensePayload, LicenseStatus, LicenseValidationResult
from .storage import license_key_from_entry
from .validator import OfflineLicenseValidator

__all__ = [
    "CONF_LEGACY_ENTITLED",
    "FULL_PACKAGE",
    "LEGACY_ENTITLEMENT",
    "SOURCE_EAI_ENTRY",
    "SOURCE_LEGACY",
    "SOURCE_MANUAL",
    "EntitlementResolution",
    "LicensePayload",
    "LicenseStatus",
    "LicenseValidationResult",
    "OfflineLicenseValidator",
    "has_corrections",
    "has_csv_import",
    "has_dynamic_tariff",
    "has_tariff_models",
    "has_valid_license_source",
    "is_demo_entitlements",
    "license_key_from_entry",
    "mask_license_id",
    "mask_license_key",
    "resolve_entitlements",
]
