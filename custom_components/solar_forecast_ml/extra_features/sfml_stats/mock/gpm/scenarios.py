"""Static, labelled GPM preview when the integration is not installed."""

from __future__ import annotations

import calendar
from datetime import date
from typing import Any

_THRESHOLD = 25.0
_TODAY = [
    {
        "hour": hour,
        "total_price": price,
        "spot_price": round(price - 15.2, 1),
        "is_cheap": price < _THRESHOLD,
    }
    for hour, price in enumerate(
        [
            24.1, 23.4, 22.8, 21.6, 22.1, 24.8, 29.4, 33.2,
            31.8, 28.6, 25.4, 23.1, 21.8, 20.9, 22.4, 26.1,
            30.2, 34.8, 36.4, 33.9, 30.1, 27.6, 25.8, 24.6,
        ]
    )
]
_TOMORROW = [
    {
        "hour": hour,
        "total_price": round(price - 1.2, 1),
        "spot_price": round(price - 16.4, 1),
        "is_cheap": (price - 1.2) < _THRESHOLD,
    }
    for hour, price in enumerate(
        [
            23.0, 22.2, 21.5, 20.8, 21.4, 23.6, 28.1, 31.9,
            30.4, 27.2, 24.1, 22.0, 20.7, 19.8, 21.3, 25.0,
            29.1, 33.4, 35.1, 32.6, 28.8, 26.4, 24.7, 23.5,
        ]
    )
]


def _status(*, state: str, is_demo: bool) -> dict[str, Any]:
    cheap_today = [row["hour"] for row in _TODAY if row["is_cheap"]]
    cheap_tomorrow = [row["hour"] for row in _TOMORROW if row["is_cheap"]]
    return {
        "success": True,
        "state": state,
        "is_demo": is_demo,
        "provider_version": 1,
        "license": {
            "status": "not_provided",
            "source": None,
            "id_masked": None,
            "expires_at": None,
        },
        "tariff": {
            "mode": "demo",
            "label": "Demo",
            "country": "DE",
            "has_spot_component": False,
            "feed_in_tariff_ct": 8.1,
            "base_fee_eur_month": 12.5,
        },
        "prices": {
            "current_total": 29.4,
            "next_total": 27.1,
            "average_today": 26.8,
            "cheapest_hour": 13,
            "most_expensive_hour": 18,
            "today": list(_TODAY),
            "tomorrow": list(_TOMORROW),
        },
        "threshold_ct": _THRESHOLD,
        "next_cheap": {"hour": 13, "timestamp": "2026-01-15T13:00:00"},
        "cheap_hours": {"today": cheap_today, "tomorrow": cheap_tomorrow},
        "tomorrow_available": True,
        "price_components": None,
        "composition_ok": False,
        "corrections": [],
        "months": [],
        "effective_fees": {
            "feed_in_tariff_ct": 8.1,
            "base_fee_eur_month": 12.5,
            "source": "gpm",
        },
        "tariff_schedule": None,
        "diagnostics": {
            "last_fetch": None,
            "cache_age_seconds": None,
            "price_revision": 0,
            "last_correction": None,
            "provider_version": 1,
            "composition_mismatch": False,
        },
        "revision": 0,
        "last_correction": None,
        "capabilities": {
            "tariff_models": False,
            "csv_import": False,
            "corrections": False,
        },
        "links": {
            "configure": "/config/integrations/integration/grid_price_monitor",
        },
        "updated_at": "2026-01-15T12:00:00+00:00",
    }


SCENARIOS: dict[str, dict[str, Any]] = {
    "not_installed": _status(state="not_installed", is_demo=True),
    "gpm_demo": _status(state="gpm_demo", is_demo=True),
}


def scenario_payload(name: str) -> dict[str, Any]:
    return dict(SCENARIOS[name])


DEMO_TODAY = date(2026, 9, 19)
DEMO_BASE_FEE = 12.5
DEMO_KWH = (420, 390, 350, 300, 260, 240, 250, 270, 300, 340, 380, 410)
DEMO_PRICE_CT = (32.0, 31.0, 29.0, 27.0, 25.0, 24.0, 24.5, 25.5, 27.0, 29.0, 31.0, 32.5)
DEMO_RECENT_CT = 28.0


def demo_hourly_rows(through: date | None = None) -> list[dict[str, Any]]:
    limit = through or DEMO_TODAY
    rows: list[dict[str, Any]] = []
    for year in (2024, 2025, 2026):
        for month in range(1, 13):
            days = calendar.monthrange(year, month)[1]
            month_start = date(year, month, 1)
            if month_start > limit:
                continue
            last_day = min(days, limit.day) if year == limit.year and month == limit.month else days
            hour_kwh = DEMO_KWH[month - 1] / (days * 24)
            price = DEMO_PRICE_CT[month - 1]
            for day_num in range(1, last_day + 1):
                day = date(year, month, day_num)
                if day > limit:
                    break
                for hour in range(24):
                    rows.append(
                        {
                            "date": day.isoformat(),
                            "hour": hour,
                            "grid_import_kwh": round(hour_kwh, 6),
                            "price_ct_kwh": price,
                        }
                    )
    return rows


def monthly_costs_demo_payload(
    year: int,
    mode: str = "calendar",
    *,
    start_month: int = 1,
    start_day: int = 1,
) -> dict[str, Any]:
    from ...api.gpm_monthly import monthly_costs_demo_payload as _build

    return _build(year, mode, start_month=start_month, start_day=start_day)
