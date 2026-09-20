# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from __future__ import annotations

import logging
from datetime import datetime, time
from functools import partial
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import OptionsFlowWithReload, SOURCE_RECONFIGURE
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import (
    CONF_BASE_FEE_EUR_MONTH,
    CONF_BATTERY_POWER_SENSOR,
    CONF_CALIBRATION_PRICE,
    CONF_COUNTRY,
    CONF_CSV_BASE_MODE,
    CONF_CSV_COMMUNITY,
    CONF_CSV_PRICE_UNIT,
    CONF_CSV_TIMEZONE,
    CONF_EEG_PRICE,
    CONF_FEED_IN_TARIFF_CT,
    CONF_FIXED,
    CONF_FIXED_TOTAL_PRICE,
    CONF_GRID_FEE,
    CONF_LEGACY_ENTITLED,
    CONF_LICENSE_ID,
    CONF_LICENSE_KEY,
    CONF_LICENSE_STATUS,
    CONF_MAX_PRICE,
    CONF_PROVIDER_MARKUP,
    CONF_TARIFF_MODE,
    CONF_TAXES_FEES,
    CONF_TIME_OF_USE,
    CONF_TIME_WINDOWS,
    CONF_TOU_HIGH_END,
    CONF_TOU_HIGH_PRICE,
    CONF_TOU_HIGH_START,
    CONF_TOU_HOLIDAY_LOW,
    CONF_TOU_LOW_PRICE,
    CONF_TOU_WEEKEND_LOW,
    CONF_USE_CALIBRATION,
    CONF_VAT_RATE,
    CONF_WINDOW_END,
    CONF_WINDOW_NAME,
    CONF_WINDOW_PRICE,
    CONF_WINDOW_START,
    CONF_WINDOW_WEEKDAYS,
    CONF_WINDOWS_DEFAULT_PRICE,
    COUNTRY_OPTIONS,
    CSV_BASE_MODE_OPTIONS,
    CSV_PRICE_UNIT_OPTIONS,
    CSV_TIMEZONE_OPTIONS,
    DEFAULT_BASE_FEE_EUR_MONTH,
    DEFAULT_COUNTRY,
    DEFAULT_FEED_IN_TARIFF_CT,
    DEFAULT_GRID_FEE,
    DEFAULT_MAX_PRICE,
    DEFAULT_PROVIDER_MARKUP,
    DEFAULT_TAXES_FEES,
    DOMAIN,
    LICENSE_STATUS_GRANDFATHERED,
    MAX_TARIFF_WINDOWS,
    NAME,
    TARIFF_MODE_CSV_COMMUNITY,
    TARIFF_MODE_DEMO,
    TARIFF_MODE_DYNAMIC,
    TARIFF_MODE_FIXED,
    TARIFF_MODE_OPTIONS,
    TARIFF_MODE_TIME_OF_USE,
    TARIFF_MODE_TIME_WINDOWS,
    VAT_OPTIONS,
    VAT_RATE_AT,
    VAT_RATE_DE,
    WEEKDAY_OPTIONS,
)

# Note: ElectricityPriceService is imported lazily in async_step_pricing
# to avoid blocking the event loop during module import

_LOGGER = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _get_default(data: dict | None, key: str, default: Any = vol.UNDEFINED) -> Any:
    """Safely get default value for schema @zara"""
    if data is None:
        return default
    value = data.get(key)
    return value if value is not None and value != "" else default


def _get_default_vat_for_country(country: str) -> int:
    """Get default VAT rate for country @zara"""
    return VAT_RATE_AT if country == "AT" else VAT_RATE_DE


def _get_country_schema(default_country: str = DEFAULT_COUNTRY) -> vol.Schema:
    """Returns the country selection schema @zara"""
    return vol.Schema({
        vol.Required(
            CONF_COUNTRY,
            default=default_country,
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=[
                    selector.SelectOptionDict(value=k, label=v)
                    for k, v in COUNTRY_OPTIONS.items()
                ],
                mode=selector.SelectSelectorMode.DROPDOWN,
            ),
        ),
    })


def _optional_entity_field(key: str, current: Any) -> vol.Optional:
    if current:
        return vol.Optional(key, description={"suggested_value": current})
    return vol.Optional(key)


def _get_pricing_schema(
    defaults: dict | None = None,
    default_vat: int = VAT_RATE_DE,
) -> vol.Schema:
    """Returns the pricing configuration schema @zara"""
    if defaults is None:
        defaults = {}

    return vol.Schema({
        vol.Required(
            CONF_VAT_RATE,
            default=str(defaults.get(CONF_VAT_RATE, default_vat)),
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=[
                    selector.SelectOptionDict(value=str(opt["value"]), label=opt["label"])
                    for opt in VAT_OPTIONS
                ],
                mode=selector.SelectSelectorMode.DROPDOWN,
            ),
        ),
        vol.Optional(
            CONF_USE_CALIBRATION,
            default=False,
        ): selector.BooleanSelector(),
        vol.Optional(
            CONF_CALIBRATION_PRICE,
        ): selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0,
                max=100,
                step=0.01,
                unit_of_measurement="ct/kWh",
                mode=selector.NumberSelectorMode.BOX,
            ),
        ),
        vol.Required(
            CONF_GRID_FEE,
            default=defaults.get(CONF_GRID_FEE, DEFAULT_GRID_FEE),
        ): selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0,
                max=50,
                step=0.01,
                unit_of_measurement="ct/kWh",
                mode=selector.NumberSelectorMode.BOX,
            ),
        ),
        vol.Required(
            CONF_TAXES_FEES,
            default=defaults.get(CONF_TAXES_FEES, DEFAULT_TAXES_FEES),
        ): selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0,
                max=50,
                step=0.01,
                unit_of_measurement="ct/kWh",
                mode=selector.NumberSelectorMode.BOX,
            ),
        ),
        vol.Required(
            CONF_PROVIDER_MARKUP,
            default=defaults.get(CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP),
        ): selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0,
                max=20,
                step=0.01,
                unit_of_measurement="ct/kWh",
                mode=selector.NumberSelectorMode.BOX,
            ),
        ),
        _optional_entity_field(
            CONF_BATTERY_POWER_SENSOR,
            defaults.get(CONF_BATTERY_POWER_SENSOR),
        ): selector.EntitySelector(
            selector.EntitySelectorConfig(
                domain="sensor",
                device_class="power",
                multiple=False,
            ),
        ),
    })


def _license_schema(default: str = "") -> vol.Schema:
    return vol.Schema(
        {
            vol.Optional(CONF_LICENSE_KEY, default=default): selector.TextSelector(
                selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD)
            ),
        }
    )


def _detected_eai_license(hass: Any):
    from .license import SOURCE_EAI_ENTRY, resolve_entitlements

    dummy = type("GpmLicenseProbe", (), {"data": {}, "options": {}})()
    resolved = resolve_entitlements(hass, dummy)
    if resolved.source == SOURCE_EAI_ENTRY and resolved.status == "valid":
        return resolved
    return None


def _preserve_legacy_entitled(new_data: dict[str, Any], old_data: dict[str, Any] | None) -> dict[str, Any]:
    if not old_data:
        return new_data
    if old_data.get(CONF_LEGACY_ENTITLED) or old_data.get(CONF_LICENSE_STATUS) == LICENSE_STATUS_GRANDFATHERED:
        new_data[CONF_LEGACY_ENTITLED] = True
    return new_data


_MODE_PAYLOAD_KEYS = (
    CONF_FIXED,
    CONF_TIME_OF_USE,
    CONF_TIME_WINDOWS,
    CONF_CSV_COMMUNITY,
)
_DYNAMIC_PRICE_KEYS = (
    CONF_VAT_RATE,
    CONF_GRID_FEE,
    CONF_TAXES_FEES,
    CONF_PROVIDER_MARKUP,
)
_COMMON_KEYS = (
    CONF_BATTERY_POWER_SENSOR,
    CONF_FEED_IN_TARIFF_CT,
    CONF_BASE_FEE_EUR_MONTH,
)
_RECONFIGURE_STRIP_KEYS = frozenset(_MODE_PAYLOAD_KEYS + _DYNAMIC_PRICE_KEYS + _COMMON_KEYS)


