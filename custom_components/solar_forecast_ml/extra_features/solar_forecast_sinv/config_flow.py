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

"""Adds config flow for Solar Forecast S-INV. @zara"""

from __future__ import annotations  # noqa: TID251

import struct
from pathlib import Path
from typing import Any

import voluptuous as vol
from aiohttp import ClientError
from awesomeversion import AwesomeVersion
from homeassistant import config_entries
from homeassistant.components import webhook
from homeassistant.const import (
    CONF_COUNTRY_CODE,
    CONF_DELAY_TIME,
    CONF_EXCLUDE,
    CONF_HOST,
    CONF_NAME,
    CONF_PASSWORD,
    CONF_PORT,
    CONF_SCAN_INTERVAL,
    CONF_TIMEOUT,
    CONF_USERNAME,
)
from homeassistant.const import (
    __version__ as HAVERSION,
)
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import section
from homeassistant.helpers import (
    config_validation as cv,
)
from homeassistant.helpers import (
    device_registry as dr,
)
from homeassistant.helpers import (
    entity_registry as er,
)
from homeassistant.helpers import (
    restore_state,
    selector,
)
from homeassistant.helpers.aiohttp_client import (
    async_create_clientsession,
    async_get_clientsession,
)

from . import api_client, contract, external_meter
from .const import (
    ACCEPT_TERMS,
    ALLOW_TESTMODE,
    CONF_API_ENCRYPTION,
    CONF_API_OPTIONS,
    CONF_CONNECTION,
    CONF_ENDPOINT_LIMIT,
    CONF_LOGGER_SERIAL,
    CONF_MQTT_OPTIONS,
    CONF_MQTT_TEST_SPEED,
    CONF_MQTT_USAGE,
    CONF_SKIP_INVALID,
    CONF_SYSTEM,
    CONF_TEST_OPTIONS,
    CONF_TRIGGER_TIMEOUT,
    CONF_VENDOR,
    CONF_WEBHOOK_ID,
    DEFAULT_VENDOR,
    DOMAIN,
    ERROR_DETAIL,
    EXAMPLESFOLDER,
    INTERVALMULT,
    LOCAL_VENDORS,
    LOGGER,
    MQ_LINK,
    MQTT_LINK,
    SHARED_ACCOUNT,
    SUPPORTED_HP_SYSTEMS,
    SUPPORTED_SYSTEMS,
    TC_LINK,
    TERMS_LINK,
    TESTFOLDER,
    TESTMODE,
    VENDOR_CONNECTIONS,
    VENDOR_DEYE,
    VENDOR_EMSESP,
    VENDOR_HP,
    VENDOR_HP_BRIDGE,
    VENDOR_FRONIUS,
    VENDOR_HOYMILES,
    VENDOR_HUAWEI,
    VENDOR_KOSTAL,
    VENDOR_MAXXISUN,
    VENDOR_SOLAKON,
    VENDOR_SOLPLANET,
    VENDOR_SOLAX,
    VENDOR_STIEBEL,
    VENDOR_SUNGROW,
    VENDOR_ZENDURE,
)
from .ahoy_coordinator import async_probe as async_probe_ahoy
from .deye_coordinator import async_probe as async_probe_deye
from .emsesp_coordinator import EmsespError
from .emsesp_coordinator import async_probe as async_probe_emsesp
from .emsesp_coordinator import setup_code as emsesp_setup_code
from .emsesp_coordinator import host_in_use as emsesp_host_in_use
from .emsesp_coordinator import normalize_host as normalize_emsesp_host
from .fronius_coordinator import CONF_MODBUS, MODBUS_DEFAULT, async_probe
from .hoymiles_dtu_coordinator import async_probe as async_probe_hoymiles_dtu
from .huawei_coordinator import async_probe as async_probe_huawei
from .install_counter import CONF_INSTALL_COUNT, INSTALL_COUNT_DEFAULT
from .kostal_coordinator import CONF_UNIT_ID
from .kostal_coordinator import async_probe as async_probe_kostal
from .modbus_tcp import ModbusError
from .opendtu_coordinator import async_probe as async_probe_opendtu
from .hp_site import HP_TITLE, HP_UNIQUE_ID
from .site import SITE_TITLE, SITE_UNIQUE_ID, VENDOR_SITE
from .solakon_coordinator import async_probe as async_probe_solakon
from .solplanet_coordinator import async_probe as async_probe_solplanet
from .solax_coordinator import async_probe as async_probe_solax
from .solixapi.apitypes import ApiCategories, SolixDeviceType
from .stiebel_isg_coordinator import (
    StiebelError,
    async_probe as async_probe_stiebel,
    normalize_host as normalize_stiebel_host,
    same_target as stiebel_same_target,
    setup_code as stiebel_setup_code,
)
from .sungrow_coordinator import async_probe as async_probe_sungrow
from .vendors import (
    ahoy,
    deye,
    emsesp,
    fronius,
    hoymiles_dtu,
    hp_bridge,
    huawei,
    kostal,
    maxxisun,
    opendtu,
    solakon,
    solplanet,
    solax,
    stiebel_isg,
    sungrow,
    zendure,
)
from .zendure_coordinator import async_probe as async_probe_zendure

# Define integration configuration entry versions
CONFIG_VERSION = 2
CONFIG_MINOR_VERSION = 2

# Define integration option limits and defaults
SCAN_INTERVAL_DEF: int = api_client.DEFAULT_UPDATE_INTERVAL
INTERVALMULT_DEF: int = api_client.DEFAULT_DEVICE_MULTIPLIER
DELAY_TIME_DEF: float = api_client.DEFAULT_DELAY_TIME
TIMEOUT_DEF: int = api_client.DEFAULT_TIMEOUT
TRIGGER_TIMEOUT_DEF: int = api_client.DEFAULT_TRIGGER_TIMEOUT
ENDPOINT_LIMIT_DEF: int = api_client.DEFAULT_ENDPOINT_LIMIT
API_ENCRYPTION_DEF: bool = api_client.DEFAULT_API_ENCRYPTION
SKIP_INVALID_DEF: bool = False
MQTT_USAGE_DEF: bool = api_client.DEFAULT_MQTT_USAGE

_SCAN_INTERVAL_MIN: int = 10 if ALLOW_TESTMODE else 30
_SCAN_INTERVAL_MAX: int = 600
_SCAN_INTERVAL_STEP: int = 10
_INTERVALMULT_MIN: int = 2
_INTERVALMULT_MAX: int = 60
_INTERVALMULT_STEP: int = 2
_DELAY_TIME_MIN: float = api_client.SolixDefaults.REQUEST_DELAY_MIN
_DELAY_TIME_MAX: float = 2.0
_DELAY_TIME_STEP: float = 0.1
_TIMEOUT_MIN: int = api_client.SolixDefaults.REQUEST_TIMEOUT_MIN
_TIMEOUT_MAX: int = api_client.SolixDefaults.REQUEST_TIMEOUT_MAX
_TIMEOUT_STEP: int = 1
_ENDPOINT_LIMIT_MIN: int = 0
_ENDPOINT_LIMIT_MAX: int = 30
_ENDPOINT_LIMIT_STEP: int = 1
_ALLOW_TESTMODE: bool = bool(ALLOW_TESTMODE)
_ACCEPT_TERMS: bool = False
_TRIGGER_TIMEOUT_MIN: int = api_client.SolixDefaults.TRIGGER_TIMEOUT_MIN
_TRIGGER_TIMEOUT_MAX: int = api_client.SolixDefaults.TRIGGER_TIMEOUT_MAX
_TRIGGER_TIMEOUT_STEP: int = 10
_MQTT_POLLER_SPEED: float = 1
_MQTT_POLLER_SPEED_MIN: float = 0.25
_MQTT_POLLER_SPEED_MAX: float = 10
_MQTT_POLLER_SPEED_DEF: float = 1


