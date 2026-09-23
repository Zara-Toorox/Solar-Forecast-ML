"""Offline license validation for Solar Forecast GPM."""

from .entitlements import (
    CONF_LEGACY_ENTITLED,
    FULL_PACKAGE,
    LEGACY_ENTITLEMENT,
    SOURCE_EAI_ENTRY,
    SOURCE_LEGACY,
    SOURCE_MANUAL_LEGACY,
    EntitlementResolution,
    has_corrections,
    has_csv_import,
    has_dynamic_tariff,
    has_eai_config_entry,
    has_tariff_models,
    has_valid_license_source,
    is_demo_entitlements,
    reauth_flow_ids_to_abort,
    resolve_entitlements,
    should_remove_stored_license_key,
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
    "SOURCE_MANUAL_LEGACY",
    "EntitlementResolution",
    "LicensePayload",
    "LicenseStatus",
    "LicenseValidationResult",
    "OfflineLicenseValidator",
    "has_corrections",
    "has_csv_import",
    "has_dynamic_tariff",
    "has_eai_config_entry",
    "has_tariff_models",
    "has_valid_license_source",
    "is_demo_entitlements",
    "license_key_from_entry",
    "reauth_flow_ids_to_abort",
    "mask_license_id",
    "mask_license_key",
    "resolve_entitlements",
    "should_remove_stored_license_key",
]