def _csv_community_base_mode(data: dict[str, Any]) -> str:
    payload = data.get(CONF_CSV_COMMUNITY) or {}
    if isinstance(payload, dict):
        return str(payload.get("base_mode") or TARIFF_MODE_DYNAMIC)
    return TARIFF_MODE_DYNAMIC


def _allowed_mode_payload_keys(tariff_mode: str, data: dict[str, Any]) -> set[str]:
    if tariff_mode == TARIFF_MODE_FIXED:
        return {CONF_FIXED}
    if tariff_mode == TARIFF_MODE_TIME_OF_USE:
        return {CONF_TIME_OF_USE}
    if tariff_mode == TARIFF_MODE_TIME_WINDOWS:
        return {CONF_TIME_WINDOWS}
    if tariff_mode == TARIFF_MODE_CSV_COMMUNITY:
        allowed = {CONF_CSV_COMMUNITY}
        base = _csv_community_base_mode(data)
        if base == TARIFF_MODE_FIXED:
            allowed.add(CONF_FIXED)
        elif base == TARIFF_MODE_TIME_OF_USE:
            allowed.add(CONF_TIME_OF_USE)
        elif base == TARIFF_MODE_TIME_WINDOWS:
            allowed.add(CONF_TIME_WINDOWS)
        return allowed
    return set()


def _strip_inactive_mode_payloads(data: dict[str, Any]) -> dict[str, Any]:
    cleaned = dict(data)
    allowed = _allowed_mode_payload_keys(
        str(cleaned.get(CONF_TARIFF_MODE, TARIFF_MODE_DYNAMIC) or TARIFF_MODE_DYNAMIC),
        cleaned,
    )
    for key in _MODE_PAYLOAD_KEYS:
        if key not in allowed:
            cleaned.pop(key, None)
    return cleaned


def _reconfigure_data(existing: dict[str, Any], data: dict[str, Any]) -> dict[str, Any]:
    incoming = _strip_inactive_mode_payloads(data)
    kept = {
        key: value for key, value in existing.items() if key not in _RECONFIGURE_STRIP_KEYS
    }
    return _preserve_legacy_entitled({**kept, **incoming}, existing)


def _reconfigure_options(options: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in options.items()
        if key not in _RECONFIGURE_STRIP_KEYS
    }


def _tariff_schema(default_mode: str, default_country: str) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_TARIFF_MODE, default=default_mode): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(TARIFF_MODE_OPTIONS),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="tariff_mode",
                ),
            ),
            vol.Required(CONF_COUNTRY, default=default_country): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(value=k, label=v)
                        for k, v in COUNTRY_OPTIONS.items()
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                ),
            ),
        }
    )


def _as_clock(value: Any, fallback: str = "00:00:00") -> time:
    if isinstance(value, time):
        return value.replace(microsecond=0)
    text = str(value or fallback)
    parts = text.split(":")
    return time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0, int(float(parts[2])) if len(parts) > 2 else 0)


def _clock_text(value: Any, fallback: str = "00:00:00") -> str:
    clock = _as_clock(value, fallback)
    return clock.strftime("%H:%M:%S")


def _common_schema(defaults: dict | None = None) -> vol.Schema:
    defaults = defaults or {}
    return vol.Schema(
        {
            _optional_entity_field(
                CONF_BATTERY_POWER_SENSOR,
                defaults.get(CONF_BATTERY_POWER_SENSOR),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(
                    domain="sensor",
                    device_class="power",
                    multiple=False,
                )
            ),
            vol.Required(
                CONF_FEED_IN_TARIFF_CT,
                default=defaults.get(CONF_FEED_IN_TARIFF_CT, DEFAULT_FEED_IN_TARIFF_CT),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=50,
                    step=0.01,
                    unit_of_measurement="ct/kWh",
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
            vol.Required(
                CONF_BASE_FEE_EUR_MONTH,
                default=defaults.get(CONF_BASE_FEE_EUR_MONTH, DEFAULT_BASE_FEE_EUR_MONTH),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=100,
                    step=0.01,
                    unit_of_measurement="EUR",
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
        }
    )


def _fixed_schema(defaults: dict | None = None) -> vol.Schema:
    payload = (defaults or {}).get(CONF_FIXED) or {}
    default = float(payload.get("total_price") or (defaults or {}).get(CONF_FIXED_TOTAL_PRICE) or 0)
    return vol.Schema(
        {
            vol.Required(CONF_FIXED_TOTAL_PRICE, default=default): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=100,
                    step=0.01,
                    unit_of_measurement="ct/kWh",
                    mode=selector.NumberSelectorMode.BOX,
                )
            )
        }
    )


def _tou_schema(defaults: dict | None = None) -> vol.Schema:
    payload = (defaults or {}).get(CONF_TIME_OF_USE) or {}
    return vol.Schema(
        {
            vol.Required(
                CONF_TOU_HIGH_PRICE,
                default=float(payload.get("high_price") or 34.5),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=100, step=0.01, unit_of_measurement="ct/kWh", mode=selector.NumberSelectorMode.BOX)
            ),
            vol.Required(
                CONF_TOU_LOW_PRICE,
                default=float(payload.get("low_price") or 26.9),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=100, step=0.01, unit_of_measurement="ct/kWh", mode=selector.NumberSelectorMode.BOX)
            ),
            vol.Required(
                CONF_TOU_HIGH_START,
                default=_as_clock(payload.get("high_start"), "06:00:00"),
            ): selector.TimeSelector(),
            vol.Required(
                CONF_TOU_HIGH_END,
                default=_as_clock(payload.get("high_end"), "22:00:00"),
            ): selector.TimeSelector(),
            vol.Required(
                CONF_TOU_WEEKEND_LOW,
                default=bool(payload.get("weekend_low", True)),
            ): selector.BooleanSelector(),
            vol.Required(
                CONF_TOU_HOLIDAY_LOW,
                default=bool(payload.get("holiday_low", False)),
            ): selector.BooleanSelector(),
        }
    )


def _window_edit_schema(defaults: dict | None = None) -> vol.Schema:
    defaults = defaults or {}
    weekdays = [str(day) for day in defaults.get(CONF_WINDOW_WEEKDAYS, ["0", "1", "2", "3", "4"])]
    return vol.Schema(
        {
            vol.Required(CONF_WINDOW_NAME, default=defaults.get(CONF_WINDOW_NAME, "Peak")): selector.TextSelector(),
            vol.Required(
                CONF_WINDOW_START,
                default=_as_clock(defaults.get(CONF_WINDOW_START), "17:00:00"),
            ): selector.TimeSelector(),
            vol.Required(
                CONF_WINDOW_END,
                default=_as_clock(defaults.get(CONF_WINDOW_END), "20:00:00"),
            ): selector.TimeSelector(),
            vol.Required(
                CONF_WINDOW_PRICE,
                default=float(defaults.get(CONF_WINDOW_PRICE) or 38.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=100, step=0.01, unit_of_measurement="ct/kWh", mode=selector.NumberSelectorMode.BOX)
            ),
            vol.Required(
                CONF_WINDOW_WEEKDAYS,
                default=weekdays,
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(WEEKDAY_OPTIONS),
                    multiple=True,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="weekday",
                )
            ),
        }
    )