class AnkerSolixFlowHandler(config_entries.ConfigFlow, domain=DOMAIN):
    """Config flow for Solar Forecast S-INV. @zara"""

    # The schema version of the entries that it creates
    # Home Assistant will call your migrate method if the version changes
    VERSION = CONFIG_VERSION
    MINOR_VERSION = CONFIG_MINOR_VERSION

    def __init__(self) -> None:
        """Init the FlowHandler. @thomas"""
        super().__init__()
        self._data: dict[str, Any] = {}
        self._options: dict[str, Any] = {}
        self._vendor: str = DEFAULT_VENDOR
        self._connection: str = VENDOR_CONNECTIONS[DEFAULT_VENDOR][0]
        self.client: api_client.AnkerSolixApiClient = None
        self.testmode: bool = False
        self.testfolder: str = None
        self.examplesfolder: str = str(Path(__file__).parent / EXAMPLESFOLDER)
        # ensure folder for example json folders exists
        Path(self.examplesfolder).mkdir(parents=True, exist_ok=True)

    async def async_step_system(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Create the installation entry, or S-INV HP when the vendor is hp. @zara"""
        if (user_input or {}).get(CONF_VENDOR) == VENDOR_HP:
            await self.async_set_unique_id(HP_UNIQUE_ID)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=HP_TITLE, data={CONF_VENDOR: VENDOR_HP}
            )
        await self.async_set_unique_id(SITE_UNIQUE_ID)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(
            title=SITE_TITLE, data={CONF_VENDOR: VENDOR_SITE}
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> AnkerSolixOptionsFlowHandler:
        """Get the options flow for this handler. @thomas"""
        if config_entry.data.get(CONF_VENDOR) == VENDOR_SITE:
            return SiteOptionsFlowHandler()
        if config_entry.data.get(CONF_VENDOR) == VENDOR_HP:
            return HpOptionsFlowHandler()
        if config_entry.data.get(CONF_VENDOR) == VENDOR_EMSESP:
            return EmsespOptionsFlowHandler()
        if config_entry.data.get(CONF_VENDOR) == VENDOR_HP_BRIDGE:
            return HpBridgeOptionsFlowHandler()
        if config_entry.data.get(CONF_VENDOR) == VENDOR_STIEBEL:
            return StiebelOptionsFlowHandler()
        if config_entry.data.get(CONF_VENDOR) in LOCAL_VENDORS:
            return LocalOptionsFlowHandler()
        return AnkerSolixOptionsFlowHandler(config_entry)

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 1: inverter list, or a kind menu once a heat pump is registered. @zara

        ``SUPPORTED_HP_SYSTEMS`` is empty until a manufacturer exists. The menu
        is omitted then, so this step stays the inverter list exactly as before.
        """
        if user_input and user_input.get(CONF_SYSTEM) in SUPPORTED_SYSTEMS:
            return await self._async_route_inverter(user_input[CONF_SYSTEM])
        if not user_input and SUPPORTED_HP_SYSTEMS:
            return await self.async_step_kind()
        return self._async_show_inverter_form()

    async def async_step_kind(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Show the inverter or heat-pump menu. @zara"""
        return self.async_show_menu(
            step_id="kind",
            menu_options=["inverter", "heat_pump"],
        )

    async def async_step_inverter(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Inverter branch of the kind menu: the existing system list. @zara"""
        if user_input and user_input.get(CONF_SYSTEM) in SUPPORTED_SYSTEMS:
            return await self._async_route_inverter(user_input[CONF_SYSTEM])
        return self._async_show_inverter_form()

    async def async_step_heat_pump(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Heat-pump branch: its system list, or an abort while none is registered. @zara"""
        if not SUPPORTED_HP_SYSTEMS:
            return self.async_abort(reason="no_heat_pump")
        if user_input and user_input.get(CONF_SYSTEM) in SUPPORTED_HP_SYSTEMS:
            system = user_input[CONF_SYSTEM]
            self._vendor, self._connection = SUPPORTED_HP_SYSTEMS[system]
            if self._connection == emsesp.CONNECTION:
                return await self.async_step_emsesp()
            if self._connection == hp_bridge.CONNECTION:
                return await self.async_step_hp_bridge()
            if self._connection == stiebel_isg.CONNECTION:
                return await self.async_step_stiebel()
            return self.async_abort(reason="heat_pump_pending")
        return self.async_show_form(
            step_id="heat_pump",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SYSTEM): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=list(SUPPORTED_HP_SYSTEMS),
                            mode=selector.SelectSelectorMode.LIST,
                            translation_key="hp_system",
                        )
                    )
                }
            ),
        )

    async def async_step_emsesp(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Ask for the EMS-ESP host and read it. @zara"""
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                host = normalize_emsesp_host(str(user_input.get(CONF_HOST, "")))
            except ValueError:
                errors[CONF_HOST] = "invalid_host"
            else:
                try:
                    self._emsesp = await async_probe_emsesp(
                        async_get_clientsession(self.hass), host
                    )
                except (
                    EmsespError,
                    ClientError,
                    TimeoutError,
                    TypeError,
                    ValueError,
                ) as err:
                    code = emsesp_setup_code(err)
                    if not isinstance(err, EmsespError):
                        LOGGER.warning("EMS-ESP %s at %s", code, host)
                    errors[CONF_HOST] = code
                else:
                    if self._emsesp_host_taken(host):
                        return self.async_abort(reason="emsesp_already_configured")
                    return await self.async_step_emsesp_circuit()
        return self.async_show_form(
            step_id="emsesp",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_HOST, default=(user_input or {}).get(CONF_HOST, "")
                    ): str
                }
            ),
            errors=errors,
        )

    async def async_step_emsesp_circuit(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Choose the heating circuit, or skip when the gateway has none. @zara"""
        found = self._emsesp
        circuits = list(found["circuits"])
        if user_input is None and circuits:
            options = [emsesp.CIRCUIT_NONE, *circuits]
            return self.async_show_form(
                step_id="emsesp_circuit",
                data_schema=vol.Schema(
                    {
                        vol.Required(
                            emsesp.CONF_CIRCUIT, default=circuits[0]
                        ): selector.SelectSelector(
                            selector.SelectSelectorConfig(
                                options=options,
                                mode=selector.SelectSelectorMode.DROPDOWN,
                                translation_key="heating_circuit",
                            )
                        )
                    }
                ),
            )
        choice = circuits[0] if circuits else ""
        if user_input is not None:
            choice = str(user_input.get(emsesp.CONF_CIRCUIT) or "")
        if choice == emsesp.CIRCUIT_NONE or choice not in circuits:
            choice = ""
        data = {
            CONF_VENDOR: VENDOR_EMSESP,
            CONF_CONNECTION: emsesp.CONNECTION,
            CONF_HOST: found["host"],
            emsesp.CONF_CIRCUIT: choice,
            emsesp.CONF_CIRCUITS: circuits,
        }
        if found.get("unit"):
            data[emsesp.CONF_HPPOWER_UNIT] = found["unit"]
        return self.async_create_entry(
            title=emsesp.NAME,
            data=data,
            options={
                CONF_SCAN_INTERVAL: emsesp.DEFAULT_SCAN_SECONDS,
                emsesp.CONF_CIRCUIT: choice,
            },
        )

    def _emsesp_host_taken(
        self, host: str, *, skip_entry_id: str | None = None
    ) -> bool:
        entries = []
        config_entries = getattr(self.hass, "config_entries", None)
        if config_entries is not None:
            entries = config_entries.async_entries(DOMAIN)
        return emsesp_host_in_use(entries, host, skip_entry_id=skip_entry_id)

    def _bridge_schema(self, current: dict[str, Any] | None = None) -> vol.Schema:
        current = current or {}
        fields: dict[Any, Any] = {}
        for spec in contract.HP_ROLE_SPECS:
            domains = (
                ["binary_sensor", "sensor"]
                if spec.domains == ("binary_sensor",)
                else list(spec.domains)
            )
            fields[
                vol.Optional(
                    spec.base, description={"suggested_value": current.get(spec.base)}
                )
            ] = selector.EntitySelector(selector.EntitySelectorConfig(domain=domains))
        return vol.Schema(fields)

    def _bridge_sources(
        self, user_input: dict[str, Any]
    ) -> dict[str, hp_bridge.Source]:
        registry = er.async_get(self.hass)
        chosen: dict[str, hp_bridge.Source] = {}
        for role, entity_id in user_input.items():
            if not entity_id or not contract.is_hp_role(role):
                continue
            listed = registry.async_get(entity_id)
            state = self.hass.states.get(entity_id) if self.hass is not None else None
            unit = None
            if state is not None:
                unit = state.attributes.get("unit_of_measurement")
            if unit is None and listed is not None:
                unit = getattr(listed, "unit_of_measurement", None)
            chosen[role] = hp_bridge.Source(
                entity_id=entity_id,
                domain=entity_id.split(".", 1)[0],
                platform=getattr(listed, "platform", "") or "",
                unit=unit,
                device_class=getattr(listed, "device_class", None) if listed else None,
                state_class=getattr(listed, "state_class", None)
                or (state.attributes.get("state_class") if state is not None else None),
            )
        return chosen

    async def async_step_hp_bridge(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Ask which existing entities fill the heat-pump roles. @zara"""
        errors: dict[str, str] = {}
        if user_input is not None:
            chosen = self._bridge_sources(user_input)
            errors = hp_bridge.selection_errors(chosen)
            if not errors:
                mapping = {role: source.entity_id for role, source in chosen.items()}
                return self.async_create_entry(
                    title=hp_bridge.NAME,
                    data={
                        CONF_VENDOR: VENDOR_HP_BRIDGE,
                        CONF_CONNECTION: hp_bridge.CONNECTION,
                        hp_bridge.CONF_SOURCES: mapping,
                    },
                    options={hp_bridge.CONF_SOURCES: mapping},
                )
        return self.async_show_form(
            step_id="hp_bridge",
            data_schema=self._bridge_schema(user_input),
            errors=errors,
        )

    async def async_step_stiebel(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Ask for the ISG and read one input register. Read only. @zara"""
        errors: dict[str, str] = {}
        current = user_input or {}
        if user_input is not None:
            try:
                host = normalize_stiebel_host(str(user_input.get(CONF_HOST, "")))
                port = int(user_input.get(CONF_PORT, stiebel_isg.DEFAULT_PORT))
                unit_id = int(user_input.get(CONF_UNIT_ID, stiebel_isg.DEFAULT_UNIT_ID))
                if not 1 <= port <= 65535 or not 0 <= unit_id <= 255:
                    raise ValueError("invalid host")
            except (TypeError, ValueError):
                errors[CONF_HOST] = "invalid_host"
            else:
                try:
                    await async_probe_stiebel(host, port, unit_id)
                except StiebelError as err:
                    errors[CONF_HOST] = stiebel_setup_code(err)
                else:
                    if self._stiebel_taken(host, port, unit_id):
                        return self.async_abort(reason="stiebel_already_configured")
                    return self.async_create_entry(
                        title=stiebel_isg.NAME,
                        data={
                            CONF_VENDOR: VENDOR_STIEBEL,
                            CONF_CONNECTION: stiebel_isg.CONNECTION,
                            CONF_HOST: host,
                            CONF_PORT: port,
                            CONF_UNIT_ID: unit_id,
                        },
                        options={CONF_SCAN_INTERVAL: stiebel_isg.DEFAULT_SCAN_SECONDS},
                    )
        return self.async_show_form(
            step_id="stiebel",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST, default=current.get(CONF_HOST, "")): str,
                    vol.Required(
                        CONF_PORT,
                        default=current.get(CONF_PORT, stiebel_isg.DEFAULT_PORT),
                    ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                    vol.Required(
                        CONF_UNIT_ID,
                        default=current.get(CONF_UNIT_ID, stiebel_isg.DEFAULT_UNIT_ID),
                    ): vol.All(vol.Coerce(int), vol.Range(min=0, max=255)),
                }
            ),
            errors=errors,
        )

    def _stiebel_taken(self, host: str, port: int, unit_id: int) -> bool:
        """Return True when this ISG target is already configured. @zara"""
        entries = []
        config_entries = getattr(self.hass, "config_entries", None)
        if config_entries is not None:
            entries = config_entries.async_entries(DOMAIN)
        return stiebel_same_target(entries, host, port, unit_id, skip=None)

    def _async_show_inverter_form(self) -> config_entries.FlowResult:
        """Show the inverter system list (step id ``user``). @zara"""
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SYSTEM): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=list(SUPPORTED_SYSTEMS),
                            mode=selector.SelectSelectorMode.LIST,
                            translation_key=CONF_SYSTEM,
                        )
                    )
                }
            ),
        )

    async def _async_route_inverter(self, system: str) -> config_entries.FlowResult:
        """Start the setup that belongs to one inverter system. @zara"""
        self._vendor, self._connection = SUPPORTED_SYSTEMS[system]
        if self._vendor == VENDOR_FRONIUS:
            return await self.async_step_fronius()
        if self._vendor == VENDOR_ZENDURE:
            return await self.async_step_zendure()
        if self._connection == opendtu.CONNECTION_LOCAL:
            return await self.async_step_opendtu()
        if self._connection == hoymiles_dtu.CONNECTION_LOCAL:
            return await self.async_step_hoymiles_dtu()
        if self._connection == kostal.CONNECTION_LOCAL:
            return await self.async_step_kostal()
        if self._connection == solax.CONNECTION_LOCAL:
            return await self.async_step_solax()
        if self._connection == sungrow.CONNECTION_LOCAL:
            return await self.async_step_sungrow()
        if self._connection == huawei.CONNECTION_LOCAL:
            return await self.async_step_huawei()
        if self._connection == solakon.CONNECTION_LOCAL:
            return await self.async_step_solakon()
        if self._connection == ahoy.CONNECTION_LOCAL:
            return await self.async_step_ahoy()
        if self._connection == maxxisun.CONNECTION_LOCAL:
            return await self.async_step_maxxisun()
        if self._connection in (deye.CONNECTION_SOLARMAN, deye.CONNECTION_MODBUS):
            return await self.async_step_deye()
        if self._connection == solplanet.CONNECTION_MODBUS:
            return await self.async_step_solplanet()
        return await self.async_step_credentials()

    async def async_step_fronius(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for Fronius: address of the inverter on the local network. @zara"""
        return await self._async_local_step(
            "fronius", VENDOR_FRONIUS, async_probe, fronius, user_input
        )

    async def async_step_zendure(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for Zendure: address of a zenSDK device on the local network. @zara"""
        return await self._async_local_step(
            "zendure", VENDOR_ZENDURE, async_probe_zendure, zendure, user_input
        )

    async def async_step_opendtu(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for Hoymiles via OpenDTU: address of the OpenDTU. @zara"""
        return await self._async_local_step(
            "opendtu",
            VENDOR_HOYMILES,
            async_probe_opendtu,
            opendtu,
            user_input,
            error_key="not_opendtu",
        )

    async def async_step_ahoy(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for Hoymiles via AhoyDTU: address of the AhoyDTU. @zara"""
        return await self._async_local_step(
            "ahoy",
            VENDOR_HOYMILES,
            async_probe_ahoy,
            ahoy,
            user_input,
            error_key="not_ahoy",
        )

    async def async_step_hoymiles_dtu(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for a Hoymiles DTU or HMS-W inverter: its address. @zara"""

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_hoymiles_dtu(host)

        return await self._async_local_step(
            "hoymiles_dtu",
            VENDOR_HOYMILES,
            probe,
            hoymiles_dtu,
            user_input,
            error_key="not_hoymiles_dtu",
        )

    async def async_step_kostal(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for KOSTAL PLENTICORE: Modbus TCP address, port and unit id. @zara"""
        values = user_input or {}

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_kostal(
                host,
                int(values.get(CONF_PORT, kostal.DEFAULT_PORT)),
                int(values.get(CONF_UNIT_ID, kostal.DEFAULT_UNIT_ID)),
            )

        return await self._async_local_step(
            "kostal",
            VENDOR_KOSTAL,
            probe,
            kostal,
            user_input,
            error_key="not_kostal",
            extra_fields={
                vol.Required(
                    CONF_PORT, default=values.get(CONF_PORT, kostal.DEFAULT_PORT)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                vol.Required(
                    CONF_UNIT_ID,
                    default=values.get(CONF_UNIT_ID, kostal.DEFAULT_UNIT_ID),
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=247)),
            },
        )

    async def async_step_solax(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for SolaX hybrids: Modbus TCP of the monitoring module. @zara"""
        values = user_input or {}

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_solax(
                host,
                int(values.get(CONF_PORT, solax.DEFAULT_PORT)),
                int(values.get(CONF_UNIT_ID, solax.DEFAULT_UNIT_ID)),
            )

        return await self._async_local_step(
            "solax",
            VENDOR_SOLAX,
            probe,
            solax,
            user_input,
            error_key="not_solax",
            extra_fields={
                vol.Required(
                    CONF_PORT, default=values.get(CONF_PORT, solax.DEFAULT_PORT)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                vol.Required(
                    CONF_UNIT_ID,
                    default=values.get(CONF_UNIT_ID, solax.DEFAULT_UNIT_ID),
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=247)),
            },
        )

    async def async_step_sungrow(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for Sungrow hybrids: Modbus TCP of LAN port or WiNet-S. @zara"""
        values = user_input or {}

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_sungrow(
                host,
                int(values.get(CONF_PORT, sungrow.DEFAULT_PORT)),
                int(values.get(CONF_UNIT_ID, sungrow.DEFAULT_UNIT_ID)),
            )

        return await self._async_local_step(
            "sungrow",
            VENDOR_SUNGROW,
            probe,
            sungrow,
            user_input,
            error_key="not_sungrow",
            extra_fields={
                vol.Required(
                    CONF_PORT, default=values.get(CONF_PORT, sungrow.DEFAULT_PORT)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                vol.Required(
                    CONF_UNIT_ID,
                    default=values.get(CONF_UNIT_ID, sungrow.DEFAULT_UNIT_ID),
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=247)),
            },
        )

    async def async_step_huawei(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for Huawei SUN2000: Modbus TCP of SDongle or inverter AP. @zara"""
        values = user_input or {}

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_huawei(
                host,
                int(values.get(CONF_PORT, huawei.DEFAULT_PORT)),
                int(values.get(CONF_UNIT_ID, huawei.DEFAULT_UNIT_ID)),
            )

        return await self._async_local_step(
            "huawei",
            VENDOR_HUAWEI,
            probe,
            huawei,
            user_input,
            error_key="not_huawei",
            extra_fields={
                vol.Required(
                    CONF_PORT, default=values.get(CONF_PORT, huawei.DEFAULT_PORT)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                vol.Required(
                    CONF_UNIT_ID,
                    default=values.get(CONF_UNIT_ID, huawei.DEFAULT_UNIT_ID),
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=247)),
            },
        )

    async def async_step_solakon(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3 for the Solakon ONE: its Modbus TCP address. @zara"""
        values = user_input or {}

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_solakon(
                host,
                int(values.get(CONF_PORT, solakon.DEFAULT_PORT)),
                int(values.get(CONF_UNIT_ID, solakon.DEFAULT_UNIT_ID)),
            )

        return await self._async_local_step(
            "solakon",
            VENDOR_SOLAKON,
            probe,
            solakon,
            user_input,
            error_key="not_solakon",
            extra_fields={
                vol.Required(
                    CONF_PORT, default=values.get(CONF_PORT, solakon.DEFAULT_PORT)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                vol.Required(
                    CONF_UNIT_ID,
                    default=values.get(CONF_UNIT_ID, solakon.DEFAULT_UNIT_ID),
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=247)),
            },
        )

    async def async_step_solplanet(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step for a Solplanet inverter: Modbus TCP input registers, read only. @zara"""
        values = user_input or {}

        async def probe(_session, host: str) -> dict[str, Any]:
            return await async_probe_solplanet(
                host,
                int(values.get(CONF_PORT, solplanet.DEFAULT_PORT)),
                int(values.get(CONF_UNIT_ID, solplanet.DEFAULT_UNIT_ID)),
            )

        return await self._async_local_step(
            "solplanet",
            VENDOR_SOLPLANET,
            probe,
            solplanet,
            user_input,
            error_key="not_solplanet",
            extra_fields={
                vol.Required(
                    CONF_PORT, default=values.get(CONF_PORT, solplanet.DEFAULT_PORT)
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                vol.Required(
                    CONF_UNIT_ID,
                    default=values.get(CONF_UNIT_ID, solplanet.DEFAULT_UNIT_ID),
                ): vol.All(vol.Coerce(int), vol.Range(min=1, max=247)),
            },
        )

    async def async_step_deye(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step for a Deye hybrid: Solarman V5 or Modbus TCP, read only. @zara"""
        solarman = self._connection == deye.CONNECTION_SOLARMAN
        values = user_input or {}
        default_port = (
            deye.DEFAULT_PORT_SOLARMAN if solarman else deye.DEFAULT_PORT_MODBUS
        )
        errors: dict[str, str] = {}
        if user_input:
            host = str(user_input.get(CONF_HOST, "")).strip()
            port = int(values.get(CONF_PORT, default_port))
            unit_id = int(values.get(CONF_UNIT_ID, deye.DEFAULT_UNIT_ID))
            logger_serial = int(values[CONF_LOGGER_SERIAL]) if solarman else None
            try:
                identity = await async_probe_deye(host, port, unit_id, logger_serial)
            except TimeoutError:
                errors[CONF_HOST] = "solarman_timeout" if solarman else "cannot_connect"
            except (OSError, EOFError):
                errors[CONF_HOST] = "cannot_connect"
            except ModbusError as err:
                errors[CONF_HOST] = (
                    "logger_serial_mismatch"
                    if solarman and "logger serial" in str(err)
                    else "not_deye"
                )
            except (ValueError, TypeError, struct.error):
                errors[CONF_HOST] = "not_deye"
            else:
                await self.async_set_unique_id(f"{VENDOR_DEYE}_{identity['serial']}")
                self._abort_if_unique_id_configured(
                    updates={CONF_HOST: host, **identity.get("data", {})}
                )
                return self.async_create_entry(
                    title=identity["name"],
                    data={
                        CONF_VENDOR: VENDOR_DEYE,
                        CONF_CONNECTION: self._connection,
                        CONF_HOST: host,
                        **identity.get("data", {}),
                    },
                    options={CONF_SCAN_INTERVAL: deye.DEFAULT_SCAN_SECONDS},
                )
        fields: dict[Any, Any] = {
            vol.Required(CONF_HOST, default=values.get(CONF_HOST, "")): str,
            vol.Required(
                CONF_PORT, default=values.get(CONF_PORT, default_port)
            ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
            vol.Required(
                CONF_UNIT_ID, default=values.get(CONF_UNIT_ID, deye.DEFAULT_UNIT_ID)
            ): vol.All(vol.Coerce(int), vol.Range(min=1, max=247)),
        }
        if solarman:
            serial_default = values.get(CONF_LOGGER_SERIAL)
            serial_key = (
                vol.Required(CONF_LOGGER_SERIAL)
                if serial_default is None
                else vol.Required(CONF_LOGGER_SERIAL, default=serial_default)
            )
            fields[serial_key] = vol.All(
                vol.Coerce(int), vol.Range(min=1, max=0xFFFFFFFF)
            )
        return self.async_show_form(
            step_id="deye_solarman" if solarman else "deye_modbus",
            data_schema=vol.Schema(fields),
            errors=errors,
        )

    async def async_step_maxxisun(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step for maxxisun: show the webhook URL, no host field. @zara"""
        if not getattr(self, "_webhook_id", None):
            self._webhook_id = webhook.async_generate_id()
        url = webhook.async_generate_url(
            self.hass,
            self._webhook_id,
            allow_internal=True,
            prefer_external=False,
        )
        if user_input is not None:
            await self.async_set_unique_id(self._webhook_id)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title="MaxxiCharge",
                data={
                    CONF_VENDOR: VENDOR_MAXXISUN,
                    CONF_CONNECTION: self._connection,
                    CONF_WEBHOOK_ID: self._webhook_id,
                },
                options={},
            )
        return self.async_show_form(
            step_id="maxxisun",
            data_schema=vol.Schema({}),
            description_placeholders={"webhook_url": url},
        )

    async def _async_local_step(
        self,
        step_id: str,
        vendor: str,
        probe,
        module,
        user_input: dict[str, Any] | None,
        error_key: str | None = None,
        extra_fields: dict[Any, Any] | None = None,
    ) -> config_entries.FlowResult:
        """Probe the entered host, then create one instance per device serial. @zara"""
        errors: dict[str, str] = {}
        if user_input:
            host = str(user_input.get(CONF_HOST, "")).strip()
            try:
                identity = await probe(async_get_clientsession(self.hass), host)
            except (ClientError, TimeoutError, OSError, ImportError, EOFError):
                errors[CONF_HOST] = "cannot_connect"
            except (ValueError, TypeError, ModbusError, struct.error):
                errors[CONF_HOST] = error_key or f"not_{vendor}"
            else:
                await self.async_set_unique_id(f"{vendor}_{identity['serial']}")
                self._abort_if_unique_id_configured(
                    updates={CONF_HOST: host, **identity.get("data", {})}
                )
                return self.async_create_entry(
                    title=identity["name"],
                    data={
                        CONF_VENDOR: vendor,
                        CONF_CONNECTION: self._connection,
                        CONF_HOST: host,
                        **identity.get("data", {}),
                    },
                    options={CONF_SCAN_INTERVAL: module.DEFAULT_SCAN_SECONDS},
                )
        return self.async_show_form(
            step_id=step_id,
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_HOST, default=(user_input or {}).get(CONF_HOST, "")
                    ): str,
                    **(extra_fields or {}),
                }
            ),
            errors=errors,
        )

    async def async_step_credentials(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Step 3: account credentials of the chosen manufacturer connection. @zara"""
        errors: dict[str, str] = {}
        placeholders: dict[str, str] = {}

        cfg_schema = await self.get_config_schema(user_input or self._data)
        placeholders[TERMS_LINK] = TC_LINK

        if user_input:
            if not user_input.get(ACCEPT_TERMS, ""):
                # Terms not accepted
                errors[ACCEPT_TERMS] = ACCEPT_TERMS
            else:
                account_user = user_input.get(CONF_USERNAME, "")
                try:
                    if await self.async_set_unique_id(account_user.lower()):
                        # abort if username already setup
                        self._abort_if_unique_id_configured()
                    else:
                        self.client = await self._authenticate_client(user_input)

                    # get first site data for account and verify nothing is shared with existing configuration
                    await self.client.api.update_sites()
                    if cfg_entry := await async_check_and_remove_devices(
                        self.hass,
                        user_input,
                        self.client.api.getCaches(),
                    ):
                        errors[CONF_USERNAME] = "duplicate_devices"
                        placeholders[CONF_USERNAME] = str(account_user)
                        placeholders[SHARED_ACCOUNT] = str(
                            cfg_entry.data.get("username")
                        )
                        placeholders[CONF_NAME] = str(cfg_entry.title)
                    else:
                        self._data = {
                            **user_input,
                            CONF_VENDOR: self._vendor,
                            CONF_CONNECTION: self._connection,
                        }
                        # add some fixed configuration data
                        self._data[EXAMPLESFOLDER] = self.examplesfolder
                        self._data["nickname"] = (
                            self.client.api.apisession.nickname or ""
                        )

                        # next step to configure initial options
                        return await self.async_step_user_options(user_options=None)

                except api_client.AnkerSolixApiClientAuthenticationError as exception:
                    LOGGER.warning(exception)
                    errors["base"] = "auth"
                    placeholders[ERROR_DETAIL] = str(exception)
                except api_client.AnkerSolixApiClientCommunicationError as exception:
                    LOGGER.error(exception)
                    errors["base"] = "connection"
                    placeholders[ERROR_DETAIL] = str(exception)
                except api_client.AnkerSolixApiClientRetryExceededError as exception:
                    LOGGER.error(exception)
                    errors["base"] = "exceeded"
                    placeholders[ERROR_DETAIL] = str(exception)
                except (api_client.AnkerSolixApiClientError, Exception) as exception:  # pylint: disable=broad-except  # noqa: BLE001
                    LOGGER.error(exception)
                    errors["base"] = "unknown"
                    placeholders[ERROR_DETAIL] = (
                        f"Exception {type(exception)}: {exception}"
                    )

        return self.async_show_form(
            step_id="credentials",
            data_schema=vol.Schema(cfg_schema),
            errors=errors,
            description_placeholders=placeholders,
        )

    async def async_step_reauth(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Perform reauthentication upon an API authentication error. @thomas"""

        return await self.async_step_reauth_confirm()

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Add reconfigure step to allow to reconfigure a config entry. @thomas"""

        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Confirm reauthentication dialog. @thomas"""

        errors: dict[str, str] = {}
        placeholders: dict[str, str] = {}
        config_entry: config_entries.ConfigEntry = (
            self.hass.config_entries.async_get_entry(self.context.get("entry_id"))
        )
        # get existing config data as dict
        self._data = config_entry.data.copy()
        cfg_schema = await self.get_config_schema(user_input or self._data)
        placeholders[TERMS_LINK] = TC_LINK

        if user_input:
            if not user_input.get(ACCEPT_TERMS, ""):
                # Terms not accepted
                errors[ACCEPT_TERMS] = ACCEPT_TERMS
            else:
                account_user = user_input.get(CONF_USERNAME, "")
                try:
                    # Obtain and cache authentication token for entered user
                    client = await self._authenticate_client(user_input)
                    # set testmode for client and json test file folder for api
                    testmode = config_entry.options.get(CONF_TEST_OPTIONS, {}).get(
                        TESTMODE, False
                    )
                    testfolder = config_entry.options.get(CONF_TEST_OPTIONS, {}).get(
                        TESTFOLDER
                    )
                    if testmode and testfolder:
                        # set json test file folder for api to be validated
                        client.api.testDir(
                            str(Path(self._data.get(EXAMPLESFOLDER, "")) / testfolder)
                        )
                    # get first site data for account and verify nothing is shared with existing configuration
                    await client.api.update_sites(fromFile=(testfolder and testmode))
                    if cfg_entry := await async_check_and_remove_devices(
                        hass=self.hass,
                        user_input=user_input,
                        apidata=client.api.getCaches(),
                        configured_user=self._data.get(CONF_USERNAME),
                    ):
                        errors[CONF_USERNAME] = "duplicate_devices"
                        placeholders[CONF_USERNAME] = str(account_user)
                        placeholders[SHARED_ACCOUNT] = str(
                            cfg_entry.data.get("username")
                        )
                        placeholders[CONF_NAME] = str(cfg_entry.title)
                    else:
                        # ensure removal of existing devices prior reload
                        await async_check_and_remove_devices(
                            hass=self.hass,
                            user_input=self._data,
                            apidata={},
                        )
                        # update fields of configuration flow
                        self._data.update(user_input)
                        self._data["nickname"] = client.api.apisession.nickname or ""
                        self.client = client
                        # update existing config entry
                        return self.async_update_and_abort(
                            entry=config_entry,
                            unique_id=account_user,
                            title=self.client.api.apisession.nickname
                            if self.client and self.client.api
                            else account_user,
                            data=self._data,
                            # options=config_entry.options.copy(),
                            reason="reconfig_successful",
                        )

                except api_client.AnkerSolixApiClientAuthenticationError as exception:
                    LOGGER.warning(exception)
                    errors["base"] = "auth"
                    placeholders[ERROR_DETAIL] = str(exception)
                except api_client.AnkerSolixApiClientCommunicationError as exception:
                    LOGGER.error(exception)
                    errors["base"] = "connection"
                    placeholders[ERROR_DETAIL] = str(exception)
                except api_client.AnkerSolixApiClientRetryExceededError as exception:
                    LOGGER.error(exception)
                    errors["base"] = "exceeded"
                    placeholders[ERROR_DETAIL] = str(exception)
                except (api_client.AnkerSolixApiClientError, Exception) as exception:  # pylint: disable=broad-except  # noqa: BLE001
                    LOGGER.error(exception)
                    errors["base"] = "unknown"
                    placeholders[ERROR_DETAIL] = (
                        f"Exception {type(exception)}: {exception}"
                    )
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema(cfg_schema),
            errors=errors,
            description_placeholders=placeholders,
        )

    async def async_step_user_options(
        self, user_options: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle a flow initialized by the user. @thomas"""
        errors: dict[str, str] = {}
        placeholders: dict[str, str] = {}
        placeholders[MQTT_LINK] = MQ_LINK

        if user_options:
            self._options = user_options
            test_options = user_options.get(CONF_TEST_OPTIONS, {})
            if test_options.get(TESTFOLDER) or not test_options.get(TESTMODE):
                return self.async_create_entry(
                    title=self.client.api.apisession.nickname
                    if self.client and self.client.api
                    else self._data.get(CONF_USERNAME),
                    data=self._data,
                    options=self._options,
                    description_placeholders=placeholders,
                )
            # Test mode enabled but no existing folder selected
            errors[TESTFOLDER] = "folder_invalid"

        return self.async_show_form(
            step_id="user_options",
            data_schema=vol.Schema(
                await get_options_schema(user_options or self._options)
            ),
            errors=errors,
            description_placeholders=placeholders,
        )

    async def _authenticate_client(
        self, user_input: dict
    ) -> api_client.AnkerSolixApiClient:
        """Validate credentials and return the api client. @thomas"""
        client = api_client.AnkerSolixApiClient(
            user_input,
            session=async_create_clientsession(self.hass),
        )
        await client.authenticate(restart=True)
        return client

    async def get_config_schema(self, entry: dict | None = None) -> dict:
        """Create the config schema dictionary. @thomas"""

        if entry is None:
            entry = {}
        return {
            vol.Required(
                CONF_USERNAME,
                default=entry.get(CONF_USERNAME),
            ): selector.TextSelector(
                selector.TextSelectorConfig(
                    type=selector.TextSelectorType.EMAIL, autocomplete="username"
                )
            ),
            vol.Required(
                CONF_PASSWORD,
                default=entry.get(CONF_PASSWORD),
            ): selector.TextSelector(
                selector.TextSelectorConfig(
                    type=selector.TextSelectorType.PASSWORD,
                    autocomplete="current-password",
                ),
            ),
            vol.Required(
                CONF_COUNTRY_CODE,
                default=entry.get(CONF_COUNTRY_CODE) or self.hass.config.country,
            ): selector.CountrySelector(
                selector.CountrySelectorConfig(),
            ),
            vol.Required(
                ACCEPT_TERMS,
                default=entry.get(ACCEPT_TERMS, _ACCEPT_TERMS),
            ): selector.BooleanSelector(),
        }


class ExternalMeterOptionsMixin:
    """Optional last options step: an existing HA meter as external grid meter. @zara"""

    _pending_options: dict[str, Any]
    _pending_meter: dict[str, Any]

    async def _async_finish_options(
        self, options: dict[str, Any]
    ) -> config_entries.FlowResult:
        """Save options, or continue with the external meter step when it applies. @zara"""
        entry_id = self.config_entry.entry_id
        if external_meter.has_native_grid_meter(
            self.hass, entry_id
        ) or external_meter.used_by_other_entry(self.hass, entry_id):
            return self.async_create_entry(title="", data=options)
        self._pending_options = options
        return await self.async_step_external_meter()

    async def async_step_external_meter(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Choose grid meter entities of another integration (all optional). @zara"""
        errors: dict[str, str] = {}
        if user_input is not None:
            if error := external_meter.validate_config(user_input):
                errors["base"] = error
            else:
                self._pending_meter = {
                    key: user_input[key]
                    for key in external_meter.EXT_KEYS
                    if user_input.get(key)
                }
                if external_meter.meter_config(self._pending_meter) is None:
                    self._pending_meter = {}
                    return self.async_create_entry(
                        title="", data=self._merged_options()
                    )
                return await self.async_step_external_meter_confirm()
        current = {**self.config_entry.options, **(user_input or {})}

        def entity(key: str, device_class: str) -> dict:
            return {
                vol.Optional(
                    key, description={"suggested_value": current.get(key)}
                ): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain="sensor", device_class=device_class
                    )
                )
            }

        schema = {
            **entity(external_meter.CONF_EXT_POWER, "power"),
            vol.Optional(
                external_meter.CONF_EXT_SIGN,
                default=current.get(external_meter.CONF_EXT_SIGN)
                or external_meter.SIGN_IMPORT,
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[external_meter.SIGN_IMPORT, external_meter.SIGN_EXPORT],
                    mode=selector.SelectSelectorMode.LIST,
                    translation_key=external_meter.CONF_EXT_SIGN,
                )
            ),
            **entity(external_meter.CONF_EXT_IMPORT, "power"),
            **entity(external_meter.CONF_EXT_EXPORT, "power"),
            **entity(external_meter.CONF_EXT_IMPORT_ENERGY, "energy"),
            **entity(external_meter.CONF_EXT_EXPORT_ENERGY, "energy"),
        }
        return self.async_show_form(
            step_id="external_meter", data_schema=vol.Schema(schema), errors=errors
        )

    async def async_step_external_meter_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Show the normalized values so the sign can be checked before saving. @zara"""
        if user_input is not None:
            return self.async_create_entry(title="", data=self._merged_options())
        config = external_meter.meter_config(self._pending_meter) or {}
        values = external_meter.grid_values(self.hass.states.get, config)

        def show(value: float | None) -> str:
            return "–" if value is None else f"{value:.0f} W"

        return self.async_show_form(
            step_id="external_meter_confirm",
            data_schema=vol.Schema({}),
            description_placeholders={
                "grid": show(values.get("power_grid")),
                "grid_import": show(values.get("power_grid_import")),
                "grid_export": show(values.get("power_grid_export")),
                "pv": show(self._solar_power()),
            },
        )

    def _merged_options(self) -> dict[str, Any]:
        base = {
            key: value
            for key, value in self._pending_options.items()
            if key not in external_meter.EXT_KEYS
        }
        return base | getattr(self, "_pending_meter", {})

    def _solar_power(self) -> float | None:
        registry = er.async_get(self.hass)
        for entity in er.async_entries_for_config_entry(
            registry, self.config_entry.entry_id
        ):
            parsed = contract.parse_unique_id(entity.unique_id)
            if parsed and parsed.get("role") == "power_solar":
                return external_meter.power_w(self.hass.states.get(entity.entity_id))
        return None


class EmsespOptionsFlowHandler(config_entries.OptionsFlow):
    """Scan interval and heating circuit of one EMS-ESP gateway. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Store the interval and the selected circuit. @zara"""
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                host = normalize_emsesp_host(str(user_input.get(CONF_HOST, "")))
            except (TypeError, ValueError):
                errors[CONF_HOST] = "invalid_host"
                host = ""
            if host and self._host_taken(host):
                errors[CONF_HOST] = "emsesp_duplicate"
            if not errors:
                circuit = str(user_input.get(emsesp.CONF_CIRCUIT) or "")
                if circuit == emsesp.CIRCUIT_NONE:
                    circuit = ""
                data = dict(self.config_entry.data)
                data[CONF_HOST] = host
                self.hass.config_entries.async_update_entry(
                    self.config_entry, data=data
                )
                return self.async_create_entry(
                    title="",
                    data={
                        CONF_SCAN_INTERVAL: int(user_input[CONF_SCAN_INTERVAL]),
                        emsesp.CONF_CIRCUIT: circuit,
                    },
                )
            user_input = None
        circuits = list(self.config_entry.data.get(emsesp.CONF_CIRCUITS) or [])
        current = self.config_entry.options.get(
            emsesp.CONF_CIRCUIT, self.config_entry.data.get(emsesp.CONF_CIRCUIT, "")
        )
        if current not in circuits:
            current = emsesp.CIRCUIT_NONE
        interval = self.config_entry.options.get(
            CONF_SCAN_INTERVAL, emsesp.DEFAULT_SCAN_SECONDS
        )
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_HOST, default=self.config_entry.data.get(CONF_HOST, "")
                    ): str,
                    vol.Required(CONF_SCAN_INTERVAL, default=interval): vol.All(
                        vol.Coerce(int),
                        vol.Range(min=emsesp.MIN_SCAN_SECONDS, max=300),
                    ),
                    vol.Required(
                        emsesp.CONF_CIRCUIT, default=current
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=[emsesp.CIRCUIT_NONE, *circuits],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                            translation_key="heating_circuit",
                        )
                    ),
                }
            ),
            errors=errors,
        )

    def _host_taken(self, host: str) -> bool:
        entries = []
        config_entries = getattr(self.hass, "config_entries", None)
        if config_entries is not None:
            entries = config_entries.async_entries(DOMAIN)
        return emsesp_host_in_use(
            entries, host, skip_entry_id=self.config_entry.entry_id
        )


class HpBridgeOptionsFlowHandler(config_entries.OptionsFlow):
    """Change which entities the heat-pump bridge reads. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Store the role selection. @zara"""
        current = dict(
            self.config_entry.options.get(hp_bridge.CONF_SOURCES)
            or self.config_entry.data.get(hp_bridge.CONF_SOURCES)
            or {}
        )
        errors: dict[str, str] = {}
        if user_input is not None:
            holder = AnkerSolixFlowHandler.__new__(AnkerSolixFlowHandler)
            holder.hass = self.hass
            chosen = holder._bridge_sources(user_input)
            errors = hp_bridge.selection_errors(chosen)
            if not errors:
                mapping = {role: source.entity_id for role, source in chosen.items()}
                return self.async_create_entry(
                    title="", data={hp_bridge.CONF_SOURCES: mapping}
                )
        holder = AnkerSolixFlowHandler.__new__(AnkerSolixFlowHandler)
        return self.async_show_form(
            step_id="init",
            data_schema=holder._bridge_schema(
                current if user_input is None else user_input
            ),
            errors=errors,
        )


class StiebelOptionsFlowHandler(config_entries.OptionsFlow):
    """Scan interval and ISG target. The entry id stays the device identity. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Store host, port, unit and the scan interval. @zara"""
        errors: dict[str, str] = {}
        data = self.config_entry.data
        if user_input is not None:
            try:
                host = normalize_stiebel_host(str(user_input.get(CONF_HOST, "")))
                port = int(user_input.get(CONF_PORT, stiebel_isg.DEFAULT_PORT))
                unit_id = int(user_input.get(CONF_UNIT_ID, stiebel_isg.DEFAULT_UNIT_ID))
                seconds = int(user_input[CONF_SCAN_INTERVAL])
                if not 1 <= port <= 65535 or not 0 <= unit_id <= 255:
                    raise ValueError("invalid host")
                if seconds < stiebel_isg.MIN_SCAN_SECONDS or seconds > 300:
                    raise ValueError("invalid host")
            except (TypeError, ValueError, KeyError):
                errors[CONF_HOST] = "invalid_host"
            else:
                if self._target_taken(host, port, unit_id):
                    errors[CONF_HOST] = "stiebel_duplicate"
                else:
                    updated = dict(data)
                    updated[CONF_HOST] = host
                    updated[CONF_PORT] = port
                    updated[CONF_UNIT_ID] = unit_id
                    self.hass.config_entries.async_update_entry(
                        self.config_entry, data=updated
                    )
                    return self.async_create_entry(
                        title="", data={CONF_SCAN_INTERVAL: seconds}
                    )
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_HOST, default=data.get(CONF_HOST, "")): str,
                    vol.Required(
                        CONF_PORT, default=data.get(CONF_PORT, stiebel_isg.DEFAULT_PORT)
                    ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
                    vol.Required(
                        CONF_UNIT_ID,
                        default=data.get(CONF_UNIT_ID, stiebel_isg.DEFAULT_UNIT_ID),
                    ): vol.All(vol.Coerce(int), vol.Range(min=0, max=255)),
                    vol.Required(
                        CONF_SCAN_INTERVAL,
                        default=self.config_entry.options.get(
                            CONF_SCAN_INTERVAL, stiebel_isg.DEFAULT_SCAN_SECONDS
                        ),
                    ): vol.All(
                        vol.Coerce(int),
                        vol.Range(min=stiebel_isg.MIN_SCAN_SECONDS, max=300),
                    ),
                }
            ),
            errors=errors,
        )

    def _target_taken(self, host: str, port: int, unit_id: int) -> bool:
        """Return True when another entry already uses this ISG target. @zara"""
        entries = []
        config_entries = getattr(self.hass, "config_entries", None)
        if config_entries is not None:
            entries = config_entries.async_entries(DOMAIN)
        return stiebel_same_target(
            entries, host, port, unit_id, skip=self.config_entry.entry_id
        )


class LocalOptionsFlowHandler(ExternalMeterOptionsMixin, config_entries.OptionsFlow):
    """Options of a local-API instance (Fronius, Zendure): polling interval. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Manage the polling interval in seconds. @zara"""
        data = getattr(self.config_entry, "data", None) or {}
        if data.get(CONF_CONNECTION) == maxxisun.CONNECTION_LOCAL:
            return await self._async_finish_options(dict(self.config_entry.options))
        if user_input is not None:
            return await self._async_finish_options(
                {**self.config_entry.options, **user_input}
            )
        module = {
            zendure.CONNECTION_LOCAL: zendure,
            opendtu.CONNECTION_LOCAL: opendtu,
            hoymiles_dtu.CONNECTION_LOCAL: hoymiles_dtu,
            kostal.CONNECTION_LOCAL: kostal,
            solax.CONNECTION_LOCAL: solax,
            sungrow.CONNECTION_LOCAL: sungrow,
            huawei.CONNECTION_LOCAL: huawei,
            solakon.CONNECTION_LOCAL: solakon,
            ahoy.CONNECTION_LOCAL: ahoy,
            deye.CONNECTION_SOLARMAN: deye,
            deye.CONNECTION_MODBUS: deye,
            solplanet.CONNECTION_MODBUS: solplanet,
        }.get(self.config_entry.data.get(CONF_CONNECTION), fronius)
        current = self.config_entry.options.get(
            CONF_SCAN_INTERVAL, module.DEFAULT_SCAN_SECONDS
        )
        fields: dict[Any, Any] = {
            vol.Required(CONF_SCAN_INTERVAL, default=current): vol.All(
                vol.Coerce(int),
                vol.Range(min=getattr(module, "MIN_SCAN_SECONDS", 5), max=300),
            )
        }
        if module is fronius:
            fields[
                vol.Required(
                    CONF_MODBUS,
                    default=self.config_entry.options.get(CONF_MODBUS, MODBUS_DEFAULT),
                )
            ] = bool
        return self.async_show_form(step_id="init", data_schema=vol.Schema(fields))


class AnkerSolixOptionsFlowHandler(
    ExternalMeterOptionsMixin, config_entries.OptionsFlow
):
    """Handle an options flow. @thomas"""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow. @thomas"""
        if AwesomeVersion(HAVERSION) < "2024.11.99":
            self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle options flow. @thomas"""
        errors: dict[str, str] = {}
        placeholders: dict[
            str, str
        ] = {}  # NOTE: Passed option placeholder do not work with translation files, HASS Bug?
        placeholders[MQTT_LINK] = MQ_LINK

        existing_options = self.config_entry.options.copy()

        if user_input:
            test_options = user_input.get(CONF_TEST_OPTIONS, {})
            if test_options.get(TESTFOLDER) or not test_options.get(TESTMODE):
                # merge new options from user form with existing options in config entry
                return await self._async_finish_options(existing_options | user_input)
            # Test mode enabled but no existing folder selected
            errors[TESTFOLDER] = "folder_invalid"

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                await get_options_schema(user_input or self.config_entry.options)
            ),
            errors=errors,
            description_placeholders=placeholders,
        )


async def get_options_schema(entry: dict | None = None) -> dict:
    """Create the options schema dictionary. @thomas"""

    if entry is None:
        entry = {}
    api_options = entry.get(CONF_API_OPTIONS, {})
    api_options_schema = {
        vol.Optional(
            CONF_SCAN_INTERVAL,
            default=api_options.get(
                CONF_SCAN_INTERVAL,
                SCAN_INTERVAL_DEF,
            ),
        ): vol.All(
            cv.positive_int,
            selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=_SCAN_INTERVAL_MIN,
                    max=_SCAN_INTERVAL_MAX,
                    step=_SCAN_INTERVAL_STEP,
                    unit_of_measurement="sec",
                    mode=selector.NumberSelectorMode.BOX,
                ),
            ),
        ),
        vol.Optional(
            INTERVALMULT,
            default=api_options.get(INTERVALMULT, INTERVALMULT_DEF),
        ): vol.All(
            cv.positive_int,
            selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=_INTERVALMULT_MIN,
                    max=_INTERVALMULT_MAX,
                    step=_INTERVALMULT_STEP,
                    unit_of_measurement="updates",
                    mode=selector.NumberSelectorMode.SLIDER,
                ),
            ),
        ),
        vol.Optional(
            CONF_DELAY_TIME,
            default=api_options.get(CONF_DELAY_TIME, DELAY_TIME_DEF),
        ): selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=_DELAY_TIME_MIN,
                max=_DELAY_TIME_MAX,
                step=_DELAY_TIME_STEP,
                unit_of_measurement="sec",
                mode=selector.NumberSelectorMode.SLIDER,
            ),
        ),
        vol.Optional(
            CONF_TIMEOUT,
            default=api_options.get(CONF_TIMEOUT, TIMEOUT_DEF),
        ): vol.All(
            cv.positive_int,
            selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=_TIMEOUT_MIN,
                    max=_TIMEOUT_MAX,
                    step=_TIMEOUT_STEP,
                    unit_of_measurement="sec",
                    mode=selector.NumberSelectorMode.SLIDER,
                ),
            ),
        ),
        vol.Optional(
            CONF_ENDPOINT_LIMIT,
            default=api_options.get(CONF_ENDPOINT_LIMIT, ENDPOINT_LIMIT_DEF),
        ): vol.All(
            cv.positive_int,
            selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=_ENDPOINT_LIMIT_MIN,
                    max=_ENDPOINT_LIMIT_MAX,
                    step=_ENDPOINT_LIMIT_STEP,
                    unit_of_measurement="requests",
                    mode=selector.NumberSelectorMode.SLIDER,
                ),
            ),
        ),
        vol.Optional(
            CONF_API_ENCRYPTION,
            default=api_options.get(CONF_API_ENCRYPTION, API_ENCRYPTION_DEF),
        ): selector.BooleanSelector(),
        vol.Optional(
            CONF_SKIP_INVALID,
            default=api_options.get(CONF_SKIP_INVALID, SKIP_INVALID_DEF),
        ): selector.BooleanSelector(),
    }
    mqtt_options = entry.get(CONF_MQTT_OPTIONS, {})
    mqtt_options_schema = {
        vol.Optional(
            CONF_MQTT_USAGE,
            default=mqtt_options.get(CONF_MQTT_USAGE, MQTT_USAGE_DEF),
        ): selector.BooleanSelector(),
        vol.Optional(
            CONF_TRIGGER_TIMEOUT,
            default=mqtt_options.get(
                CONF_TRIGGER_TIMEOUT,
                TRIGGER_TIMEOUT_DEF,
            ),
        ): vol.All(
            cv.positive_int,
            selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=_TRIGGER_TIMEOUT_MIN,
                    max=_TRIGGER_TIMEOUT_MAX,
                    step=_TRIGGER_TIMEOUT_STEP,
                    unit_of_measurement="sec",
                    mode=selector.NumberSelectorMode.SLIDER,
                ),
            ),
        ),
    }

    schema = {
        # Items grouped for Api options
        vol.Required(CONF_API_OPTIONS): section(
            vol.Schema(api_options_schema),
            {"collapsed": True},
        ),
        # Items grouped for MQTT options
        vol.Required(CONF_MQTT_OPTIONS): section(
            vol.Schema(mqtt_options_schema),
            {"collapsed": True},
        ),
        vol.Optional(
            CONF_EXCLUDE,
            default=entry.get(
                CONF_EXCLUDE,
                list(api_client.DEFAULT_EXCLUDE_CATEGORIES),
            ),
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=list(api_client.API_CATEGORIES),
                # mode="dropdown",
                # mode="list",
                sort=False,
                multiple=True,
                translation_key=CONF_EXCLUDE,
            )
        ),
    }
    if _ALLOW_TESTMODE:
        if not (jsonfolders := await api_client.json_example_folders()):
            # Add empty element to ensure proper list validation
            jsonfolders = [""]
        jsonfolders.sort()
        test_options = entry.get(CONF_TEST_OPTIONS, {})
        test_options_schema = {
            vol.Optional(
                TESTMODE,
                default=test_options.get(TESTMODE, False),
            ): selector.BooleanSelector(),
            vol.Optional(
                TESTFOLDER,
                description={
                    "suggested_value": test_options.get(
                        TESTFOLDER, next(iter(jsonfolders), "")
                    )
                },
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(options=jsonfolders, mode="dropdown")
            ),
            vol.Optional(
                CONF_MQTT_TEST_SPEED,
                default=test_options.get(CONF_MQTT_TEST_SPEED, _MQTT_POLLER_SPEED_DEF),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=_MQTT_POLLER_SPEED_MIN,
                    max=_MQTT_POLLER_SPEED_MAX,
                    step=_MQTT_POLLER_SPEED_MIN,
                    unit_of_measurement="",
                    mode=selector.NumberSelectorMode.SLIDER,
                ),
            ),
        }
        schema.update(
            {
                # Items grouped for Test options
                vol.Required(CONF_TEST_OPTIONS): section(
                    vol.Schema(test_options_schema),
                    {"collapsed": False},
                ),
            }
        )
    return schema


async def async_check_and_remove_devices(
    hass: HomeAssistant,
    user_input: dict[str, Any],
    apidata: dict,
    excluded: set | None = None,
    configured_user: str | None = None,
) -> config_entries.ConfigEntry | None:
    """Check if given user input with its initial apidata has shared devices with existing configuration. @thomas

    If there are none, remove devices of this config that are no longer available for the configuration.
    """

    obsolete_user_devs = {}
    # ensure device type is also excluded when subcategories are excluded to remove device entities with reload from registry
    if excluded:
        # Subcategories for Account devices
        if {
            SolixDeviceType.VEHICLE.value,
            ApiCategories.account_info,
            ApiCategories.mqtt_devices,
        } & excluded:
            excluded = excluded | {SolixDeviceType.ACCOUNT.value}
        # Subcategories for System devices
        if {
            ApiCategories.site_price,
            SolixDeviceType.SOLARBANK.value,
            SolixDeviceType.SOLARBANK_PPS.value,
            SolixDeviceType.INVERTER.value,
            SolixDeviceType.PPS.value,
            SolixDeviceType.POWERPANEL.value,
            SolixDeviceType.SMARTMETER.value,
            SolixDeviceType.SMARTPLUG.value,
            SolixDeviceType.HES.value,
            SolixDeviceType.EV_CHARGER.value,
            SolixDeviceType.CHARGER.value,
            SolixDeviceType.COMBINER_BOX.value,
            SolixDeviceType.HOME_BACKUP,
            SolixDeviceType.POWERBANK.value,
            SolixDeviceType.GENERATOR.value,
            SolixDeviceType.POWERCOOLER.value,
            ApiCategories.solarbank_energy,
            ApiCategories.smartmeter_energy,
            ApiCategories.smartplug_energy,
            ApiCategories.solar_energy,
            ApiCategories.powerpanel_energy,
            ApiCategories.hes_energy,
        } & excluded:
            excluded = excluded | {SolixDeviceType.SYSTEM.value}
        # Subcategories for Solarbank only
        if {
            ApiCategories.solarbank_cutoff,
            ApiCategories.solarbank_fittings,
            ApiCategories.solarbank_solar_info,
            ApiCategories.solarbank_energy,
        } & excluded:
            excluded = excluded | {SolixDeviceType.SOLARBANK.value}
        # Subcategories for Smart Plugs only
        if {
            ApiCategories.smartplug_energy,
        } & excluded:
            excluded = excluded | {SolixDeviceType.SMARTPLUG.value}
        # Subcategories for Smart Meter only
        if {
            ApiCategories.smartmeter_energy,
        } & excluded:
            excluded = excluded | {SolixDeviceType.SMARTMETER.value}
        # Subcategories for mini Charger only
        if {
            ApiCategories.charger_usb_settings,
        } & excluded:
            excluded = excluded | {SolixDeviceType.CHARGER.value}
        # Subcategories for Power Panels only
        if {
            ApiCategories.powerpanel_avg_power,
            ApiCategories.powerpanel_energy,
        } & excluded:
            excluded = excluded | {SolixDeviceType.POWERPANEL.value}
        # Subcategories for HES only
        if {
            ApiCategories.hes_avg_power,
            ApiCategories.hes_energy,
        } & excluded:
            excluded = excluded | {SolixDeviceType.HES.value}
        # Subcategories for all managed Devices
        if {
            ApiCategories.device_auto_upgrade,
            ApiCategories.device_tag,
            ApiCategories.mqtt_devices,
        } & excluded:
            excluded = excluded | {
                SolixDeviceType.SOLARBANK.value,
                SolixDeviceType.SOLARBANK_PPS.value,
                SolixDeviceType.INVERTER.value,
                SolixDeviceType.PPS.value,
                SolixDeviceType.POWERPANEL.value,
                SolixDeviceType.SMARTMETER.value,
                SolixDeviceType.SMARTPLUG.value,
                SolixDeviceType.HES.value,
                SolixDeviceType.EV_CHARGER.value,
                SolixDeviceType.CHARGER.value,
                SolixDeviceType.COMBINER_BOX.value,
                SolixDeviceType.HOME_BACKUP,
                SolixDeviceType.POWERBANK.value,
                SolixDeviceType.POWERCOOLER.value,
                SolixDeviceType.GENERATOR.value,
            }

    # get all device entries for a domain
    cfg_entries = hass.config_entries.async_entries(domain=DOMAIN)
    for cfg_entry in cfg_entries:
        device_entries = dr.async_entries_for_config_entry(
            dr.async_get(hass), cfg_entry.entry_id
        )
        cfg_username = cfg_entry.data.get(CONF_USERNAME)
        for dev_entry in device_entries:
            if (
                username := str(user_input.get(CONF_USERNAME) or "")
            ) and username != cfg_username:
                # config entry of another account
                if (
                    dev_entry.serial_number in apidata
                    and configured_user != cfg_username
                ):
                    return cfg_entry
            # device is registered for same account, check if still used in coordinator data or excluded and add to obsolete list for removal
            elif dev_entry.serial_number not in apidata or (
                excluded
                and not {apidata.get(dev_entry.serial_number, {}).get("type")}
                - excluded
            ):
                obsolete_user_devs[dev_entry.id] = dev_entry.serial_number

    # Remove the obsolete device entries if not only checking for configured user during switch
    if not configured_user and obsolete_user_devs:
        dev_registry = None
        # Save actual restore states before removal
        await restore_state.RestoreStateData.async_save_persistent_states(hass)
        LOGGER.info("Saved HA states of restore entities prior removing devices")
        for dev_id, serial in obsolete_user_devs.items():
            # ensure to obtain dev registry again if no longer available
            if dev_registry is None:
                dev_registry = dr.async_get(hass)
            dev_registry.async_remove_device(dev_id)
            # NOTE: removal of any underlying entities is handled by core
            LOGGER.info(
                "Removed device entry %s from registry for device %s due to excluded entities or unused device",
                dev_id,
                serial,
            )
    return None


class HpOptionsFlowHandler(config_entries.OptionsFlow):
    """S-INV HP has no options until a heat-pump manufacturer exists. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Nothing to configure on the aggregate. @zara"""
        return self.async_abort(reason="hp_no_options")


class SiteOptionsFlowHandler(config_entries.OptionsFlow):
    """Options of the installation: anonymous install count. @zara"""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Open the installation options. @zara"""
        return await self.async_step_site(user_input)

    async def async_step_site(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Switch the anonymous daily install count on or off. @zara"""
        if user_input is not None:
            return self.async_create_entry(
                data={**self.config_entry.options, **user_input}
            )
        return self.async_show_form(
            step_id="site",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_INSTALL_COUNT,
                        default=self.config_entry.options.get(
                            CONF_INSTALL_COUNT, INSTALL_COUNT_DEFAULT
                        ),
                    ): bool
                }
            ),
        )
