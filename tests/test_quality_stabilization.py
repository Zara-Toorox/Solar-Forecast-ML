import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "custom_components/solar_forecast_ml/src/originale"
PKG = "custom_components.solar_forecast_ml.src.originale"


def _package(name):
    module = sys.modules.get(name)
    if module is None:
        module = types.ModuleType(name)
        module.__path__ = []
        sys.modules[name] = module
    return module


def _module(name, **attrs):
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules[name] = module
    return module


def _install_stubs():
    for name in [
        "custom_components",
        "custom_components.solar_forecast_ml",
        "custom_components.solar_forecast_ml.src",
        PKG,
        f"{PKG}.data",
        f"{PKG}.ai",
        f"{PKG}.forecast",
        f"{PKG}.production",
        f"{PKG}.core",
        f"{PKG}.astronomy",
        f"{PKG}.physics",
    ]:
        _package(name)

    class DataManagerIO:
        def __init__(self, hass=None, db_manager=None):
            self.hass = hass
            self.db = db_manager

    class SafeDateTimeUtil:
        @staticmethod
        def now():
            from datetime import datetime
            return datetime(2026, 5, 10)

        @staticmethod
        def ensure_local(value):
            return value

    _module("homeassistant")
    _module("homeassistant.core", HomeAssistant=object)
    _module("homeassistant.util")
    _module("homeassistant.util.dt", now=SafeDateTimeUtil.now)
    _module(f"{PKG}.data.db_manager", DatabaseManager=object)
    _module(f"{PKG}.data.data_io", DataManagerIO=DataManagerIO)
    _module(f"{PKG}.core.core_helpers", SafeDateTimeUtil=SafeDateTimeUtil, get_season=lambda month: "spring")
    _module(f"{PKG}.ai.ai_tiny_lstm", TinyLSTM=object)
    _module(f"{PKG}.ai.ai_tiny_ridge", TinyRidge=object)
    _module(f"{PKG}.ai.ai_feature_engineering", FeatureEngineer=object)
    _module(f"{PKG}.ai.ai_seasonal", SeasonalAdjuster=object)
    _module(f"{PKG}.ai.ai_dni_tracker", DniTracker=object)
    _module(
        f"{PKG}.ai.ai_feature_importance",
        FeatureImportanceAnalyzer=object,
        FeatureImportanceResult=object,
    )
    _module(f"{PKG}.astronomy.astronomy_cache_manager", get_cache_manager=lambda *a, **k: None)
    _module(
        f"{PKG}.physics",
        PhysicsEngine=object,
        PanelGroupCalculator=object,
        PanelGroup=object,
        IrradianceData=object,
        SunPosition=object,
        PhysicsCalibrator=object,
    )
    _module(f"{PKG}.data.data_frost_detection", estimate_frost_from_forecast=lambda *a, **k: None)
    _module(f"{PKG}.forecast.forecast_strategy_base", ForecastResult=object, ForecastStrategy=object)
    _module(f"{PKG}.forecast.forecast_weather_calculator", WeatherCalculator=object)

    class ForecastRegenerationHelper:
        def __init__(self, *args, **kwargs):
            pass

    _module(
        f"{PKG}.production.production_forecast_regeneration",
        ForecastRegenerationHelper=ForecastRegenerationHelper,
    )