def _parse_fixed_input(user_input: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    total = float(user_input.get(CONF_FIXED_TOTAL_PRICE) or 0)
    if total <= 0:
        return None, "invalid_time_range"
    return {"total_price": total}, None


def _parse_tou_input(user_input: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    start = _clock_text(user_input.get(CONF_TOU_HIGH_START), "06:00:00")
    end = _clock_text(user_input.get(CONF_TOU_HIGH_END), "22:00:00")
    high = float(user_input.get(CONF_TOU_HIGH_PRICE) or 0)
    low = float(user_input.get(CONF_TOU_LOW_PRICE) or 0)
    if start == end or high <= 0 or low <= 0:
        return None, "invalid_time_range"
    return {
        "high_price": high,
        "low_price": low,
        "high_start": start,
        "high_end": end,
        "weekend_low": bool(user_input.get(CONF_TOU_WEEKEND_LOW, True)),
        "holiday_low": bool(user_input.get(CONF_TOU_HOLIDAY_LOW, False)),
    }, None


def _parse_window_candidate(
    user_input: dict[str, Any], windows: list[dict[str, Any]]
) -> tuple[dict[str, Any] | None, str | None]:
    weekdays = [int(day) for day in user_input.get(CONF_WINDOW_WEEKDAYS) or []]
    if not weekdays:
        return None, "invalid_time_range"
    if len(windows) >= MAX_TARIFF_WINDOWS:
        return None, "windows_overlap"
    candidate = {
        "name": str(user_input.get(CONF_WINDOW_NAME) or "Window"),
        "start": _clock_text(user_input.get(CONF_WINDOW_START), "17:00:00"),
        "end": _clock_text(user_input.get(CONF_WINDOW_END), "20:00:00"),
        "price": float(user_input.get(CONF_WINDOW_PRICE) or 0),
        "weekdays": weekdays,
    }
    from .tariffs.time_windows import windows_overlap

    if windows_overlap([*windows, candidate]):
        return None, "windows_overlap"
    return candidate, None


def _parse_csv_community_input(user_input: dict[str, Any]) -> dict[str, Any]:
    return {
        "base_mode": user_input.get(CONF_CSV_BASE_MODE, TARIFF_MODE_DYNAMIC),
        "eeg_price": float(user_input.get(CONF_EEG_PRICE) or 12.0),
        "price_unit": user_input.get(CONF_CSV_PRICE_UNIT, "auto"),
        "timezone": user_input.get(CONF_CSV_TIMEZONE, "local"),
    }


def _windows_description(windows: list[dict[str, Any]]) -> str:
    return "\n".join(
        f"- {window.get('name')}: {window.get('start')}–{window.get('end')} @ {window.get('price')} ct"
        for window in windows
    ) or "No windows yet."


def _window_remove_schema(windows: list[dict[str, Any]]) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_WINDOW_NAME): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(
                            value=str(window.get("name")),
                            label=str(window.get("name")),
                        )
                        for window in windows
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            )
        }
    )


def _options_dynamic_schema(current_data: dict[str, Any]) -> vol.Schema:
    current_vat = current_data.get(
        CONF_VAT_RATE, _get_default_vat_for_country(current_data.get(CONF_COUNTRY, DEFAULT_COUNTRY))
    )
    return vol.Schema(
        {
            vol.Required(
                CONF_VAT_RATE,
                default=str(current_vat),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(value=str(opt["value"]), label=opt["label"])
                        for opt in VAT_OPTIONS
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                ),
            ),
            vol.Required(
                CONF_GRID_FEE,
                default=current_data.get(CONF_GRID_FEE, DEFAULT_GRID_FEE),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=50,
                    step=0.01,
                    unit_of_measurement="ct/kWh",
                    mode=selector.NumberSelectorMode.BOX,
                ),
            ),
            vol.Required(
                CONF_TAXES_FEES,
                default=current_data.get(CONF_TAXES_FEES, DEFAULT_TAXES_FEES),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=50,
                    step=0.01,
                    unit_of_measurement="ct/kWh",
                    mode=selector.NumberSelectorMode.BOX,
                ),
            ),
            vol.Required(
                CONF_PROVIDER_MARKUP,
                default=current_data.get(CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=20,
                    step=0.01,
                    unit_of_measurement="ct/kWh",
                    mode=selector.NumberSelectorMode.BOX,
                ),
            ),
            _optional_entity_field(
                CONF_BATTERY_POWER_SENSOR,
                current_data.get(CONF_BATTERY_POWER_SENSOR),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(
                    domain="sensor",
                    device_class="power",
                    multiple=False,
                ),
            ),
        }
    )


def _windows_done_schema(default_price: float) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_WINDOWS_DEFAULT_PRICE, default=default_price): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    max=100,
                    step=0.01,
                    unit_of_measurement="ct/kWh",
                    mode=selector.NumberSelectorMode.BOX,
                )
            )
        }
    )


def _csv_community_schema(defaults: dict | None = None) -> vol.Schema:
    payload = (defaults or {}).get(CONF_CSV_COMMUNITY) or {}
    return vol.Schema(
        {
            vol.Required(
                CONF_CSV_BASE_MODE,
                default=payload.get("base_mode", TARIFF_MODE_DYNAMIC),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(CSV_BASE_MODE_OPTIONS),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="csv_base_mode",
                )
            ),
            vol.Required(
                CONF_EEG_PRICE,
                default=float(payload.get("eeg_price") or 12.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(min=0, max=100, step=0.01, unit_of_measurement="ct/kWh", mode=selector.NumberSelectorMode.BOX)
            ),
            vol.Required(
                CONF_CSV_PRICE_UNIT,
                default=payload.get("price_unit", "auto"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(CSV_PRICE_UNIT_OPTIONS),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="csv_price_unit",
                )
            ),
            vol.Required(
                CONF_CSV_TIMEZONE,
                default=payload.get("timezone", "local"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(CSV_TIMEZONE_OPTIONS),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="csv_timezone",
                )
            ),
        }
    )


def _csv_import_schema() -> vol.Schema:
    return vol.Schema(
        {
            vol.Required("csv_file"): selector.FileSelector(
                selector.FileSelectorConfig(accept=".csv,.txt")
            ),
        }
    )


