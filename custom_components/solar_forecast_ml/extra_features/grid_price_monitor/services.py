"""Home Assistant services for Solar Forecast GPM."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .license import has_corrections, has_csv_import, resolve_entitlements
from .tariffs.corrections import (
    METHOD_ADDITIVE,
    METHOD_MULTIPLICATIVE,
    WEIGHTING_CONSUMPTION,
    WEIGHTING_UNIFORM,
    CorrectionError,
)
from .tariffs.csv_import import (
    PROFILE_AUTO,
    PROFILE_COMMUNITY_SHARE,
    PROFILE_PRICE_LIST,
    TZ_LOCAL,
    TZ_UTC,
    UNIT_AUTO,
    UNIT_CT_KWH,
    UNIT_EUR_KWH,
    UNIT_EUR_MWH,
    CsvImportError,
)

_LOGGER = logging.getLogger(__name__)

SERVICE_IMPORT_PRICE_CSV = "import_price_csv"
SERVICE_CORRECT_MONTH = "correct_month"
SERVICE_REVERT_CORRECTION = "revert_correction"

IMPORT_SCHEMA = vol.Schema(
    {
        vol.Required("path"): cv.string,
        vol.Optional("profile", default=PROFILE_AUTO): vol.In(
            [PROFILE_AUTO, PROFILE_PRICE_LIST, PROFILE_COMMUNITY_SHARE]
        ),
        vol.Optional("price_unit", default=UNIT_AUTO): vol.In(
            [UNIT_AUTO, UNIT_CT_KWH, UNIT_EUR_KWH, UNIT_EUR_MWH]
        ),
        vol.Optional("timezone", default=TZ_LOCAL): vol.In([TZ_LOCAL, TZ_UTC]),
        vol.Optional("column_map"): dict,
    }
)

CORRECT_MONTH_SCHEMA = vol.Schema(
    {
        vol.Required("year"): vol.All(vol.Coerce(int), vol.Range(min=2000, max=2100)),
        vol.Required("month"): vol.All(vol.Coerce(int), vol.Range(min=1, max=12)),
        vol.Required("billed_kwh"): vol.All(vol.Coerce(float), vol.Range(min=0.0001)),
        vol.Required("billed_eur"): vol.All(vol.Coerce(float), vol.Range(min=0.0001)),
        vol.Optional("base_fee_eur", default=0.0): vol.Coerce(float),
        vol.Optional("method", default=METHOD_ADDITIVE): vol.In(
            [METHOD_ADDITIVE, METHOD_MULTIPLICATIVE]
        ),
        vol.Optional("weighting", default=WEIGHTING_CONSUMPTION): vol.In(
            [WEIGHTING_CONSUMPTION, WEIGHTING_UNIFORM]
        ),
        vol.Optional("force", default=False): cv.boolean,
        vol.Optional("preview", default=False): cv.boolean,
    }
)

REVERT_SCHEMA = vol.Schema(
    {
        vol.Required("correction_id"): vol.All(vol.Coerce(int), vol.Range(min=1)),
    }
)


async def async_setup_services(hass: HomeAssistant) -> None:
    if hass.services.has_service(DOMAIN, SERVICE_IMPORT_PRICE_CSV):
        return

    async def _import_price_csv(call: ServiceCall) -> dict[str, Any]:
        coordinator = _first_coordinator(hass)
        if coordinator is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="csv_not_ready",
            )
        resolved = resolve_entitlements(hass, coordinator.entry)
        if not has_csv_import(resolved.entitlements):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="csv_license_required",
            )
        path = str(call.data["path"])
        if not hass.config.is_allowed_path(path):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="csv_path_not_allowed",
            )
        try:
            return await coordinator.async_import_csv_path(
                path,
                profile=call.data.get("profile", PROFILE_AUTO),
                price_unit=call.data.get("price_unit", UNIT_AUTO),
                csv_timezone=call.data.get("timezone", TZ_LOCAL),
                column_map=call.data.get("column_map"),
            )
        except CsvImportError as err:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key=err.key,
                translation_placeholders={
                    key: str(value) for key, value in err.placeholders.items()
                },
            ) from err
        except FileNotFoundError as err:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="csv_path_not_allowed",
            ) from err

    async def _correct_month(call: ServiceCall) -> dict[str, Any]:
        coordinator = _first_coordinator(hass)
        if coordinator is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="correction_not_ready",
            )
        resolved = resolve_entitlements(hass, coordinator.entry)
        if not has_corrections(resolved.entitlements):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="correction_license_required",
            )
        payload = {
            "year": int(call.data["year"]),
            "month": int(call.data["month"]),
            "billed_kwh": float(call.data["billed_kwh"]),
            "billed_eur": float(call.data["billed_eur"]),
            "base_fee_eur": float(call.data.get("base_fee_eur") or 0.0),
            "method": call.data.get("method", METHOD_ADDITIVE),
            "weighting": call.data.get("weighting", WEIGHTING_CONSUMPTION),
            "force": bool(call.data.get("force")),
        }
        try:
            if call.data.get("preview"):
                return await coordinator.async_preview_month_correction(**payload)
            return await coordinator.async_apply_month_correction(**payload)
        except CorrectionError as err:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key=err.key,
                translation_placeholders={
                    key: str(value) for key, value in err.placeholders.items()
                },
            ) from err

    async def _revert_correction(call: ServiceCall) -> dict[str, Any]:
        coordinator = _first_coordinator(hass)
        if coordinator is None:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="correction_not_ready",
            )
        resolved = resolve_entitlements(hass, coordinator.entry)
        if not has_corrections(resolved.entitlements):
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="correction_license_required",
            )
        try:
            return await coordinator.async_revert_correction(int(call.data["correction_id"]))
        except CorrectionError as err:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key=err.key,
                translation_placeholders={
                    key: str(value) for key, value in err.placeholders.items()
                },
            ) from err

    hass.services.async_register(
        DOMAIN,
        SERVICE_IMPORT_PRICE_CSV,
        _import_price_csv,
        schema=IMPORT_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CORRECT_MONTH,
        _correct_month,
        schema=CORRECT_MONTH_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REVERT_CORRECTION,
        _revert_correction,
        schema=REVERT_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )
    _LOGGER.debug("Registered GPM services")


def _first_coordinator(hass: HomeAssistant):
    stored = hass.data.get(DOMAIN) or {}
    for value in stored.values():
        if hasattr(value, "async_import_csv_path") or hasattr(
            value, "async_apply_month_correction"
        ):
            return value
    return None


def read_allowed_csv(path: str) -> bytes:
    return Path(path).read_bytes()
