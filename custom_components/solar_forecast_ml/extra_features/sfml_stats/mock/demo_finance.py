"""Deterministic example money for licence and device showcase payloads."""

from __future__ import annotations

from typing import Any


def heat_pump_advisory_savings(
    *,
    annual_heat_kwh: float = 12000.0,
    pv_share_percent: float = 44.0,
    electricity_price_ct: float = 36.9,
    cop: float = 3.6,
) -> dict[str, Any]:
    """Yearly advisory euros from mock heat-pump calculator defaults."""
    electric = annual_heat_kwh / cop
    shift = min(0.18, max(0.0, (100.0 - pv_share_percent) / 100.0 * 0.45))
    grid_reduction = round(electric * shift)
    current = round(electric * electricity_price_ct / 100.0, 2)
    advised_electric = max(0.0, electric - grid_reduction)
    advised = round(advised_electric * electricity_price_ct / 100.0, 2)
    savings = round(current - advised, 2)
    return {
        "complete": True,
        "is_demo": True,
        "cop": cop,
        "grid_reduction_kwh": grid_reduction,
        "current_cost_eur": current,
        "advised_cost_eur": advised,
        "savings_eur": savings,
    }


def smart_charging_period_kpi(
    *,
    charged_kwh: float,
    avg_price_ct: float,
    savings_eur: float,
) -> dict[str, Any]:
    return {
        "charged_kwh": round(charged_kwh, 2),
        "avg_price_ct": round(avg_price_ct, 2),
        "avg_price_ct_priced_part": round(avg_price_ct, 2),
        "savings_eur": round(savings_eur, 2),
        "savings_eur_priced_part": round(savings_eur, 2),
        "complete": True,
        "is_demo": True,
        "unpriced_import_kwh": 0.0,
        "unpriced_discharge_kwh": 0.0,
        "unpriced_export_kwh": 0.0,
        "hours_without_price": 0,
        "days_without_fee": 0,
        "days_without_price": [],
        "price_reasons": {},
        "daily_fallback_kwh": 0.0,
    }


def smart_charging_demo_kpis() -> dict[str, dict[str, Any]]:
    base = smart_charging_period_kpi(
        charged_kwh=18.4, avg_price_ct=24.6, savings_eur=4.82
    )
    return {
        "today": dict(base),
        "week": smart_charging_period_kpi(
            charged_kwh=62.5, avg_price_ct=25.1, savings_eur=14.35
        ),
        "period": smart_charging_period_kpi(
            charged_kwh=198.0, avg_price_ct=26.8, savings_eur=41.6
        ),
    }


def _demo_sizing_step(step_kwh: float, annual_eur: float, payback: float) -> dict[str, Any]:
    return {
        "step_kwh": step_kwh,
        "pv_eur_min": round(annual_eur * 0.45, 2),
        "pv_eur_min_priced_part": round(annual_eur * 0.45, 2),
        "pv_eur_max": round(annual_eur * 0.62, 2),
        "pv_eur_max_priced_part": round(annual_eur * 0.62, 2),
        "shift_kwh": round(step_kwh * 48, 1),
        "shift_eur": round(annual_eur * 0.35, 2),
        "shift_eur_priced_part": round(annual_eur * 0.35, 2),
        "shift_best_eur": round(annual_eur * 0.48, 2),
        "shift_best_eur_priced_part": round(annual_eur * 0.48, 2),
        "annual_eur_min": round(annual_eur * 0.8, 2),
        "annual_eur_min_priced_part": round(annual_eur * 0.8, 2),
        "annual_eur": round(annual_eur, 2),
        "annual_eur_priced_part": round(annual_eur, 2),
        "annual_eur_best": round(annual_eur * 1.12, 2),
        "annual_eur_best_priced_part": round(annual_eur * 1.12, 2),
        "complete": True,
        "unpriced_import_kwh": 0.0,
        "unpriced_export_kwh": 0.0,
        "hours_without_price": 0,
        "days_without_fee": 0,
        "days_without_price": [],
        "price_reasons": {},
        "payback_years": payback,
        "verdict": "worth_it",
    }


def smart_charging_demo_sizing() -> dict[str, Any]:
    return {
        "window": {
            "start": "2025-11-01",
            "end": "2026-10-31",
            "days": 365,
            "annualized": False,
        },
        "step_kwh": 2.5,
        "settings": {
            "step_kwh": 2.5,
            "cost_per_kwh_eur": 450.0,
            "cycles": 6000,
            "lifetime_years": 15,
        },
        "wear_ct_per_kwh": 0.75,
        "time_variable_tariff": True,
        "full_days": 42,
        "full_days_measurable": 120,
        "pv_measured_days_percent": 88.0,
        "shift_days": 310,
        "steps": [
            _demo_sizing_step(2.5, 275.0, 8.0),
            _demo_sizing_step(5.0, 410.0, 10.0),
            _demo_sizing_step(7.5, 520.0, 11.0),
        ],
        "verdict": "worth_it",
    }


