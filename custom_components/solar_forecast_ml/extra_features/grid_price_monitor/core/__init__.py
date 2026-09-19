# ******************************************************************************
# @copyright (C) 2025 Zara-Toorox - Solar Forecast ML
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

from .price_service import ElectricityPriceService
from .battery_tracker import BatteryTracker
from .calculator import PriceCalculator
from .thresholds import (
    DEFAULT_BELOW_AVERAGE_PCT,
    DEFAULT_CHEAPEST_HOURS,
    DEFAULT_FORCE_CHARGE_PRICE,
    DEFAULT_THRESHOLD_MODE,
    THRESHOLD_LIMITS,
    THRESHOLD_MODE_ABSOLUTE,
    THRESHOLD_MODE_BELOW_AVERAGE,
    THRESHOLD_MODE_CHEAPEST_HOURS,
    THRESHOLD_MODES,
    DayThresholds,
    ThresholdConfig,
    evaluate_current,
    evaluate_day,
    merge_and_validate_thresholds,
    slot_is_cheap,
    threshold_options,
    thresholds_payload,
)

__all__ = [
    "ElectricityPriceService",
    "BatteryTracker",
    "PriceCalculator",
    "DEFAULT_BELOW_AVERAGE_PCT",
    "DEFAULT_CHEAPEST_HOURS",
    "DEFAULT_FORCE_CHARGE_PRICE",
    "DEFAULT_THRESHOLD_MODE",
    "THRESHOLD_LIMITS",
    "THRESHOLD_MODE_ABSOLUTE",
    "THRESHOLD_MODE_BELOW_AVERAGE",
    "THRESHOLD_MODE_CHEAPEST_HOURS",
    "THRESHOLD_MODES",
    "DayThresholds",
    "ThresholdConfig",
    "evaluate_current",
    "evaluate_day",
    "merge_and_validate_thresholds",
    "slot_is_cheap",
    "threshold_options",
    "thresholds_payload",
]
