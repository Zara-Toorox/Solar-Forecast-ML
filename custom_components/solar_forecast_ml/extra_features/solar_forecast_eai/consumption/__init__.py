# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

"""
Consumption module for Solar Forecast Energy AI.

Contains heat pump consumption tracking, scheduling, and forecast management components.
Class names retain 'Production' prefix from SFML origin — deep refactoring planned.

@zara
"""

from .consumption_adaptive_forecast import AdaptiveForecastEngine
from .consumption_external_helpers import (
    BaseExternalSensor,
    SensorValueExtractor,
    format_time_ago,
)
from .consumption_history import ProductionCalculator
from .consumption_morning_routine import MorningRoutineHandler
from .consumption_rule_based_strategy import RuleBasedForecastStrategy
from .consumption_scheduled_tasks import ScheduledTasksManager
from .consumption_task_executor import TaskExecutor, TaskQueue
from .consumption_task_scheduler import TaskScheduler, ScheduledTaskTracker
from .consumption_tracker import ProductionTimeCalculator

__all__ = [
    "AdaptiveForecastEngine",
    "BaseExternalSensor",
    "SensorValueExtractor",
    "format_time_ago",
    "ProductionCalculator",
    "MorningRoutineHandler",
    "RuleBasedForecastStrategy",
    "ScheduledTasksManager",
    "TaskExecutor",
    "TaskQueue",
    "TaskScheduler",
    "ScheduledTaskTracker",
    "ProductionTimeCalculator",
]
