# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

# *****************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast Energy AI
# Refactored: JSON replaced with DatabaseManager @zara
# *****************************************************************************

"""
Service registration for Solar Forecast Energy AI.
Central registration and handling of all integration services.
Uses DatabaseManager for all data operations.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Awaitable, Callable, List, Optional

if TYPE_CHECKING:
    from ..coordinator import SolarForecastEAICoordinator

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall

from ..const import (
    DOMAIN,
    SERVICE_ANALYZE_FEATURE_IMPORTANCE,
    SERVICE_RUN_WEATHER_CORRECTION,
    SERVICE_REFRESH_MULTI_WEATHER,
    SERVICE_RESET_AI_MODEL,
    SERVICE_RETRAIN_AI_MODEL,
    SERVICE_RUN_ADAPTIVE_FORECAST,
    SERVICE_RUN_ALL_DAY_END_TASKS,
    SERVICE_RUN_GRID_SEARCH,
    SERVICE_SEND_DAILY_BRIEFING,
    SERVICE_TEST_MORNING_ROUTINE,
)
from ..const import CONF_WINTER_MODE, DEFAULT_WINTER_MODE
from ..core.core_helpers import SafeDateTimeUtil as dt_util
from ..data.db_manager import DatabaseManager

_LOGGER = logging.getLogger(__name__)


@dataclass
class ServiceDefinition:
    """Service definition for registration. @zara"""

    name: str
    handler: Callable[[ServiceCall], Awaitable[None]]
    description: str = ""


class ServiceRegistry:
    """Central service registry for Solar Forecast Energy AI. @zara"""

    def __init__(
        self, hass: HomeAssistant, entry: ConfigEntry, coordinator: "SolarForecastEAICoordinator"
    ):
        """Initialize service registry. @zara"""
        self.hass = hass
        self.entry = entry
        self.coordinator = coordinator
        self._registered_services: List[str] = []

        self._daily_briefing_handler = None

    @property
    def db_manager(self) -> Optional[DatabaseManager]:
        """Get database manager from coordinator. @zara V16.1 fix"""
        data_manager = getattr(self.coordinator, "data_manager", None)
        if data_manager:
            return getattr(data_manager, "_db_manager", None)
        return None

    async def async_register_all_services(self) -> None:
        """Register all services. @zara"""
        from ..services.service_daily_briefing import DailyBriefingService

        self._daily_briefing_handler = DailyBriefingService(self.hass, self.coordinator)

        services = self._build_service_definitions()

        for service in services:
            self.hass.services.async_register(DOMAIN, service.name, service.handler)
            self._registered_services.append(service.name)

        _LOGGER.debug(f"Registered {len(services)} services")

    def unregister_all_services(self) -> None:
        """Unregister all services. @zara"""
        for service_name in self._registered_services:
            if self.hass.services.has_service(DOMAIN, service_name):
                self.hass.services.async_remove(DOMAIN, service_name)

        self._registered_services.clear()

    def _build_service_definitions(self) -> List[ServiceDefinition]:
        """Build all service definitions. @zara"""
        _W = (
            "DEVELOPER ONLY - potentially destructive! "
            "/ NUR FUER ENTWICKLER - potenziell destruktiv! — "
        )
        _WD = (
            "DEVELOPER ONLY - DESTRUCTIVE! "
            "/ NUR FUER ENTWICKLER - DESTRUKTIV! — "
        )
        return [
            # AI Services
            ServiceDefinition(
                name=SERVICE_RETRAIN_AI_MODEL,
                handler=self._handle_retrain_ai_model,
                description=_W + "Retrain TinyLSTM AI model with current data",
            ),
            ServiceDefinition(
                name=SERVICE_RESET_AI_MODEL,
                handler=self._handle_reset_ai_model,
                description=_WD + "Reset TinyLSTM AI model to untrained state",
            ),
            ServiceDefinition(
                name=SERVICE_RUN_GRID_SEARCH,
                handler=self._handle_run_grid_search,
                description=_WD + "Run Grid-Search hyperparameter optimization. Resets LSTM model",
            ),
            ServiceDefinition(
                name=SERVICE_ANALYZE_FEATURE_IMPORTANCE,
                handler=self._handle_analyze_feature_importance,
                description=_W + "Analyze feature importance using Permutation Importance",
            ),
            # Emergency Services
            ServiceDefinition(
                name=SERVICE_RUN_ALL_DAY_END_TASKS,
                handler=self._handle_run_all_day_end_tasks,
                description=_WD + "Run ALL day-end tasks (EOD workflow)",
            ),
            # Testing Services
            ServiceDefinition(
                name=SERVICE_TEST_MORNING_ROUTINE,
                handler=self._handle_test_morning_routine,
                description=_W + "Execute complete morning routine (overwrites forecasts)",
            ),
            ServiceDefinition(
                name=SERVICE_RUN_ADAPTIVE_FORECAST,
                handler=self._handle_run_adaptive_forecast,
                description=_W + "Manually trigger adaptive midday forecast correction",
            ),
            # Weather Services
            ServiceDefinition(
                name=SERVICE_RUN_WEATHER_CORRECTION,
                handler=self._handle_run_weather_correction,
                description=_W + "Trigger corrected forecast generation (overwrites weather_forecast)",
            ),
            ServiceDefinition(
                name=SERVICE_REFRESH_MULTI_WEATHER,
                handler=self._handle_refresh_multi_weather,
                description=_W + "Refresh Multi-Weather cache (5-source blending)",
            ),
            # Notification Services
            ServiceDefinition(
                name=SERVICE_SEND_DAILY_BRIEFING,
                handler=self._handle_send_daily_briefing,
                description="Send daily energy consumption briefing notification",
            ),
        ]

    # =========================================================================
    # AI Services
    # =========================================================================

    async def _handle_retrain_ai_model(self, call: ServiceCall) -> None:
        """Handle retrain_ai_model service. @zara"""
        try:
            if self.coordinator.ai_predictor:
                _LOGGER.info("Service: retrain_ai_model - Starting AI training")
                result = await self.coordinator.ai_predictor.train_model()
                if result.success:
                    _LOGGER.info(
                        f"AI model training complete: R2={result.accuracy:.3f}, "
                        f"samples={result.samples_used}"
                    )
                else:
                    _LOGGER.error(f"AI model training failed: {result.error_message}")
            else:
                _LOGGER.warning("AI predictor not available")
        except Exception as e:
            _LOGGER.error(f"Error in retrain_ai_model: {e}")

    async def _handle_reset_ai_model(self, call: ServiceCall) -> None:
        """Handle reset_ai_model service. @zara"""
        try:
            if self.coordinator.ai_predictor:
                _LOGGER.info("Service: reset_ai_model - Resetting AI model")
                success = await self.coordinator.ai_predictor.initialize()
                if success:
                    _LOGGER.info("AI model reset to untrained state")
                else:
                    _LOGGER.error("AI model reset failed")
            else:
                _LOGGER.warning("AI predictor not available")
        except Exception as e:
            _LOGGER.error(f"Error in reset_ai_model: {e}")

    async def _handle_run_grid_search(self, call: ServiceCall) -> None:
        """Handle run_grid_search service - Run hyperparameter optimization. @zara

        WARNING: DESTRUCTIVE SERVICE - Developer/Expert use only!
        This service replaces the current LSTM model with new hyperparameters.
        All learned weights and training progress will be lost.
        Only run on explicit instruction or during development.
        """
        from ..ai import GridSearchOptimizer, TinyLSTM
        from ..ai.ai_grid_search import detect_hardware

        _LOGGER.warning(
            "SERVICE: run_grid_search - DESTRUCTIVE OPERATION! "
            "This will reset the LSTM model and replace all learned weights. "
            "Only run on explicit developer instruction."
        )
        _LOGGER.info("SERVICE: run_grid_search - Starting in background")

        # Run actual grid search in background to not block
        async def _run_grid_search_background():
            try:
                # Run hardware detection in executor to avoid blocking I/O warnings
                hw_info = await self.hass.async_add_executor_job(detect_hardware)
                _LOGGER.info(f"Hardware: {hw_info.architecture}, {hw_info.cpu_count} CPUs")

                if not hw_info.grid_search_allowed:
                    _LOGGER.warning(f"Grid-Search not available: {hw_info.reason}")
                    return

                if not self.coordinator.ai_predictor:
                    _LOGGER.error("AI predictor not available")
                    return

                predictor = self.coordinator.ai_predictor

                _LOGGER.info("Loading training data...")
                X_sequences, y_targets, _ = await predictor._prepare_training_data()

                if len(X_sequences) < 50:
                    _LOGGER.error(f"Not enough training data: {len(X_sequences)} samples (need 50+)")
                    return

                _LOGGER.info(f"Loaded {len(X_sequences)} training samples")

                optimizer = GridSearchOptimizer(
                    db_manager=predictor.db_manager,
                    hardware_info=hw_info  # Pass cached hardware info to avoid re-detection
                )

                async def progress_callback(current, total, params, accuracy):
                    _LOGGER.info(
                        f"Grid-Search progress: {current}/{total} - "
                        f"hidden={params.get('hidden_size')}, R2={accuracy:.4f}"
                    )

                from ..ai.ai_predictor import calculate_feature_count

                feature_count = calculate_feature_count(predictor.num_groups)
                num_outputs = predictor.num_groups if predictor.num_groups > 0 else 1

                result = await optimizer.run_grid_search(
                    lstm_class=TinyLSTM,
                    X_sequences=X_sequences,
                    y_targets=y_targets,
                    input_size=feature_count,
                    sequence_length=24,
                    num_outputs=num_outputs,
                    progress_callback=progress_callback,
                )

                if not result.success:
                    _LOGGER.error(f"Grid-Search failed: {result.error_message}")
                    return

                _LOGGER.info(f"GRID-SEARCH COMPLETE: Best R2={result.best_accuracy:.4f}")

                retrain_after = call.data.get("retrain_after", True)

                if retrain_after and result.best_params:
                    _LOGGER.info("Retraining model with optimal parameters...")
                    predictor.lstm = TinyLSTM(
                        input_size=feature_count,
                        hidden_size=result.best_params.get("hidden_size", 32),
                        sequence_length=24,
                        num_outputs=num_outputs,
                        learning_rate=result.best_params.get("learning_rate", 0.005),
                    )
                    train_result = await predictor.train_model()
                    if train_result.success:
                        _LOGGER.info(f"Retrained model: R2={train_result.accuracy:.4f}")

            except Exception as e:
                _LOGGER.error(f"Error in run_grid_search: {e}", exc_info=True)

        # Start grid search in background
        self.hass.async_create_task(
            _run_grid_search_background(),
            name="solar_forecast_eai_grid_search"
        )
        _LOGGER.info("Grid-Search started in background")

    async def _handle_analyze_feature_importance(self, call: ServiceCall) -> None:
        """Handle analyze_feature_importance service. @zara"""
        _LOGGER.info("SERVICE: analyze_feature_importance")

        try:
            if not self.coordinator.ai_predictor:
                _LOGGER.error("AI predictor not available")
                return

            predictor = self.coordinator.ai_predictor
            num_permutations = call.data.get("num_permutations", 5)

            async def progress_callback(current, total, feature_name):
                _LOGGER.debug(f"Feature Importance: {current}/{total} - {feature_name}")

            result = await predictor.analyze_feature_importance(
                num_permutations=num_permutations,
                progress_callback=progress_callback,
            )

            if result is None or not result.success:
                error_msg = result.error_message if result else "Unknown error"
                _LOGGER.error(f"Feature Importance analysis failed: {error_msg}")
                return

            _LOGGER.info(f"FEATURE IMPORTANCE COMPLETE: Baseline RMSE={result.baseline_rmse:.4f}")

        except Exception as e:
            _LOGGER.error(f"Error in analyze_feature_importance: {e}", exc_info=True)

    # =========================================================================
    # Emergency Services
    # =========================================================================

    async def _handle_run_all_day_end_tasks(self, call: ServiceCall) -> None:
        """Handle run_all_day_end_tasks service. @zara"""
        try:
            if hasattr(self.coordinator, "scheduled_tasks"):
                await self.coordinator.scheduled_tasks.end_of_day_workflow(None)
        except Exception as e:
            _LOGGER.error(f"Error in run_all_day_end_tasks: {e}")

    # =========================================================================
    # Testing Services
    # =========================================================================

    async def _handle_test_morning_routine(self, call: ServiceCall) -> None:
        """Handle test_morning_routine service. @zara"""
        _LOGGER.info("SERVICE: test_morning_routine called")
        try:
            if not hasattr(self.coordinator, "scheduled_tasks"):
                _LOGGER.error("SERVICE: test_morning_routine FAILED - scheduled_tasks not available on coordinator")
                return
            if self.coordinator.scheduled_tasks is None:
                _LOGGER.error("SERVICE: test_morning_routine FAILED - scheduled_tasks is None")
                return
            _LOGGER.info("SERVICE: test_morning_routine - executing _execute_morning_routine()...")
            success = await self.coordinator.scheduled_tasks._execute_morning_routine()
            if success:
                _LOGGER.info("SERVICE: test_morning_routine COMPLETED SUCCESSFULLY")
            else:
                _LOGGER.error("SERVICE: test_morning_routine COMPLETED but returned False (check logs above)")
        except Exception as e:
            _LOGGER.error(f"SERVICE: test_morning_routine EXCEPTION: {e}", exc_info=True)

    async def _handle_run_adaptive_forecast(self, call: ServiceCall) -> None:
        """Handle run_adaptive_forecast service — manual trigger. @zara"""
        _LOGGER.info("SERVICE: run_adaptive_forecast — manual trigger")
        try:
            if not hasattr(self.coordinator, "scheduled_tasks") or \
               not self.coordinator.scheduled_tasks:
                _LOGGER.error("Scheduled tasks not available")
                return

            engine = getattr(
                self.coordinator.scheduled_tasks, "adaptive_forecast_engine", None
            )
            if not engine:
                _LOGGER.error("Adaptive forecast engine not available")
                return

            await engine.run_midday_check(manual=True)
            _LOGGER.info("SERVICE: run_adaptive_forecast — completed")

        except Exception as e:
            _LOGGER.error("Error in run_adaptive_forecast: %s", e, exc_info=True)

    # =========================================================================
    # Weather Services
    # =========================================================================

    async def _handle_run_weather_correction(self, call: ServiceCall) -> None:
        """Handle run_weather_correction service. @zara"""
        try:
            from ..data.data_weather_corrector import WeatherForecastCorrector

            winter_mode = DEFAULT_WINTER_MODE
            if self.coordinator.config_entry:
                winter_mode = self.coordinator.config_entry.options.get(
                    CONF_WINTER_MODE, DEFAULT_WINTER_MODE
                )

            corrector = WeatherForecastCorrector(
                self.hass,
                self.coordinator.data_manager._db_manager,
                winter_mode=winter_mode,
            )
            success = await corrector.create_corrected_forecast()

            if not success:
                _LOGGER.warning("Corrected forecast generation failed")

        except Exception as e:
            _LOGGER.error(f"Error in run_weather_correction: {e}")

    async def _handle_refresh_multi_weather(self, call: ServiceCall) -> None:
        """Handle refresh_multi_weather service. @zara"""
        try:
            if not hasattr(self.coordinator, "weather_pipeline_manager"):
                _LOGGER.warning("Weather pipeline manager not available")
                return

            pipeline = self.coordinator.weather_pipeline_manager
            force_update = call.data.get("force_update", False) or call.data.get(
                "force_wttr_refresh", False
            )

            _LOGGER.info(f"Service: refresh_multi_weather (force={force_update})")

            success = await pipeline.update_weather_cache(force=force_update)

            if success:
                stats = {}
                if pipeline.weather_expert_blender:
                    stats = pipeline.weather_expert_blender.get_blend_stats()
                _LOGGER.info(
                    f"5-source weather refresh complete: "
                    f"{stats.get('active_sources', 0)} sources active"
                )
            else:
                _LOGGER.warning("Weather refresh failed")

        except Exception as e:
            _LOGGER.error(f"Error in refresh_multi_weather: {e}", exc_info=True)

    # =========================================================================
    # Notification Services
    # =========================================================================

    async def _handle_send_daily_briefing(self, call: ServiceCall) -> None:
        """Handle send_daily_briefing service. @zara"""
        _LOGGER.info("Service: send_daily_briefing")
        try:
            if not self._daily_briefing_handler:
                _LOGGER.error("Daily briefing handler not initialized")
                return

            notify_service = call.data.get("notify_service", "persistent_notification")
            language = call.data.get("language", "de")

            result = await self._daily_briefing_handler.send_daily_briefing(
                notify_service=notify_service,
                language=language,
            )

            if result.get("success"):
                _LOGGER.info(f"Daily briefing sent successfully: {result.get('title')}")
            else:
                _LOGGER.error(f"Failed to send daily briefing: {result.get('error')}")

        except Exception as err:
            _LOGGER.error(f"Error in send_daily_briefing service: {err}", exc_info=True)
