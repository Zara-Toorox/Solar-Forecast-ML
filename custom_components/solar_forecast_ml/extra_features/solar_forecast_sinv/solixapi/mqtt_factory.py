# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# * Based on ha-anker-solix by Thomas Luther (@thomluther), MIT License,
#   Copyright (c) 2024 Thomas Luther. MIT notice: LICENSE-ha-anker-solix
# ******************************************************************************

"""Device factory for creating appropriate Anker Solix MQTT device control instances. @thomas"""

from __future__ import annotations  # noqa: TID251

from typing import TYPE_CHECKING

from .apitypes import SolixDeviceType
from .mqtt_charger import MODELS as CHARGER_MODELS
from .mqtt_charger import SolixMqttDeviceCharger
from .mqtt_device import SolixMqttDevice
from .mqtt_generator import MODELS as GENERATOR_MODELS
from .mqtt_generator import SolixMqttDeviceGenerator
from .mqtt_pps import MODELS as PPS_MODELS
from .mqtt_pps import SolixMqttDevicePps
from .mqtt_solarbank import MODELS as SB_MODELS
from .mqtt_solarbank import SolixMqttDeviceSolarbank
from .mqtt_various import MODELS as VAR_MODELS
from .mqtt_various import SolixMqttDeviceVarious
from .mqttmap import SOLIXMQTTMAP

if TYPE_CHECKING:
    from .api import AnkerSolixApi


class SolixMqttDeviceFactory:
    """Define the class to create the appropriate MQTT device object based on device PN. @thomas"""

    def __init__(self, api_instance: AnkerSolixApi, device_sn: str) -> None:
        """Initialize. @thomas

        Args:
            api_instance: The API instance
            device_sn: The device serial number

        """
        self.api = api_instance
        self.device_sn = device_sn
        self.device_data = getattr(api_instance, "devices", {}).get(device_sn) or {}

    def create_device(self) -> SolixMqttDevice | None:
        """Create the appropriate MQTT device control instance based on device type. @thomas

        Returns:
            Appropriate MQTT device instance or None if device not found

        """
        if self.device_data and (category := self.device_data.get("type") or ""):
            pn = self.device_data.get("device_pn") or ""
            # TODO: Update factory when new device categories and criteria are implemented
            if pn in SOLIXMQTTMAP:
                if (
                    category
                    in [SolixDeviceType.PPS.value, SolixDeviceType.SOLARBANK_PPS.value]
                    and pn in PPS_MODELS
                ):
                    return SolixMqttDevicePps(self.api, self.device_sn)
                if (
                    category == SolixDeviceType.GENERATOR.value
                    and pn in GENERATOR_MODELS
                ):
                    return SolixMqttDeviceGenerator(self.api, self.device_sn)
                if (
                    category
                    in [
                        SolixDeviceType.SOLARBANK.value,
                        SolixDeviceType.COMBINER_BOX.value,
                    ]
                    and pn in SB_MODELS
                ):
                    return SolixMqttDeviceSolarbank(self.api, self.device_sn)
                if (
                    category
                    in [SolixDeviceType.CHARGER.value, SolixDeviceType.EV_CHARGER.value]
                    and pn in CHARGER_MODELS
                ):
                    return SolixMqttDeviceCharger(self.api, self.device_sn)
                if (
                    category
                    in [
                        SolixDeviceType.SMARTPLUG.value,
                        SolixDeviceType.POWERCOOLER.value,
                    ]
                    and pn in VAR_MODELS
                ):
                    return SolixMqttDeviceVarious(self.api, self.device_sn)
            # return default MQTT device supporting only the realtime trigger control
            return SolixMqttDevice(self.api, self.device_sn)
        return None