def _load_source_module(relative_path, module_name):
    _install_stubs()
    spec = importlib.util.spec_from_file_location(module_name, SOURCE_ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


class QualityStabilizationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reader_mod = _load_source_module(
            "data/data_panel_group_sensor_reader.py",
            f"{PKG}.data.data_panel_group_sensor_reader",
        )
        cls.ai_mod = _load_source_module(
            "ai/ai_predictor.py",
            f"{PKG}.ai.ai_predictor",
        )
        cls.forecast_mod = _load_source_module(
            "forecast/forecast_rule_based_strategy.py",
            f"{PKG}.forecast.forecast_rule_based_strategy",
        )
        cls.operational_mod = _load_source_module(
            "production/production_operational_reforecast.py",
            f"{PKG}.production.production_operational_reforecast",
        )

    def test_live_group_delta_rejects_reset_spike(self):
        reader = object.__new__(self.reader_mod.PanelGroupSensorReader)
        reader.panel_groups = [{"name": "Gruppe 1", "capacity_kwp": 1.0}]

        self.assertIsNone(reader._validate_hourly_delta("Gruppe 1", 723807.5915, "test"))
        self.assertIsNone(reader._validate_hourly_delta("Gruppe 1", -0.2, "test"))
        self.assertEqual(reader._validate_hourly_delta("Gruppe 1", 1.2, "test"), 1.2)

    def test_training_group_targets_drop_poison_and_sum_mismatch(self):
        predictor = object.__new__(self.ai_mod.AIPredictor)
        predictor.panel_groups = [
            {"name": "Gruppe 1", "capacity_kwp": 1.0},
            {"name": "Gruppe 2", "capacity_kwp": 1.0},
        ]
        predictor._max_kwh_per_hour = 2.0

        poison = predictor._validate_panel_group_actuals_for_training(
            {"Gruppe 1": 723807.5915, "Gruppe 2": 0.4},
            1.7,
        )
        self.assertEqual(poison, {"Gruppe 2": 0.4})

        mismatch = predictor._validate_panel_group_actuals_for_training(
            {"Gruppe 1": 1.2, "Gruppe 2": 1.2},
            0.8,
        )
        self.assertEqual(mismatch, {})

        valid = predictor._validate_panel_group_actuals_for_training(
            {"Gruppe 1": 0.5, "Gruppe 2": 0.6},
            1.1,
        )
        self.assertEqual(valid, {"Gruppe 1": 0.5, "Gruppe 2": 0.6})

    def test_operational_reforecast_notifies_ops_sensor_listeners(self):
        class Coordinator:
            def __init__(self):
                self.called = 0

            def async_update_listeners(self):
                self.called += 1

        coordinator = Coordinator()
        engine = object.__new__(self.operational_mod.OperationalReforecastEngine)
        engine.coordinator = coordinator

        engine._notify_operational_forecast_updated()

        self.assertEqual(coordinator.called, 1)

    def test_ai_floor_is_regime_and_blend_aware(self):
        strategy = object.__new__(self.forecast_mod.RuleBasedForecastStrategy)

        learned_blend_better_ai_worse = {
            "sample_count": 40,
            "advantage_factor": 0.5,
            "physics_mae": 0.297,
            "ai_mae": 0.8673,
            "blend_mae": 0.2477,
        }
        mixed_floor = strategy._calculate_learned_ai_confidence_floor(
            learned_blend_better_ai_worse,
            self.forecast_mod.BLEND_REGIME_MIXED,
        )
        self.assertGreaterEqual(mixed_floor, 0.30)

        cloud_edge_floor = strategy._calculate_learned_ai_confidence_floor(
            learned_blend_better_ai_worse,
            self.forecast_mod.BLEND_REGIME_CLOUD_EDGE,
        )
        self.assertGreaterEqual(cloud_edge_floor, 0.15)

        learned_all_ai_worse = {
            "sample_count": 40,
            "advantage_factor": 0.5,
            "physics_mae": 0.1219,
            "ai_mae": 0.5389,
            "blend_mae": 0.1359,
        }
        self.assertEqual(
            strategy._calculate_learned_ai_confidence_floor(
                learned_all_ai_worse,
                self.forecast_mod.BLEND_REGIME_BAD_WEATHER,
            ),
            0.0,
        )

        good_weather_floor = strategy._calculate_learned_ai_confidence_floor(
            learned_all_ai_worse,
            self.forecast_mod.BLEND_REGIME_STABLE_GOOD,
        )
        self.assertGreaterEqual(good_weather_floor, 0.30)

    def test_bad_weather_guard_only_applies_to_true_bad_weather_regime(self):
        mixed = self.forecast_mod._classify_blend_weather_regime(
            clouds=69.0,
            ghi=160.0,
            dni=40.0,
            dhi=120.0,
            clear_sky=600.0,
            rain=0.0,
            humidity=70.0,
            sun_elevation=25.0,
            hour=16,
        )
        self.assertEqual(mixed, self.forecast_mod.BLEND_REGIME_CLOUD_EDGE)
        self.assertFalse(self.forecast_mod._should_apply_bad_weather_ai_guard(mixed))

        bad = self.forecast_mod._classify_blend_weather_regime(
            clouds=92.0,
            ghi=90.0,
            dni=5.0,
            dhi=85.0,
            clear_sky=600.0,
            rain=0.3,
            humidity=90.0,
            sun_elevation=25.0,
            hour=12,
        )
        self.assertEqual(bad, self.forecast_mod.BLEND_REGIME_BAD_WEATHER)
        self.assertTrue(self.forecast_mod._should_apply_bad_weather_ai_guard(bad))

    def test_rainy_diffuse_low_ghi_hour_is_bad_weather(self):
        regime = self.forecast_mod._classify_blend_weather_regime(
            clouds=58.0,
            ghi=216.6,
            dni=39.0,
            dhi=172.3,
            clear_sky=588.6,
            rain=0.2,
            humidity=64.0,
            sun_elevation=43.9,
            hour=15,
        )
        self.assertEqual(regime, self.forecast_mod.BLEND_REGIME_BAD_WEATHER)

        weather_regime = self.forecast_mod._classify_static_forecast_weather_regime(
            clouds=58.0,
            ghi=216.6,
            dni=39.0,
            dhi=172.3,
            clear_sky=588.6,
            rain=0.2,
            humidity=64.0,
            sun_elevation=43.9,
            hour=15,
        )
        self.assertEqual(weather_regime, self.forecast_mod.WEATHER_REGIME_RAIN_OVERCAST)

    def test_static_policy_boosts_tfs_only_for_dry_mixed_upside(self):
        adjusted, reason = self.forecast_mod.StaticForecastBlendPolicy.adjust_tfs_weight(
            0.371,
            blend_regime=self.forecast_mod.BLEND_REGIME_CLOUD_EDGE,
            physics_pred=0.233,
            ai_pred=0.359,
            tfs_pred=0.872,
            rain=0.0,
            humidity=40.2,
            sun_elevation=36.8,
        )
        self.assertEqual(reason, "mixed_cloud_edge_tfs_upside")
        self.assertGreaterEqual(adjusted, 0.72)

        unchanged, reason = self.forecast_mod.StaticForecastBlendPolicy.adjust_tfs_weight(
            0.406,
            blend_regime=self.forecast_mod.BLEND_REGIME_CLOUD_EDGE,
            physics_pred=0.214,
            ai_pred=0.571,
            tfs_pred=0.601,
            rain=0.0,
            humidity=44.9,
            sun_elevation=36.4,
        )
        self.assertIsNone(reason)
        self.assertEqual(unchanged, 0.406)

        strong, reason = self.forecast_mod.StaticForecastBlendPolicy.adjust_tfs_weight(
            0.379,
            blend_regime=self.forecast_mod.BLEND_REGIME_CLOUD_EDGE,
            physics_pred=0.233,
            ai_pred=0.359,
            tfs_pred=0.872,
            rain=0.0,
            humidity=40.2,
            sun_elevation=36.8,
        )
        self.assertEqual(reason, "mixed_cloud_edge_tfs_upside")
        self.assertGreaterEqual(strong, 0.78)

    def test_bad_weather_policy_caps_tfs_before_regime_learning(self):
        adjusted, reason = self.forecast_mod.StaticForecastBlendPolicy.adjust_tfs_weight(
            0.50,
            blend_regime=self.forecast_mod.BLEND_REGIME_BAD_WEATHER,
            weather_regime=self.forecast_mod.WEATHER_REGIME_RAIN_OVERCAST,
            regime_learning={"sample_count": 0},
            physics_pred=0.30,
            ai_pred=0.40,
            tfs_pred=0.90,
            rain=0.4,
            humidity=78.0,
            sun_elevation=35.0,
        )

        self.assertEqual(reason, "bad_weather_tfs_basis_cap")
        self.assertLessEqual(
            adjusted,
            self.forecast_mod.BAD_WEATHER_TFS_RAIN_OVERCAST_MAX_WEIGHT,
        )

    def test_bad_weather_policy_does_not_force_ai_floor_when_ai_is_worse(self):
        learned_blend_better_ai_worse = {
            "sample_count": 20,
            "advantage_factor": 0.5,
            "physics_mae": 0.2105,
            "ai_mae": 0.6078,
            "blend_mae": 0.1699,
        }
        strategy = object.__new__(self.forecast_mod.RuleBasedForecastStrategy)
        self.assertEqual(
            strategy._calculate_learned_ai_confidence_floor(
                learned_blend_better_ai_worse,
                self.forecast_mod.BLEND_REGIME_BAD_WEATHER,
            ),
            0.0,
        )

    def test_weather_regime_learning_overrides_generic_method_bucket(self):
        generic = {
            "sample_count": 40,
            "advantage_factor": 1.0,
            "physics_mae": 0.30,
            "ai_mae": 0.25,
            "blend_mae": 0.20,
        }
        shadow_regime = {
            "sample_count": 12,
            "physics_mae": 0.12,
            "ai_mae": 0.48,
            "blend_mae": 0.18,
        }
        self.assertEqual(
            self.forecast_mod.StaticForecastBlendPolicy.merge_regime_learning(
                generic,
                shadow_regime,
            ),
            generic,
        )

        regime = {
            "sample_count": 30,
            "physics_mae": 0.12,
            "ai_mae": 0.48,
            "blend_mae": 0.18,
        }

        merged = self.forecast_mod.StaticForecastBlendPolicy.merge_regime_learning(
            generic,
            regime,
        )

        self.assertEqual(merged["physics_mae"], 0.12)
        self.assertEqual(merged["ai_mae"], 0.48)
        self.assertEqual(merged["sample_count"], 30)
        self.assertEqual(merged["advantage_factor"], 0.5)

    def test_weather_regime_learning_caps_tfs_when_bad_weather_tfs_is_risky(self):
        adjusted, reason = self.forecast_mod.StaticForecastBlendPolicy.adjust_tfs_weight(
            0.45,
            blend_regime=self.forecast_mod.BLEND_REGIME_BAD_WEATHER,
            weather_regime=self.forecast_mod.WEATHER_REGIME_RAIN_OVERCAST,
            regime_learning={
                "sample_count": 30,
                "blend_mae": 0.18,
                "tfs_mae": 0.26,
                "tfs_bias": 0.11,
            },
            physics_pred=0.30,
            ai_pred=0.40,
            tfs_pred=0.50,
            rain=0.8,
            humidity=91.0,
            sun_elevation=24.0,
        )

        self.assertEqual(reason, "regime_tfs_risk_cap")
        self.assertLessEqual(adjusted, 0.20)

    def test_weather_regime_learning_applies_bounded_bias_correction(self):
        adjusted, reason = self.forecast_mod.StaticForecastBlendPolicy.adjust_prediction_for_regime_bias(
            0.80,
            {
                "sample_count": 40,
                "blend_bias": 0.30,
            },
            blend_regime=self.forecast_mod.BLEND_REGIME_BAD_WEATHER,
            capacity=2.0,
        )

        self.assertEqual(reason, "regime_bias_correction")
        self.assertLess(adjusted, 0.80)
        self.assertGreaterEqual(adjusted, 0.52)


if __name__ == "__main__":
    unittest.main()