def smart_charging_demo_advisor() -> dict[str, Any]:
    return {
        "has_battery": True,
        "window_start": "2025-11-01",
        "window_end": "2026-10-31",
        "total_days": 365,
        "feed_in_tariff_ct": 8.1,
        "feed_in_tariff_ct_priced_part": 8.1,
        "effective_import_price_ct_kwh": 26.8,
        "effective_import_price_ct_kwh_priced_part": 26.8,
        "complete": True,
        "is_demo": True,
        "unpriced_import_kwh": 0.0,
        "unpriced_export_kwh": 0.0,
        "hours_without_price": 0,
        "days_without_fee": 0,
        "days_without_price": [],
        "price_reasons": {},
        "battery_roundtrip_efficiency": 0.92,
        "sizing": smart_charging_demo_sizing(),
        "total_solar_yield_kwh": 4200.0,
        "avg_solar_yield_kwh": 11.5,
        "avg_house_consumption_kwh": 9.8,
        "avg_autarky_percent": 68.0,
        "battery_charge_solar_kwh": 820.0,
        "battery_charge_grid_kwh": 240.0,
        "battery_discharge_house_kwh": 980.0,
        "battery_cycles": 118.0,
        "battery_capacity": 10.0,
    }


def smart_charging_demo_live(*, enabled: bool = True) -> dict[str, Any]:
    return {
        "enabled": enabled,
        "active": True,
        "target_soc": 78,
        "current_soc": 64,
        "reason": "cheap_hour",
        "decision": "load",
        "requested_grid_charge_kwh": 2.4,
        "effective_storage_cost_ct_kwh": 21.6,
        "compared_future_price_ct_kwh": 34.2,
        "effective_roundtrip_efficiency": 0.92,
        "reserved_future_grid_charge_kwh": 1.1,
        "capacity_kwh": 10.0,
        "min_soc": 10,
        "max_soc": 100,
        "current_price": 24.8,
        "force_charge_price": 18.0,
        "max_price": 32.0,
        "solar_forecast_today_kwh": 14.2,
        "solar_forecast_tomorrow_kwh": 11.6,
        "mode": "price_band_soc",
        "is_cheap": True,
        "is_force_price": False,
        "effective_threshold_ct": 26.5,
        "cheapest_hours": 4,
        "below_average_pct": 12,
        "threshold_mode": "absolute",
        "next_cheap_hour": 21,
        "next_cheap_price_ct": 22.4,
        "charging_since": None,
        "waiting_since": None,
        "grid_allowed": True,
        "grid_kind": "allowed",
        "status": "active",
    }


def smart_charging_demo_history() -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    for hour in range(8):
        samples.append(
            {
                "hour_key": f"2026-11-17T{hour:02d}:00",
                "hour_key_utc": f"2026-11-17T{hour:02d}:00:00+00:00",
                "timezone_offset": "+0100",
                "hour": hour,
                "is_future": hour > 4,
                "price_ct_kwh": round(18.0 + hour * 1.4, 2),
                "grid_to_battery_kwh": 0.35 if hour in (2, 3) else 0.0,
                "is_cheap": hour in (2, 3, 21),
                "grid_charge_recommended": hour in (2, 3, 21),
                "grid_charge_recommendation_reason": "gpm_cheap" if hour in (2, 3, 21) else None,
                "grid_charge_recommendation_threshold_ct": 26.5,
                "grid_charge_recommendation_window": None,
                "grid_charge_recommendation_source": "gpm_threshold",
                "solar_yield_kwh": max(0.0, 0.8 * hour - 1.0),
                "home_consumption_kwh": 0.4 + hour * 0.05,
            }
        )
    return samples


def _grid_charge_period(kwh: float, avg_ct: float) -> dict[str, Any]:
    cost = round(kwh * avg_ct / 100.0, 2)
    return {
        "kwh": round(kwh, 2),
        "cost_eur": cost,
        "cost_eur_priced_part": cost,
        "avg_price_ct": round(avg_ct, 2),
        "avg_price_ct_priced_part": round(avg_ct, 2),
        "avg_ct_kwh": round(avg_ct, 2),
        "avg_ct_kwh_priced_part": round(avg_ct, 2),
        "complete": True,
        "unpriced_import_kwh": 0.0,
        "unpriced_export_kwh": 0.0,
        "hours_without_price": 0,
        "days_without_fee": 0,
        "days_without_price": [],
        "price_reasons": {},
        "under_limit_share": 0.68,
        "unpriced_kwh": 0.0,
    }


def smart_charging_demo_grid_charge() -> dict[str, dict[str, Any]]:
    return {
        "today": _grid_charge_period(2.4, 24.6),
        "month": _grid_charge_period(18.2, 25.8),
        "year": _grid_charge_period(198.0, 26.8),
    }


def smart_charging_demo_chart_plan() -> dict[str, Any]:
    return {
        "enabled": True,
        "source": "gpm_threshold",
        "recommendation_threshold": 26.5,
        "max_price_ct": 32.0,
        "force_charge_price_ct": 18.0,
    }


def build_smart_charging_dashboard_demo(
    gpm_meta: dict[str, Any] | None = None,
    *,
    sc_enabled: bool = True,
) -> dict[str, Any]:
    meta = dict(gpm_meta or {})
    meta["is_demo"] = True
    return {
        "is_demo": True,
        "live": smart_charging_demo_live(enabled=sc_enabled),
        "gpm": meta,
        "smart_charging_status": {
            "is_cheap": True,
            "is_force_price": False,
            "decision": "load",
            "reason": "cheap_hour",
            "enabled": sc_enabled,
            "active": True,
            "reserved_future_grid_charge_kwh": 1.1,
            "gpm_available": bool(meta.get("available")),
            "is_demo": True,
            "grid_allowed": True,
            "grid_kind": "allowed",
            "status": "active",
        },
        "kpis": smart_charging_demo_kpis(),
        "history": smart_charging_demo_history(),
        "chart_plan": smart_charging_demo_chart_plan(),
        "advisor": smart_charging_demo_advisor(),
        "grid_charge": smart_charging_demo_grid_charge(),
    }