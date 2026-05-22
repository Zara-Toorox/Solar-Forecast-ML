# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast ML DB-Version
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://github.com/Zara-Toorox/ha-solar-forecast-ml/blob/main/LICENSE
# ******************************************************************************

"""Panel group forecast consistency helpers."""

from typing import Any, Dict, List, Optional


def sync_panel_group_prediction_map(groups: List[Dict[str, Any]]) -> Dict[str, float]:
    return {
        group["name"]: round(float(group.get("power_kwh") or 0.0), 4)
        for group in groups
        if group.get("name")
    }


def normalize_group_predictions_to_total(
    groups: Optional[List[Dict[str, Any]]],
    target_total: float,
) -> Optional[List[Dict[str, Any]]]:
    if not groups:
        return groups

    target = round(max(0.0, float(target_total or 0.0)), 3)
    normalized_groups = [dict(group) for group in groups]

    if target <= 0:
        for group in normalized_groups:
            group["power_kwh"] = 0.0
            group["contribution_percent"] = 0.0
        return normalized_groups

    current_values = [max(0.0, float(group.get("power_kwh") or 0.0)) for group in normalized_groups]
    current_total = sum(current_values)

    if current_total > 0:
        raw_values = [value * target / current_total for value in current_values]
    else:
        capacities = [max(0.0, float(group.get("capacity_kwp") or 0.0)) for group in normalized_groups]
        capacity_total = sum(capacities)
        if capacity_total > 0:
            raw_values = [target * capacity / capacity_total for capacity in capacities]
        else:
            share = target / len(normalized_groups)
            raw_values = [share for _ in normalized_groups]

    rounded_values = [round(value, 4) for value in raw_values]
    residual = round(target - sum(rounded_values), 4)
    if rounded_values and abs(residual) >= 0.0001:
        if residual >= 0:
            adjust_index = max(range(len(rounded_values)), key=lambda idx: rounded_values[idx])
        else:
            adjust_index = max(
                range(len(rounded_values)),
                key=lambda idx: rounded_values[idx] if rounded_values[idx] + residual >= 0 else -1.0,
            )
        rounded_values[adjust_index] = round(max(0.0, rounded_values[adjust_index] + residual), 4)

    normalized_total = sum(rounded_values)
    for group, value in zip(normalized_groups, rounded_values):
        group["power_kwh"] = value
        group["contribution_percent"] = round(value / normalized_total * 100, 1) if normalized_total > 0 else 0.0

    return normalized_groups
