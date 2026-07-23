"""License diagnostics without secret material."""

from .models import LicenseValidationResult


def license_diagnostics(result: LicenseValidationResult) -> dict[str, object]:
    payload = result.payload
    return {
        "status": result.status.value,
        "license_id": payload.license_id if payload else None,
        "entitlements": sorted(result.entitlements),
        "expires_at": payload.expires_at.isoformat()
        if payload and payload.expires_at
        else None,
    }
