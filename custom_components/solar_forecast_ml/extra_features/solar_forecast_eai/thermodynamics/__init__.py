# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast Energy AI
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-eai/blob/main/LICENSE
# ******************************************************************************

"""Thermodynamics module exports. @zara"""

from .thermodynamics_engine import (
    ThermodynamicsEngine,
    WeatherConditions,
    HeatPumpConfig,
    HeatingResult,
    DailyConsumptionResult,
)
from .thermodynamics_calibrator import (
    ThermodynamicsCalibrator,
    TemperatureBucket,
    BucketFactors,
    CalibrationResult,
)

__all__ = [
    # Thermodynamics Engine
    "ThermodynamicsEngine",
    "WeatherConditions",
    "HeatPumpConfig",
    "HeatingResult",
    "DailyConsumptionResult",
    # Thermodynamics Calibrator
    "ThermodynamicsCalibrator",
    "TemperatureBucket",
    "BucketFactors",
    "CalibrationResult",
]