def _csv_map_schema(
    headers: list[str],
    defaults: dict[str, Any] | None = None,
) -> vol.Schema:
    current = defaults or {}
    options = [
        selector.SelectOptionDict(value=name, label=name) for name in headers
    ]
    return vol.Schema(
        {
            vol.Required(
                "profile",
                default=current.get("profile", "auto"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["auto", "price_list", "community_share"],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="csv_profile",
                )
            ),
            vol.Required(
                "price_unit",
                default=current.get("price_unit", "auto"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(CSV_PRICE_UNIT_OPTIONS),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="csv_price_unit",
                )
            ),
            vol.Required(
                "timezone",
                default=current.get("timezone", "local"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=list(CSV_TIMEZONE_OPTIONS),
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="csv_timezone",
                )
            ),
            vol.Required(
                "timestamp_column",
                default=current.get("timestamp_column", headers[0] if headers else ""),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                "price_column",
                default=current.get("price_column"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                "total_kwh_column",
                default=current.get("total_kwh_column"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                "community_kwh_column",
                default=current.get("community_kwh_column"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
        }
    )


def _csv_preview_schema() -> vol.Schema:
    return vol.Schema(
        {
            vol.Required("confirm", default=True): selector.BooleanSelector(),
        }
    )


def _completed_month_options(now: datetime | None = None) -> list[selector.SelectOptionDict]:
    from .tariffs.corrections import completed_month_keys

    clock = now or datetime.now().astimezone()
    return [
        selector.SelectOptionDict(value=key, label=key) for key in completed_month_keys(clock)
    ]


def _monthly_correction_schema(
    defaults: dict[str, Any] | None = None,
    now: datetime | None = None,
) -> vol.Schema:
    current = defaults or {}
    months = _completed_month_options(now)
    default_month = current.get("month") or (months[0]["value"] if months else "")
    return vol.Schema(
        {
            vol.Required("month", default=default_month): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=months,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Required(
                "billed_kwh",
                default=current.get("billed_kwh", 1.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.001,
                    step=0.001,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="kWh",
                )
            ),
            vol.Required(
                "billed_eur",
                default=current.get("billed_eur", 1.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.001,
                    step=0.001,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="EUR",
                )
            ),
            vol.Optional(
                "base_fee_eur",
                default=current.get("base_fee_eur", 0.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0,
                    step=0.01,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="EUR",
                )
            ),
            vol.Required(
                "method",
                default=current.get("method", "additive"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["additive", "multiplicative"],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="correction_method",
                )
            ),
            vol.Required(
                "weighting",
                default=current.get("weighting", "consumption"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=["consumption", "uniform"],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                    translation_key="correction_weighting",
                )
            ),
            vol.Optional(
                "force",
                default=current.get("force", False),
            ): selector.BooleanSelector(),
        }
    )


def _monthly_correction_preview_schema() -> vol.Schema:
    return vol.Schema(
        {
            vol.Required("confirm", default=True): selector.BooleanSelector(),
        }
    )


def _corrections_manage_schema(rows: list[dict[str, Any]]) -> vol.Schema:
    options = [
        selector.SelectOptionDict(
            value=str(row["id"]),
            label=(
                f"{row['id']} · {row.get('kind') or '?'} · "
                f"{row.get('month') or row.get('status')} · {row.get('status')}"
            ),
        )
        for row in rows
        if row.get("status") == "applied"
    ]
    if not options:
        return vol.Schema({})
    return vol.Schema(
        {
            vol.Required("correction_id", default=options[0]["value"]): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=options,
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Required("confirm_revert", default=False): selector.BooleanSelector(),
        }
    )


def _read_uploaded_csv(hass: Any, file_id: str) -> bytes:
    from homeassistant.components.file_upload import process_uploaded_file

    with process_uploaded_file(hass, file_id) as path:
        data = path.read_bytes()
    if len(data) > 5 * 1024 * 1024:
        from .tariffs.csv_import import CsvImportError

        raise CsvImportError("csv_too_large")
    return data


# ============================================================================
# CONFIG FLOW CLASS
# ============================================================================


class GridPriceMonitorConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the configuration flow for Solar Forecast GPM @zara"""

    VERSION = 3

    def __init__(self) -> None:
        """Initialize the config flow @zara"""
        self._calibration_spot_price: float | None = None
        self._selected_country: str = DEFAULT_COUNTRY
        self._selected_vat_rate: int = VAT_RATE_DE
        self._existing_data: dict[str, Any] = {}
        self._license_key: str = ""
        self._license_status: str = ""
        self._license_id: str | None = None
        self._tariff_mode: str = TARIFF_MODE_DYNAMIC
        self._entitlements: frozenset[str] = frozenset()
        self._reauth_entry: config_entries.ConfigEntry | None = None
        self._windows: list[dict[str, Any]] = []
        self._window_default_price: float = 30.0
        self._csv_community: dict[str, Any] = {}
        self._mode_payload: dict[str, Any] = {}

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> GridPriceMonitorOptionsFlow:
        """Get the options flow handler @zara"""
        return GridPriceMonitorOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Start setup with the license step."""
        return await self.async_step_license()

    async def async_step_license(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import mask_license_id
        from .license.models import LicenseStatus
        from .license.validator import OfflineLicenseValidator

        detected = _detected_eai_license(self.hass)
        if detected is not None:
            if user_input is not None:
                self._license_key = ""
                self._license_status = detected.status
                self._license_id = detected.license_id
                self._entitlements = detected.entitlements
                return await self.async_step_tariff()
            return self.async_show_form(
                step_id="license_detected",
                data_schema=vol.Schema({}),
                description_placeholders={
                    "license_id": mask_license_id(detected.license_id) or "****",
                },
            )

        errors: dict[str, str] = {}
        if user_input is not None:
            license_key = str(user_input.get(CONF_LICENSE_KEY, "")).strip()
            if not license_key:
                await self.async_set_unique_id(DOMAIN)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title="Solar Forecast GPM Demo",
                    data={
                        CONF_LICENSE_KEY: "",
                        CONF_LICENSE_STATUS: LicenseStatus.NOT_PROVIDED.value,
                        CONF_TARIFF_MODE: TARIFF_MODE_DEMO,
                        CONF_COUNTRY: DEFAULT_COUNTRY,
                    },
                )
            result = OfflineLicenseValidator().validate(license_key)
            if result.status is LicenseStatus.VALID and result.payload is not None:
                self._license_key = license_key
                self._license_status = result.status.value
                self._license_id = result.payload.license_id
                self._entitlements = result.payload.entitlements
                return await self.async_step_tariff()
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="license",
            data_schema=_license_schema(),
            errors=errors,
        )

    async def async_step_tariff(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import FULL_PACKAGE, has_tariff_models

        errors: dict[str, str] = {}
        entitlements = self._entitlements | (
            FULL_PACKAGE if self._license_status == "valid" else frozenset()
        )
        if user_input is not None:
            if self._reauth_entry is None and self.source != SOURCE_RECONFIGURE:
                await self.async_set_unique_id(DOMAIN)
                self._abort_if_unique_id_configured()
            self._tariff_mode = user_input.get(CONF_TARIFF_MODE, TARIFF_MODE_DYNAMIC)
            self._selected_country = user_input.get(CONF_COUNTRY, DEFAULT_COUNTRY)
            self._selected_vat_rate = _get_default_vat_for_country(self._selected_country)
            if self._tariff_mode != TARIFF_MODE_DYNAMIC:
                if not has_tariff_models(entitlements):
                    errors["base"] = "tariff_model_requires_license"
            if not errors:
                return await self._async_continue_tariff_mask()
        default_mode = self._existing_data.get(CONF_TARIFF_MODE, TARIFF_MODE_DYNAMIC)
        default_country = self._existing_data.get(CONF_COUNTRY, self._selected_country)
        return self.async_show_form(
            step_id="tariff",
            data_schema=_tariff_schema(default_mode, default_country),
            errors=errors,
        )

    async def async_step_pricing(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the pricing configuration step @zara"""
        errors: dict[str, str] = {}
        is_reconfigure = self.source == SOURCE_RECONFIGURE

        if user_input is not None:
            # Get VAT rate from input (comes as string from selector)
            vat_rate_str = user_input.get(CONF_VAT_RATE, str(self._selected_vat_rate))
            vat_rate = int(vat_rate_str)

            use_calibration = user_input.get(CONF_USE_CALIBRATION, False)
            grid_fee = user_input.get(CONF_GRID_FEE, DEFAULT_GRID_FEE)
            taxes_fees = user_input.get(CONF_TAXES_FEES, DEFAULT_TAXES_FEES)
            provider_markup = user_input.get(CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP)

            if use_calibration:
                calibration_price = user_input.get(CONF_CALIBRATION_PRICE)
                if calibration_price is not None and self._calibration_spot_price is not None:
                    # Calculate total markup from calibration
                    # Calibration price is gross, spot price is net
                    # Total = (Spot × VAT) + Markup
                    # Markup = Total - (Spot × VAT)
                    vat_factor = 1 + (vat_rate / 100)
                    spot_gross = self._calibration_spot_price * vat_factor
                    total_markup = calibration_price - spot_gross

                    if total_markup > 0:
                        # Split roughly: 60% grid fee, 30% taxes, 10% provider
                        grid_fee = round(total_markup * 0.6, 2)
                        taxes_fees = round(total_markup * 0.3, 2)
                        provider_markup = round(total_markup * 0.1, 2)
                    else:
                        errors["base"] = "calibration_failed"
                else:
                    errors["base"] = "calibration_failed"

            if not errors:
                battery_sensor = user_input.get(CONF_BATTERY_POWER_SENSOR, "")

                data = {
                    CONF_COUNTRY: self._selected_country,
                    CONF_VAT_RATE: vat_rate,
                    CONF_GRID_FEE: grid_fee,
                    CONF_TAXES_FEES: taxes_fees,
                    CONF_PROVIDER_MARKUP: provider_markup,
                    CONF_MAX_PRICE: DEFAULT_MAX_PRICE,
                    CONF_BATTERY_POWER_SENSOR: battery_sensor,
                    CONF_TARIFF_MODE: self._tariff_mode or TARIFF_MODE_DYNAMIC,
                    CONF_LICENSE_KEY: self._license_key,
                    CONF_LICENSE_STATUS: self._license_status,
                    CONF_LICENSE_ID: self._license_id,
                }
                data.update(self._mode_payload)
                if not is_reconfigure and self._reauth_entry is None:
                    data[CONF_FEED_IN_TARIFF_CT] = DEFAULT_FEED_IN_TARIFF_CT
                    data[CONF_BASE_FEE_EUR_MONTH] = DEFAULT_BASE_FEE_EUR_MONTH
                else:
                    existing = self._existing_data or (
                        dict(self._reauth_entry.data) if self._reauth_entry is not None else {}
                    )
                    if CONF_FEED_IN_TARIFF_CT in existing:
                        data[CONF_FEED_IN_TARIFF_CT] = existing[CONF_FEED_IN_TARIFF_CT]
                    if CONF_BASE_FEE_EUR_MONTH in existing:
                        data[CONF_BASE_FEE_EUR_MONTH] = existing[CONF_BASE_FEE_EUR_MONTH]

                if is_reconfigure:
                    return self._finish_reconfigure(data)

                if self._reauth_entry is not None:
                    merged = _preserve_legacy_entitled(
                        {**self._reauth_entry.data, **data},
                        dict(self._reauth_entry.data),
                    )
                    return self.async_update_reload_and_abort(
                        self._reauth_entry,
                        data=merged,
                        reason="reauth_successful",
                    )

                return self.async_create_entry(
                    title=NAME,
                    data=data,
                )

        # Fetch current spot price for calibration display
        if self._calibration_spot_price is None:
            try:
                # Lazy import to avoid blocking the event loop
                from .core import ElectricityPriceService

                service = ElectricityPriceService(self._selected_country)
                await service.fetch_day_ahead_prices()
                self._calibration_spot_price = service.get_current_price()
            except Exception as err:
                _LOGGER.warning("Could not fetch spot price for calibration: %s", err)
                self._calibration_spot_price = None

        description_placeholders = {}
        if self._calibration_spot_price is not None:
            # Show gross price (with default VAT) for user reference
            vat_factor = 1 + (self._selected_vat_rate / 100)
            spot_gross = self._calibration_spot_price * vat_factor
            description_placeholders["spot_price"] = f"{spot_gross:.2f}"
        else:
            description_placeholders["spot_price"] = "N/A"

        # Use existing data as defaults for reconfigure
        defaults = self._existing_data if is_reconfigure else None
        default_vat = (
            self._existing_data.get(CONF_VAT_RATE, self._selected_vat_rate)
            if is_reconfigure
            else self._selected_vat_rate
        )

        return self.async_show_form(
            step_id="pricing",
            data_schema=_get_pricing_schema(defaults, default_vat),
            errors=errors,
            description_placeholders=description_placeholders,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Reconfigure starts at tariff selection with current values."""
        from .license import is_demo_entitlements, resolve_entitlements

        entry = self._get_reconfigure_entry()
        self._existing_data = {**entry.data, **entry.options}
        resolved = resolve_entitlements(self.hass, entry)
        if (
            self._existing_data.get(CONF_TARIFF_MODE) == TARIFF_MODE_DEMO
            or is_demo_entitlements(resolved.entitlements)
        ):
            return self.async_abort(reason="license_required")
        self._entitlements = resolved.entitlements
        self._license_key = str(self._existing_data.get(CONF_LICENSE_KEY, "") or "")
        self._license_status = str(self._existing_data.get(CONF_LICENSE_STATUS, "") or "")
        self._license_id = self._existing_data.get(CONF_LICENSE_ID)
        self._tariff_mode = self._existing_data.get(CONF_TARIFF_MODE, TARIFF_MODE_DYNAMIC)
        self._selected_country = self._existing_data.get(CONF_COUNTRY, DEFAULT_COUNTRY)
        self._selected_vat_rate = self._existing_data.get(
            CONF_VAT_RATE, _get_default_vat_for_country(self._selected_country)
        )
        payload = self._existing_data.get(CONF_TIME_WINDOWS) or {}
        self._windows = list(payload.get("windows") or [])
        self._window_default_price = float(payload.get("default_price") or 30.0)
        self._csv_community = dict(self._existing_data.get(CONF_CSV_COMMUNITY) or {})
        return await self.async_step_tariff()

    async def _async_continue_tariff_mask(self) -> FlowResult:
        if self._tariff_mode == TARIFF_MODE_DYNAMIC:
            return await self.async_step_pricing()
        if self._tariff_mode == TARIFF_MODE_FIXED:
            return await self.async_step_tariff_fixed()
        if self._tariff_mode == TARIFF_MODE_TIME_OF_USE:
            return await self.async_step_tariff_time_of_use()
        if self._tariff_mode == TARIFF_MODE_TIME_WINDOWS:
            return await self.async_step_tariff_time_windows()
        if self._tariff_mode == TARIFF_MODE_CSV_COMMUNITY:
            return await self.async_step_tariff_csv_community()
        return await self.async_step_pricing()

    def _base_entry_data(self) -> dict[str, Any]:
        data = {
            CONF_COUNTRY: self._selected_country,
            CONF_VAT_RATE: self._selected_vat_rate,
            CONF_GRID_FEE: self._existing_data.get(CONF_GRID_FEE, DEFAULT_GRID_FEE),
            CONF_TAXES_FEES: self._existing_data.get(CONF_TAXES_FEES, DEFAULT_TAXES_FEES),
            CONF_PROVIDER_MARKUP: self._existing_data.get(
                CONF_PROVIDER_MARKUP, DEFAULT_PROVIDER_MARKUP
            ),
            CONF_MAX_PRICE: self._existing_data.get(CONF_MAX_PRICE, DEFAULT_MAX_PRICE),
            CONF_BATTERY_POWER_SENSOR: self._existing_data.get(CONF_BATTERY_POWER_SENSOR, ""),
            CONF_TARIFF_MODE: self._tariff_mode,
            CONF_LICENSE_KEY: self._license_key,
            CONF_LICENSE_STATUS: self._license_status,
            CONF_LICENSE_ID: self._license_id,
        }
        data.update(self._mode_payload)
        if self._tariff_mode == TARIFF_MODE_CSV_COMMUNITY and self._csv_community:
            data[CONF_CSV_COMMUNITY] = dict(self._csv_community)
        return data

    def _apply_common_input(self, data: dict[str, Any], user_input: dict[str, Any]) -> dict[str, Any]:
        data[CONF_BATTERY_POWER_SENSOR] = user_input.get(CONF_BATTERY_POWER_SENSOR, "")
        data[CONF_FEED_IN_TARIFF_CT] = user_input.get(
            CONF_FEED_IN_TARIFF_CT, DEFAULT_FEED_IN_TARIFF_CT
        )
        data[CONF_BASE_FEE_EUR_MONTH] = user_input.get(
            CONF_BASE_FEE_EUR_MONTH, DEFAULT_BASE_FEE_EUR_MONTH
        )
        return data

    def _finish_reconfigure(self, data: dict[str, Any]) -> FlowResult:
        entry = self._get_reconfigure_entry()
        return self.async_update_reload_and_abort(
            entry,
            data=_reconfigure_data(dict(entry.data), data),
            options=_reconfigure_options(dict(entry.options)),
        )

    def _finish_entry(self, data: dict[str, Any]) -> FlowResult:
        is_reconfigure = self.source == SOURCE_RECONFIGURE
        if is_reconfigure:
            return self._finish_reconfigure(data)
        if self._reauth_entry is not None:
            merged = _preserve_legacy_entitled(
                {**self._reauth_entry.data, **data},
                dict(self._reauth_entry.data),
            )
            return self.async_update_reload_and_abort(
                self._reauth_entry,
                data=merged,
                reason="reauth_successful",
            )
        return self.async_create_entry(title=NAME, data=data)

    async def async_step_tariff_fixed(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            payload, error = _parse_fixed_input(user_input)
            if error:
                errors["base"] = error
            else:
                self._mode_payload[CONF_FIXED] = payload
                return await self.async_step_common()
        return self.async_show_form(
            step_id="tariff_fixed",
            data_schema=_fixed_schema(self._existing_data),
            errors=errors,
        )

    async def async_step_tariff_time_of_use(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            payload, error = _parse_tou_input(user_input)
            if error:
                errors["base"] = error
            else:
                self._mode_payload[CONF_TIME_OF_USE] = payload
                return await self.async_step_common()
        return self.async_show_form(
            step_id="tariff_time_of_use",
            data_schema=_tou_schema(self._existing_data),
            errors=errors,
        )

    async def async_step_tariff_time_windows(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        description = _windows_description(self._windows)
        return self.async_show_menu(
            step_id="tariff_time_windows",
            menu_options=["window_add", "window_remove", "windows_done"],
            description_placeholders={"windows": description},
        )

    async def async_step_window_add(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            candidate, error = _parse_window_candidate(user_input, self._windows)
            if error:
                errors["base"] = error
            else:
                self._windows.append(candidate)
                return await self.async_step_tariff_time_windows()
        return self.async_show_form(
            step_id="window_add",
            data_schema=_window_edit_schema(),
            errors=errors,
        )

    async def async_step_window_remove(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if not self._windows:
            return await self.async_step_tariff_time_windows()
        if user_input is not None:
            name = user_input.get(CONF_WINDOW_NAME)
            self._windows = [window for window in self._windows if window.get("name") != name]
            return await self.async_step_tariff_time_windows()
        return self.async_show_form(
            step_id="window_remove",
            data_schema=_window_remove_schema(self._windows),
        )

    async def async_step_windows_done(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._window_default_price = float(user_input.get(CONF_WINDOWS_DEFAULT_PRICE) or 0)
            self._mode_payload[CONF_TIME_WINDOWS] = {
                "default_price": self._window_default_price,
                "windows": list(self._windows),
            }
            return await self.async_step_common()
        return self.async_show_form(
            step_id="windows_done",
            data_schema=_windows_done_schema(self._window_default_price),
        )

    async def async_step_tariff_csv_community(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._csv_community = _parse_csv_community_input(user_input)
            self._mode_payload[CONF_CSV_COMMUNITY] = dict(self._csv_community)
            base = self._csv_community["base_mode"]
            if base == TARIFF_MODE_FIXED:
                return await self.async_step_tariff_fixed()
            if base == TARIFF_MODE_TIME_OF_USE:
                return await self.async_step_tariff_time_of_use()
            if base == TARIFF_MODE_TIME_WINDOWS:
                return await self.async_step_tariff_time_windows()
            return await self.async_step_pricing()
        return self.async_show_form(
            step_id="tariff_csv_community",
            data_schema=_csv_community_schema(self._existing_data),
        )

    async def async_step_common(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            data = self._apply_common_input(self._base_entry_data(), user_input)
            return self._finish_entry(data)
        defaults = {**self._existing_data}
        if self._reauth_entry is not None:
            defaults = {**self._reauth_entry.data, **defaults}
        return self.async_show_form(
            step_id="common",
            data_schema=_common_schema(defaults),
        )

    async def async_step_license_detected(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        payload = user_input if user_input is not None else {}
        if self._reauth_entry is not None:
            return await self.async_step_reauth_confirm(payload)
        return await self.async_step_license(payload)

    async def async_step_reauth(self, entry_data: dict[str, Any]) -> FlowResult:
        self._reauth_entry = self.hass.config_entries.async_get_entry(
            self.context["entry_id"]
        )
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import mask_license_id
        from .license.models import LicenseStatus
        from .license.validator import OfflineLicenseValidator

        detected = _detected_eai_license(self.hass)
        if detected is not None:
            if user_input is not None:
                entry = self._reauth_entry
                if entry is not None and entry.data.get(CONF_TARIFF_MODE) == TARIFF_MODE_DEMO:
                    self._license_key = ""
                    self._license_status = detected.status
                    self._license_id = detected.license_id
                    self._entitlements = detected.entitlements
                    return await self.async_step_tariff()
                if entry is not None:
                    data = _preserve_legacy_entitled(dict(entry.data), dict(entry.data))
                    data.update(
                        {
                            CONF_LICENSE_KEY: "",
                            CONF_LICENSE_STATUS: detected.status,
                            CONF_LICENSE_ID: detected.license_id,
                        }
                    )
                    return self.async_update_reload_and_abort(
                        entry,
                        data=data,
                        reason="reauth_successful",
                    )
            return self.async_show_form(
                step_id="license_detected",
                data_schema=vol.Schema({}),
                description_placeholders={
                    "license_id": mask_license_id(detected.license_id) or "****",
                },
            )

        errors: dict[str, str] = {}
        if user_input is not None:
            license_key = str(user_input.get(CONF_LICENSE_KEY, "")).strip()
            result = OfflineLicenseValidator().validate(license_key)
            if result.status is LicenseStatus.VALID and result.payload is not None:
                self._license_key = license_key
                self._license_status = result.status.value
                self._license_id = result.payload.license_id
                self._entitlements = result.payload.entitlements
                entry = self._reauth_entry
                if entry is not None and entry.data.get(CONF_TARIFF_MODE) == TARIFF_MODE_DEMO:
                    return await self.async_step_tariff()
                if entry is not None:
                    data = _preserve_legacy_entitled(dict(entry.data), dict(entry.data))
                    data.update(
                        {
                            CONF_LICENSE_KEY: license_key,
                            CONF_LICENSE_STATUS: result.status.value,
                            CONF_LICENSE_ID: result.payload.license_id,
                        }
                    )
                    return self.async_update_reload_and_abort(
                        entry,
                        data=data,
                        reason="reauth_successful",
                    )
            errors["base"] = result.message_key
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=_license_schema(),
            errors=errors,
        )


# ============================================================================
# OPTIONS FLOW CLASS
# ============================================================================


class GridPriceMonitorOptionsFlow(OptionsFlowWithReload):
    """Handle options flow for Solar Forecast GPM @zara

    Options start as a menu. Dynamic tariff keeps the previous pricing form.
    """

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        return self.async_show_menu(
            step_id="init",
            menu_options=[
                "tariff",
                "common",
                "license",
                "csv_import",
                "monthly_correction",
                "corrections_manage",
            ],
        )

    def _merged(self) -> dict[str, Any]:
        return {**self.config_entry.data, **self.config_entry.options}

    def _entitlements(self):
        from .license import resolve_entitlements

        return resolve_entitlements(self.hass, self.config_entry).entitlements

    def _coordinator(self):
        stored = self.hass.data.get(DOMAIN) or {}
        return stored.get(self.config_entry.entry_id)

    def _ensure_window_state(self) -> None:
        if getattr(self, "_windows_ready", False):
            return
        payload = self._merged().get(CONF_TIME_WINDOWS) or {}
        self._windows = list(payload.get("windows") or [])
        self._window_default_price = float(payload.get("default_price") or 30.0)
        self._windows_ready = True

    def _write_tariff_options(self, **payloads: Any) -> FlowResult:
        new_options = {**self.config_entry.options, **payloads}
        pending = getattr(self, "_pending_csv_community", None)
        if pending:
            new_options[CONF_CSV_COMMUNITY] = dict(pending)
        return self.async_create_entry(title="", data=new_options)

    async def _continue_csv_base(self, base: str) -> FlowResult:
        if base == TARIFF_MODE_FIXED:
            return await self.async_step_tariff_fixed()
        if base == TARIFF_MODE_TIME_OF_USE:
            return await self.async_step_tariff_time_of_use()
        if base == TARIFF_MODE_TIME_WINDOWS:
            return await self.async_step_tariff_time_windows()
        return self._show_dynamic_tariff(self._merged())

    def _store_dynamic_tariff(
        self, user_input: dict[str, Any], current_data: dict[str, Any]
    ) -> FlowResult:
        vat_rate = int(
            user_input.get(
                CONF_VAT_RATE,
                str(current_data.get(CONF_VAT_RATE, VAT_RATE_DE)),
            )
        )
        return self._write_tariff_options(
            **{
                CONF_VAT_RATE: vat_rate,
                CONF_GRID_FEE: user_input.get(CONF_GRID_FEE),
                CONF_TAXES_FEES: user_input.get(CONF_TAXES_FEES),
                CONF_PROVIDER_MARKUP: user_input.get(CONF_PROVIDER_MARKUP),
                CONF_BATTERY_POWER_SENSOR: user_input.get(CONF_BATTERY_POWER_SENSOR, ""),
            }
        )

    def _show_dynamic_tariff(self, current_data: dict[str, Any]) -> FlowResult:
        current_country = current_data.get(CONF_COUNTRY, DEFAULT_COUNTRY)
        return self.async_show_form(
            step_id="tariff",
            data_schema=_options_dynamic_schema(current_data),
            errors={},
            description_placeholders={
                "country": COUNTRY_OPTIONS.get(current_country, current_country),
            },
        )

    async def async_step_csv_import(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import has_csv_import
        from .tariffs.csv_import import (
            CsvImportError,
            parse_csv_bytes,
            suggest_column_map,
        )

        if not has_csv_import(self._entitlements()):
            return self.async_abort(reason="license_required")
        errors: dict[str, str] = {}
        if user_input is not None:
            file_id = user_input.get("csv_file")
            try:
                data = await self.hass.async_add_executor_job(
                    _read_uploaded_csv, self.hass, file_id
                )
                parsed = await self.hass.async_add_executor_job(
                    partial(parse_csv_bytes, data, profile="auto", base_prices=None)
                )
            except CsvImportError as err:
                errors["base"] = err.key
            except Exception:
                errors["base"] = "csv_decode_failed"
            else:
                self._csv_bytes = data
                self._csv_headers = parsed.headers
                suggested = suggest_column_map(parsed.headers)
                community = self._merged().get(CONF_CSV_COMMUNITY) or {}
                self._csv_map_defaults = {
                    "profile": parsed.detected_profile,
                    "price_unit": community.get("price_unit", parsed.detected_unit),
                    "timezone": community.get("timezone", "local"),
                    "timestamp_column": suggested.get("timestamp"),
                    "price_column": suggested.get("price"),
                    "total_kwh_column": suggested.get("total_kwh"),
                    "community_kwh_column": suggested.get("community_kwh"),
                }
                return await self.async_step_csv_map()
        return self.async_show_form(
            step_id="csv_import",
            data_schema=_csv_import_schema(),
            errors=errors,
        )

    async def async_step_csv_map(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import has_csv_import
        from .tariffs.csv_import import CsvImportError

        if not has_csv_import(self._entitlements()):
            return self.async_abort(reason="license_required")
        headers = getattr(self, "_csv_headers", [])
        defaults = getattr(self, "_csv_map_defaults", {})
        errors: dict[str, str] = {}
        if user_input is not None:
            column_map = {
                "timestamp": user_input.get("timestamp_column"),
                "price": user_input.get("price_column"),
                "total_kwh": user_input.get("total_kwh_column"),
                "community_kwh": user_input.get("community_kwh_column"),
            }
            self._csv_map = {
                "profile": user_input.get("profile", "auto"),
                "price_unit": user_input.get("price_unit", "auto"),
                "timezone": user_input.get("timezone", "local"),
                "column_map": column_map,
            }
            coordinator = self._coordinator()
            try:
                if coordinator is None:
                    raise CsvImportError("csv_not_ready")
                preview = await coordinator.async_preview_csv_bytes(
                    getattr(self, "_csv_bytes"),
                    profile=self._csv_map["profile"],
                    price_unit=self._csv_map["price_unit"],
                    csv_timezone=self._csv_map["timezone"],
                    column_map=column_map,
                )
            except CsvImportError as err:
                errors["base"] = err.key
            else:
                self._csv_preview = preview
                return await self.async_step_csv_preview()
        return self.async_show_form(
            step_id="csv_map",
            data_schema=_csv_map_schema(headers, defaults),
            errors=errors,
        )

    async def async_step_csv_preview(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import has_csv_import
        from .tariffs.csv_import import CsvImportError

        if not has_csv_import(self._entitlements()):
            return self.async_abort(reason="license_required")
        preview = getattr(self, "_csv_preview", {}) or {}
        stale = ", ".join(preview.get("stale_months") or []) or "—"
        placeholders = {
            "range_from": preview.get("range_from") or "—",
            "range_to": preview.get("range_to") or "—",
            "row_count": str(preview.get("row_count") or 0),
            "detected_unit": preview.get("detected_unit") or "ct_kwh",
            "hours_matched": str(preview.get("hours_matched") or 0),
            "hours_new": str(preview.get("hours_new") or 0),
            "stale_months": stale,
        }
        errors: dict[str, str] = {}
        if user_input is not None:
            coordinator = self._coordinator()
            mapping = getattr(self, "_csv_map", {})
            try:
                if coordinator is None:
                    raise CsvImportError("csv_not_ready")
                result = await coordinator.async_import_csv_bytes(
                    getattr(self, "_csv_bytes"),
                    profile=mapping.get("profile", "auto"),
                    price_unit=mapping.get("price_unit", "auto"),
                    csv_timezone=mapping.get("timezone", "local"),
                    column_map=mapping.get("column_map"),
                )
            except CsvImportError as err:
                errors["base"] = err.key
            else:
                return self.async_abort(
                    reason="csv_import_applied",
                    description_placeholders={
                        "rows": str(result.get("rows_affected") or 0),
                        "revision": str(result.get("revision") or 0),
                        "stale_months": ", ".join(result.get("stale_months") or []) or "—",
                    },
                )
        return self.async_show_form(
            step_id="csv_preview",
            data_schema=_csv_preview_schema(),
            description_placeholders=placeholders,
            errors=errors,
        )

    async def async_step_monthly_correction(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import has_corrections
        from .tariffs.corrections import CorrectionError

        if not has_corrections(self._entitlements()):
            return self.async_abort(reason="license_required")
        errors: dict[str, str] = {}
        defaults = getattr(self, "_monthly_defaults", {})
        if user_input is not None:
            month_key = str(user_input.get("month") or "")
            try:
                year_s, month_s = month_key.split("-", 1)
                year, month = int(year_s), int(month_s)
            except ValueError:
                errors["base"] = "correction_invalid_billed"
            else:
                payload = {
                    "year": year,
                    "month": month,
                    "billed_kwh": float(user_input.get("billed_kwh") or 0),
                    "billed_eur": float(user_input.get("billed_eur") or 0),
                    "base_fee_eur": float(user_input.get("base_fee_eur") or 0),
                    "method": user_input.get("method", "additive"),
                    "weighting": user_input.get("weighting", "consumption"),
                    "force": bool(user_input.get("force")),
                }
                coordinator = self._coordinator()
                try:
                    if coordinator is None:
                        raise CorrectionError("correction_not_ready")
                    preview = await coordinator.async_preview_month_correction(**payload)
                except CorrectionError as err:
                    errors["base"] = err.key
                else:
                    self._monthly_payload = payload
                    self._monthly_preview = preview
                    return await self.async_step_monthly_correction_preview()
        return self.async_show_form(
            step_id="monthly_correction",
            data_schema=_monthly_correction_schema(defaults),
            errors=errors,
        )

    async def async_step_monthly_correction_preview(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import has_corrections
        from .tariffs.corrections import CorrectionError

        if not has_corrections(self._entitlements()):
            return self.async_abort(reason="license_required")
        preview = getattr(self, "_monthly_preview", {}) or {}
        placeholders = {
            "month": preview.get("month_key") or "—",
            "mean_price": f"{preview.get('mean_price', 0):.4f}",
            "target_price": f"{preview.get('target_price', 0):.4f}",
            "delta": "—" if preview.get("delta") is None else f"{preview.get('delta'):.4f}",
            "factor": "—" if preview.get("factor") is None else f"{preview.get('factor'):.6f}",
            "coverage_percent": f"{preview.get('coverage_percent', 0):.1f}",
            "energy_deviation_percent": (
                "—"
                if preview.get("energy_deviation_percent") is None
                else f"{preview.get('energy_deviation_percent'):.1f}"
            ),
            "hours": str(preview.get("hours") or 0),
            "fallback_reason": preview.get("fallback_reason") or "—",
            "energy_warning": "yes" if preview.get("energy_warning") else "no",
        }
        errors: dict[str, str] = {}
        if user_input is not None:
            coordinator = self._coordinator()
            payload = getattr(self, "_monthly_payload", {})
            try:
                if coordinator is None:
                    raise CorrectionError("correction_not_ready")
                result = await coordinator.async_apply_month_correction(**payload)
            except CorrectionError as err:
                errors["base"] = err.key
            else:
                return self.async_abort(
                    reason="monthly_correction_applied",
                    description_placeholders={
                        "rows": str(result.get("rows_affected") or 0),
                        "revision": str(result.get("revision") or 0),
                        "month": str(result.get("month") or "—"),
                        "deviation": f"{result.get('deviation_ct', 0):.4f}",
                    },
                )
        return self.async_show_form(
            step_id="monthly_correction_preview",
            data_schema=_monthly_correction_preview_schema(),
            description_placeholders=placeholders,
            errors=errors,
        )

    async def async_step_corrections_manage(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import has_corrections
        from .tariffs.corrections import CorrectionError

        if not has_corrections(self._entitlements()):
            return self.async_abort(reason="license_required")
        coordinator = self._coordinator()
        errors: dict[str, str] = {}
        rows: list[dict[str, Any]] = []
        try:
            if coordinator is None:
                raise CorrectionError("correction_not_ready")
            rows = await coordinator.async_list_corrections()
        except CorrectionError as err:
            errors["base"] = err.key
        if user_input is not None and not errors:
            if user_input.get("confirm_revert"):
                try:
                    result = await coordinator.async_revert_correction(
                        int(user_input["correction_id"])
                    )
                except CorrectionError as err:
                    errors["base"] = err.key
                else:
                    return self.async_abort(
                        reason="correction_reverted",
                        description_placeholders={
                            "id": str(result.get("correction_id") or ""),
                            "revision": str(result.get("revision") or 0),
                        },
                    )
        return self.async_show_form(
            step_id="corrections_manage",
            data_schema=_corrections_manage_schema(rows),
            errors=errors,
        )

    async def async_step_common(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        current = self._merged()
        if user_input is not None:
            new_options = {
                **self.config_entry.options,
                CONF_BATTERY_POWER_SENSOR: user_input.get(CONF_BATTERY_POWER_SENSOR, ""),
                CONF_FEED_IN_TARIFF_CT: user_input.get(
                    CONF_FEED_IN_TARIFF_CT, DEFAULT_FEED_IN_TARIFF_CT
                ),
                CONF_BASE_FEE_EUR_MONTH: user_input.get(
                    CONF_BASE_FEE_EUR_MONTH, DEFAULT_BASE_FEE_EUR_MONTH
                ),
            }
            return self.async_create_entry(title="", data=new_options)
        return self.async_show_form(step_id="common", data_schema=_common_schema(current))

    async def async_step_tariff(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        current_data = self._merged()
        mode = current_data.get(CONF_TARIFF_MODE, TARIFF_MODE_DYNAMIC)
        if mode == TARIFF_MODE_DEMO:
            return self.async_abort(reason="license_required")
        if mode != TARIFF_MODE_DYNAMIC:
            from .license import has_tariff_models

            if not has_tariff_models(self._entitlements()):
                return self.async_abort(reason="license_required")
        if user_input is not None and CONF_VAT_RATE in user_input:
            return self._store_dynamic_tariff(user_input, current_data)
        if mode == TARIFF_MODE_FIXED:
            return await self.async_step_tariff_fixed()
        if mode == TARIFF_MODE_TIME_OF_USE:
            return await self.async_step_tariff_time_of_use()
        if mode == TARIFF_MODE_TIME_WINDOWS:
            return await self.async_step_tariff_time_windows()
        if mode == TARIFF_MODE_CSV_COMMUNITY:
            return await self.async_step_tariff_csv_community()
        return self._show_dynamic_tariff(current_data)

    async def async_step_tariff_fixed(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            payload, error = _parse_fixed_input(user_input)
            if error:
                errors["base"] = error
            else:
                return self._write_tariff_options(**{CONF_FIXED: payload})
        return self.async_show_form(
            step_id="tariff_fixed",
            data_schema=_fixed_schema(self._merged()),
            errors=errors,
        )

    async def async_step_tariff_time_of_use(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            payload, error = _parse_tou_input(user_input)
            if error:
                errors["base"] = error
            else:
                return self._write_tariff_options(**{CONF_TIME_OF_USE: payload})
        return self.async_show_form(
            step_id="tariff_time_of_use",
            data_schema=_tou_schema(self._merged()),
            errors=errors,
        )

    async def async_step_tariff_time_windows(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        self._ensure_window_state()
        return self.async_show_menu(
            step_id="tariff_time_windows",
            menu_options=["window_add", "window_remove", "windows_done"],
            description_placeholders={"windows": _windows_description(self._windows)},
        )

    async def async_step_window_add(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        self._ensure_window_state()
        errors: dict[str, str] = {}
        if user_input is not None:
            candidate, error = _parse_window_candidate(user_input, self._windows)
            if error:
                errors["base"] = error
            else:
                self._windows.append(candidate)
                return await self.async_step_tariff_time_windows()
        return self.async_show_form(
            step_id="window_add",
            data_schema=_window_edit_schema(),
            errors=errors,
        )

    async def async_step_window_remove(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        self._ensure_window_state()
        if not self._windows:
            return await self.async_step_tariff_time_windows()
        if user_input is not None:
            name = user_input.get(CONF_WINDOW_NAME)
            self._windows = [window for window in self._windows if window.get("name") != name]
            return await self.async_step_tariff_time_windows()
        return self.async_show_form(
            step_id="window_remove",
            data_schema=_window_remove_schema(self._windows),
        )

    async def async_step_windows_done(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        self._ensure_window_state()
        if user_input is not None:
            default_price = float(user_input.get(CONF_WINDOWS_DEFAULT_PRICE) or 0)
            return self._write_tariff_options(
                **{
                    CONF_TIME_WINDOWS: {
                        "default_price": default_price,
                        "windows": list(self._windows),
                    }
                }
            )
        return self.async_show_form(
            step_id="windows_done",
            data_schema=_windows_done_schema(self._window_default_price),
        )

    async def async_step_tariff_csv_community(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        if user_input is not None:
            self._pending_csv_community = _parse_csv_community_input(user_input)
            base = str(self._pending_csv_community.get("base_mode") or TARIFF_MODE_DYNAMIC)
            return await self._continue_csv_base(base)
        return self.async_show_form(
            step_id="tariff_csv_community",
            data_schema=_csv_community_schema(self._merged()),
        )

    async def async_step_license(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        from .license import mask_license_id
        from .license.models import LicenseStatus
        from .license.validator import OfflineLicenseValidator

        errors: dict[str, str] = {}
        entry = self.config_entry
        if entry.data.get(CONF_TARIFF_MODE) == TARIFF_MODE_DEMO:
            entry.async_start_reauth(self.hass)
            return self.async_abort(reason="reauth_started")
        detected = _detected_eai_license(self.hass)
        if detected is not None:
            if user_input is not None:
                new_data = _preserve_legacy_entitled(dict(entry.data), dict(entry.data))
                new_data[CONF_LICENSE_KEY] = ""
                new_data[CONF_LICENSE_STATUS] = detected.status
                new_data[CONF_LICENSE_ID] = detected.license_id
                self.hass.config_entries.async_update_entry(entry, data=new_data)
                return self.async_create_entry(title="", data=dict(entry.options))
            return self.async_show_form(
                step_id="license_detected",
                data_schema=vol.Schema({}),
                description_placeholders={
                    "license_id": mask_license_id(detected.license_id) or "****",
                },
            )
        if user_input is not None:
            license_key = str(user_input.get(CONF_LICENSE_KEY, "")).strip()
            if not license_key:
                errors["base"] = "license_not_provided"
            else:
                result = OfflineLicenseValidator().validate(license_key)
                if result.status is LicenseStatus.VALID and result.payload is not None:
                    new_data = _preserve_legacy_entitled(dict(entry.data), dict(entry.data))
                    new_data[CONF_LICENSE_KEY] = license_key
                    new_data[CONF_LICENSE_STATUS] = result.status.value
                    new_data[CONF_LICENSE_ID] = result.payload.license_id
                    self.hass.config_entries.async_update_entry(entry, data=new_data)
                    return self.async_create_entry(title="", data=dict(entry.options))
                errors["base"] = result.message_key
        return self.async_show_form(
            step_id="license",
            data_schema=_license_schema(),
            errors=errors,
        )

    async def async_step_license_detected(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        return await self.async_step_license(user_input if user_input is not None else {})
