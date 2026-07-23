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
    "mobility",
    "diagnostics",
)

_MOCK_PRICES = [
    31.2, 29.8, 28.6, 27.9, 29.4, 34.8, 41.6, 45.2,
    42.8, 35.4, 27.2, 21.8, 18.6, 17.9, 20.4, 26.8,
    34.2, 43.7, 49.1, 46.3, 40.8, 36.1, 33.4, 32.0,
]


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
        uncertainty = min(34, 14 + hour // 4)
        confidence = max(62, 92 - hour // 3)
        pv = round(max(0, 4.6 * sin((timestamp.hour - 6) * pi / 12)), 2)
        household = round(
            0.42
            + (0.38 if timestamp.hour in {6, 7, 18, 19, 20} else 0.0),
            2,
        )
        after_household = max(0.0, pv - household)
        heat_pump_pv = min(after_household, demand)
        after_heat_pump = max(0.0, after_household - demand)
        battery = round(min(after_heat_pump, 0.55 if 10 <= timestamp.hour <= 15 else 0.0), 2)
        wallbox_available = round(max(0.0, after_heat_pump - battery) * 0.92, 2)
        points.append(
            {
                "timestamp": timestamp.isoformat(),
                "outdoor_c": outdoor,
                "forecast_kw": demand,
                "lower_kw": round(demand * (1 - uncertainty / 100), 2),
                "upper_kw": round(demand * (1 + uncertainty / 100), 2),
                "uncertainty_percent": uncertainty,
                "confidence_percent": confidence,
                "uncertainty_drivers": [
                    "Demo-Modellqualität",
                    "Außentemperaturprognose",
                    "Prognosehorizont",
                ],
                "interval_method": "demo_quality_adjusted_prediction_interval",
                "actual_kw": actual,
                "pv_forecast_kwh": pv,
                "household_base_load_kwh": household,
                "pv_after_household_kwh": round(after_household, 2),
                "heat_pump_pv_kwh": round(heat_pump_pv, 2),
                "pv_after_heat_pump_kwh": round(after_heat_pump, 2),
                "battery_reserve_kwh": battery,
                "battery_pv_reserved_kwh": battery,
                "wallbox_pv_available_kwh": wallbox_available,
                "residual_pv_kwh": wallbox_available,
                "historical_grid_export_kwh": round(wallbox_available * 0.88, 2),
                "surplus_calibration_factor": 0.92,
                "energy_context_quality_percent": 92,
                "energy_context_origin": "stats_hourly_house_minus_large_consumers",
                "temperature_origin": "demo_weather_forecast",
                "mode": "dhw"
                if timestamp.hour == 13
                else "defrost"
                if hour == 9
                else "heating",
            }
        )
    return points


def _mobility_hours() -> list[dict[str, Any]]:
    hours = []
    for point in _forecast()[:24]:
        hour = datetime.fromisoformat(point["timestamp"]).hour
        residual = point["wallbox_pv_available_kwh"]
        residual_lower = max(
            0.0,
            point["pv_forecast_kwh"]
            - point["household_base_load_kwh"]
            - point["upper_kw"]
            - point["battery_pv_reserved_kwh"],
        ) * 0.92
        residual_upper = max(
            0.0,
            point["pv_forecast_kwh"]
            - point["household_base_load_kwh"]
            - point["lower_kw"]
            - point["battery_pv_reserved_kwh"],
        ) * 0.92
        hours.append(
            {
                "timestamp": point["timestamp"],
                "pv_forecast_kwh": point["pv_forecast_kwh"],
                "heat_pump_kwh": point["forecast_kw"],
                "household_base_load_kwh": point["household_base_load_kwh"],
                "battery_pv_reserved_kwh": point["battery_pv_reserved_kwh"],
                "residual_pv_kwh": round(residual, 2),
                "residual_pv_lower_kwh": round(residual_lower, 2),
                "residual_pv_upper_kwh": round(residual_upper, 2),
                "forecast_confidence_percent": point["confidence_percent"],
                "forecast_uncertainty_percent": point["uncertainty_percent"],
                "wallbox_kwh": 0.0,
                "pv_wallbox_kwh": 0.0,
                "grid_wallbox_kwh": 0.0,
                "price_ct_per_kwh": _MOCK_PRICES[hour],
            }
        )
    remaining = 29.3
    for point in sorted(hours, key=lambda item: item["residual_pv_kwh"], reverse=True):
        energy = min(remaining, 11.0, point["residual_pv_kwh"])
        point["wallbox_kwh"] = round(energy, 2)
        point["pv_wallbox_kwh"] = round(energy, 2)
        remaining -= energy
        if remaining <= 0.001:
            break
    for point in sorted(hours, key=lambda item: item["price_ct_per_kwh"]):
        if remaining <= 0.001:
            break
        energy = min(remaining, 11.0 - point["wallbox_kwh"])
        point["wallbox_kwh"] = round(point["wallbox_kwh"] + energy, 2)
        point["grid_wallbox_kwh"] = round(energy, 2)
        remaining -= energy
    return hours


_FULL_DATA = {
    "overview": {
        "available": True,
        "current_power_kw": 1.84,
        "energy_today_kwh": 11.7,
        "expected_today_kwh": 17.9,
        "expected_tomorrow_kwh": 16.4,
        "operation_mode": "heating",
        "data_quality_percent": 94,
        "pv_coverage_percent": 29,
        "expected_grid_import_kwh": 35.8,
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
            "heat_pump_pv_coverage_percent": 29,
            "tariff_mode": "Dynamischer Mock-Tarif",
            "tariff_source": "Mock-Tarifdaten",
            "hourly_prices_ct": _MOCK_PRICES,
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
        "uncertainty": {
            "available": True,
            "average_percent": 22,
            "confidence_percent": 80,
            "method": "demo_data_quality_model_source_temperature_and_horizon",
            "explanation": "Das Band wird mit Modellqualität, Außentemperatur und Prognosehorizont sichtbar breiter.",
            "lower_field": "lower_kw",
            "upper_field": "upper_kw",
        },
        "optimization": {
            "available": True,
            "start": "2026-01-15T11:20:00+00:00",
            "duration_minutes": 140,
            "pv_surplus_kwh": 3.1,
            "recommendation": "Warmwasser und Pufferspeicher in dieses PV-Fenster legen",
            "confidence_percent": 88,
            "uncertainty_percent": 16,
            "explanation": {
                "headline": "Warum genau dieses Zeitfenster?",
                "summary": "PV-Erzeugung übersteigt Hausgrundlast, Wärmepumpenbedarf und Speicherreserve gleichzeitig.",
                "evidence": [
                    "3,1 kWh verbleibender PV-Überschuss",
                    "Wärmepumpenbedarf 1,74 kWh, Band 1,46–2,02 kWh",
                    "Hausgrundlast und Speicherreserve bereits berücksichtigt",
                ],
                "confidence_percent": 88,
                "uncertainty_percent": 16,
            },
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
        "thermal_loss": {
            "available": True,
            "configured": True,
            "status": "ready",
            "storage_volume_l": 300.0,
            "storage_temperature_c": 46.8,
            "ambient_temperature_c": 18.7,
            "circulation_return_temperature_c": 37.4,
            "standby_loss_coefficient_w_k": 2.15,
            "standby_loss_kwh_day": 1.45,
            "circulation_loss_kwh_day": 0.62,
            "forecast_thermal_loss_kwh_24h": 2.07,
            "data_quality_percent": 88,
            "passive_cooling_intervals": 34,
            "outdoor_response_factor": 0.12,
            "explanation": "Demo-Schätzung aus passiven Abkühlphasen; die Zirkulation wird nur bei beobachtetem Pumpenbetrieb getrennt ausgewiesen.",
            "evidence": [
                "34 geeignete Mock-Abkühlintervalle",
                "Temperaturdifferenz Speicher/Heizraum 28,1 K",
                "Zirkulationszustand im Mock-Datensatz berücksichtigt",
            ],
            "origin": "demo_empirical_passive_cooling_model",
        },
    },
    "energy": {
        "available": True,
        "locked": False,
        "pv_forecast_kwh": 34.9,
        "heat_pump_kwh": 50.5,
        "household_base_load_kwh": 12.0,
        "battery_pv_reserve_kwh": 3.3,
        "wallbox_pv_available_kwh": 11.0,
        "energy_context_quality_percent": 92,
        "grid_import_kwh": 35.8,
        "surplus_windows": ["11:20–13:40"],
        "possible_dhw_windows": ["12:00–13:00"],
        "pv_coverage_percent": 29,
        "expected_grid_import_kwh": 35.8,
        "energy_context": {
            "available": True,
            "provider_version": 1,
            "quality_percent": 92,
            "sample_count": 612,
            "history_days": 35,
            "base_load_origin": "stats_hourly_house_minus_large_consumers",
            "grid_export_usage": "calibration_only",
            "priority_order": [
                "household_base_load",
                "heat_pump",
                "battery_reserve",
                "wallbox",
                "grid_export",
            ],
        },
        "optimization": {
            "available": True,
            "start": "2026-01-15T11:20:00+00:00",
            "duration_minutes": 140,
            "pv_surplus_kwh": 3.1,
            "recommendation": "Thermischen Speicher solar laden",
            "origin": "demo_pv_and_load_forecast",
        },
    },
    "mobility": {
        "available": True,
        "configured": True,
        "wallbox_name": "KEPLER Wallbox",
        "connected": True,
        "charging": False,
        "current_power_kw": 0.0,
        "energy_today_kwh": 4.2,
        "current_soc_percent": 42,
        "target_soc_percent": 80,
        "battery_capacity_kwh": 77,
        "max_charging_power_kw": 11,
        "required_energy_kwh": 29.3,
        "departure_time": "2026-01-16T07:00:00+00:00",
        "recommended_action": "defer",
        "recommendation_reason": "pv_window_upcoming",
        "recommendation_explanation": {
            "headline": "Auf das nächste PV-Fenster warten",
            "summary": "Zwischen Haus, Wärmepumpe und Speicher bleibt mittags die meiste Energie für das Fahrzeug.",
            "evidence": [
                "29,3 kWh Ladebedarf bis zur Abfahrt",
                "10,96 kWh erwarteter PV-Anteil",
                "PV-Prognoseband 9,4–12,5 kWh",
            ],
            "confidence_percent": 86,
            "uncertainty_percent": 18,
            "reason": "pv_window_upcoming",
        },
        "recommendation_confidence_percent": 86,
        "forecast_uncertainty_percent": 18,
        "recommended_start": "2026-01-15T09:00:00+00:00",
        "recommended_end": "2026-01-15T17:00:00+00:00",
        "recommended_energy_kwh": 29.3,
        "expected_pv_energy_kwh": 10.96,
        "expected_pv_energy_lower_kwh": 9.4,
        "expected_pv_energy_upper_kwh": 12.5,
        "expected_grid_energy_kwh": 18.34,
        "expected_pv_share_percent": 37,
        "departure_readiness_percent": 100,
        "departure_risk": False,
        "charging_window_active": False,
        "pv_charging_recommended": False,
        "estimated_immediate_cost_eur": 10.81,
        "estimated_advised_cost_eur": 4.25,
        "estimated_cost_advantage_eur": 6.56,
        "electricity_price_ct_per_kwh": 36.9,
        "feed_in_tariff_ct_per_kwh": 8.2,
        "data_quality_percent": 96,
        "allocation_origin": "stats_household_then_heat_pump_then_battery_then_wallbox",
        "advisory_only": True,
        "control_services_called": False,
        "hours": _mobility_hours(),
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
        "provider_version": 4,
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
