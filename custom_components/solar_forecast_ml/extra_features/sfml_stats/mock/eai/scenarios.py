"""Realistic, deterministic EAI preview scenarios."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import cos, pi, sin
from typing import Any

SECTIONS = (
    "overview",
    "forecast",
    "operation",
    "efficiency",
    "building",
    "energy",
    "diagnostics",
)


def _forecast() -> list[dict[str, Any]]:
    start = datetime(2026, 1, 15, tzinfo=timezone.utc)
    points = []
    for hour in range(72):
        timestamp = start + timedelta(hours=hour)
        outdoor = round(1.5 + 5.5 * sin((timestamp.hour - 8) * pi / 12), 1)
        demand = round(
            max(
                0.4, 2.2 - outdoor * 0.13 + (0.8 if timestamp.hour in {5, 6, 18} else 0)
            ),
            2,
        )
        actual = round(demand * (0.94 + 0.05 * cos(hour / 3)), 2) if hour < 18 else None
        points.append(
            {
                "timestamp": timestamp.isoformat(),
                "outdoor_c": outdoor,
                "forecast_kw": demand,
                "lower_kw": round(demand * 0.82, 2),
                "upper_kw": round(demand * 1.18, 2),
                "actual_kw": actual,
                "pv_forecast_kwh": round(
                    max(0, 4.6 * sin((timestamp.hour - 6) * pi / 12)), 2
                ),
                "temperature_origin": "demo_weather_forecast",
                "mode": "dhw"
                if timestamp.hour == 13
                else "defrost"
                if hour == 9
                else "heating",
            }
        )
    return points


_FULL_DATA = {
    "overview": {
        "available": True,
        "current_power_kw": 1.84,
        "energy_today_kwh": 11.7,
        "expected_today_kwh": 17.9,
        "expected_tomorrow_kwh": 16.4,
        "operation_mode": "heating",
        "data_quality_percent": 94,
        "pv_coverage_percent": 38,
        "expected_grid_import_kwh": 10.2,
        "health_score": 94,
        "why_now": {
            "headline": "Die Wärmepumpe nutzt gerade günstige PV-Energie",
            "explanation": "Demo-Erklärung aus Wärmebedarf, Speichertemperatur und PV-Prognose.",
            "evidence": ["Innen 20,6 °C bei Soll 21,0 °C", "PV-Überschuss 2,4 kW", "Warmwasser 46,8 °C"],
            "confidence_percent": 91,
            "origin": "demo_rule_based_explanation",
        },
        "briefing": {
            "headline": "Heute 3,1 kWh Netzbezug vermeiden",
            "summary": "Das Gebäude hält Wärme lange. Das beste Ladefenster liegt zwischen 11:20 und 13:40 Uhr.",
            "actions": [
                "Warmwasser-Soll im PV-Fenster um 3 K anheben",
                "Nachtabsenkung heute 35 Minuten früher starten",
                "Außentemperatursensor wegen kurzer Datenlücke prüfen",
            ],
            "origin": "demo_energy_briefing",
        },
        "opportunities": [{"title": "PV-Wärmefenster", "value": "11:20–13:40", "saving_kwh": 3.1}],
        "calculator_defaults": {
            "electricity_price_ct": 36.9,
            "feed_in_tariff_ct": 8.2,
            "annual_heat_demand_kwh": 12000,
            "heat_pump_pv_coverage_percent": 35,
            "tariff_mode": "Dynamischer Mock-Tarif",
            "tariff_source": "Mock-Tarifdaten",
            "hourly_prices_ct": [31.2, 29.8, 28.6, 27.9, 29.4, 34.8, 41.6, 45.2, 42.8, 35.4, 27.2, 21.8, 18.6, 17.9, 20.4, 26.8, 34.2, 43.7, 49.1, 46.3, 40.8, 36.1, 33.4, 32.0],
        },
    },
    "forecast": {
        "available": True,
        "locked": False,
        "hours": _forecast(),
        "run_status": "ready",
        "quality": "demo_high",
        "model_origin": "demo_explainable_heat_demand_model",
        "main_drivers": ["Außentemperatur", "Warmwasserzyklus", "Gebäudeträgheit"],
        "optimization": {
            "available": True,
            "start": "2026-01-15T11:20:00+00:00",
            "duration_minutes": 140,
            "pv_surplus_kwh": 3.1,
            "recommendation": "Warmwasser und Pufferspeicher in dieses PV-Fenster legen",
            "origin": "demo_pv_and_load_forecast",
        },
    },
    "operation": {
        "available": True,
        "current_power_kw": 1.84,
        "current_mode": "heating",
        "compressor_on": True,
        "runtime_hours": 8.2,
        "starts": 6,
        "average_cycle_minutes": 68,
        "temperatures_c": {
            "outdoor": 2.8,
            "indoor": 21.1,
            "flow": 34.7,
            "return": 29.8,
        },
        "modes_minutes": {"heating": 421, "dhw": 54, "standby": 72, "defrost": 8},
        "sensor_coverage_percent": 92,
        "why_now": {
            "headline": "Komfortbedarf und PV-Überschuss fallen zusammen",
            "explanation": "Die Demo kombiniert aktuelle Temperaturen, Betriebszustand und Prognose.",
            "evidence": ["0,4 K unter Soll", "PV-Erzeugung steigt", "Langer effizienter Takt"],
            "confidence_percent": 91,
            "origin": "demo_rule_based_explanation",
        },
    },
    "efficiency": {
        "available": True,
        "electric_kwh": 11.7,
        "thermal_kwh": 42.1,
        "cop": 3.6,
        "electric_power_kw": 1.84,
        "thermal_power_kw": 6.62,
        "cop_origin": "demo_synchronous_water_loop",
        "flow_c": 34.7,
        "return_c": 29.8,
        "volume_flow_l_min": 19.4,
        "note": "Der Demo-COP zeigt die Berechnung aus synchronen Leistungswerten.",
        "heating_share_percent": 82,
        "dhw_share_percent": 18,
    },
    "building": {
        "available": True,
        "locked": False,
        "indoor_c": 21.1,
        "outdoor_c": 2.8,
        "comfort_delta_c": 0.1,
        "thermal_inertia_hours": 6.4,
        "heat_loss_kw": 4.8,
        "heating_range_kw": [4.2, 5.6],
        "uncertainty_percent": 18,
        "target_c": 21.0,
        "heat_loss_origin": "demo_steady_state_model",
        "learning_progress_percent": 86,
        "temperature_spread_c": 18.2,
        "source_temperature_c": 6.1,
        "storage_temperature_c": 46.8,
    },
    "energy": {
        "available": True,
        "locked": False,
        "pv_forecast_kwh": 19.3,
        "heat_pump_kwh": 17.9,
        "home_kwh": 12.4,
        "battery_kwh": 5.1,
        "grid_import_kwh": 10.2,
        "surplus_windows": ["11:20–13:40"],
        "possible_dhw_windows": ["12:00–13:00"],
        "pv_coverage_percent": 38,
        "expected_grid_import_kwh": 10.2,
        "optimization": {
            "available": True,
            "start": "2026-01-15T11:20:00+00:00",
            "duration_minutes": 140,
            "pv_surplus_kwh": 3.1,
            "recommendation": "Thermischen Speicher solar laden",
            "origin": "demo_pv_and_load_forecast",
        },
    },
    "diagnostics": {
        "available": True,
        "locked": False,
        "health_score": 94,
        "sensor_coverage_percent": 92,
        "sensor_quality": "good",
        "data_gaps": 1,
        "forecast_quality": "preview",
        "model_status": "demo_model",
        "drift": "stable",
        "provider_status": "available",
        "anomalies": [{"severity": "info", "code": "short_gap", "evidence": "Außensensor: 7 Minuten Datenlücke"}],
        "checks": {"required_sensors": True, "timestamps_fresh": True, "assignments_unique": True, "forecast_source": True},
    },
}


def _status(**changes: Any) -> dict[str, Any]:
    value = {
        "data_mode": "mock",
        "eai_installed": False,
        "license_status": "not_provided",
        "configuration_status": "not_configured",
        "capability_level": "preview",
        "data_freshness": None,
        "provider_version": 2,
        "is_demo": True,
    }
    value.update(changes)
    return value


SCENARIOS: dict[str, dict[str, Any]] = {
    "demo_full_capability": {"status": _status(), **_FULL_DATA},
    "demo_minimal_sensors": {
        "status": _status(eai_installed=True, capability_level="essential"),
        **_FULL_DATA,
    },
    "demo_learning_phase": {
        "status": _status(
            eai_installed=True,
            license_status="valid",
            configuration_status="configured",
            capability_level="standard",
            data_mode="onboarding",
        ),
        **_FULL_DATA,
    },
    "demo_license_required": {
        "status": _status(eai_installed=True),
        **_FULL_DATA,
    },
    "demo_provider_unavailable": {
        "status": _status(eai_installed=True, data_mode="unavailable", is_demo=False),
        **{section: {} for section in SECTIONS},
    },
    "demo_degraded_data": {
        "status": _status(
            eai_installed=True,
            license_status="valid",
            configuration_status="configured",
            data_mode="degraded",
            data_freshness="2026-01-15T08:00:00+00:00",
            is_demo=False,
        ),
        **{section: {} for section in SECTIONS},
    },
    "demo_configured_no_history": {
        "status": _status(
            eai_installed=True,
            license_status="valid",
            configuration_status="configured",
            capability_level="standard",
            data_mode="onboarding",
            is_demo=False,
        ),
        **{section: {} for section in SECTIONS},
    },
}


def scenario_payload(name: str, section: str) -> dict[str, Any]:
    scenario = SCENARIOS[name]
    return {**scenario["status"], "section": section, "data": scenario[section]}
