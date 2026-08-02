"""Home Assistant lifecycle adapter for the installation-wide service."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

from .contracts import SERVICE_API_VERSION, ServiceState
from .errors import CompatibilityError, ServiceUnavailable
from .service import CentralDatabaseService

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

DOMAIN = "solar_forecast_ml"
DATABASE_SERVICE_KEY = "database_service"
_CONTROLLER_KEY = "_database_service_controller"


@dataclass(slots=True)
class _BootstrapController:
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    condition: asyncio.Condition = field(default_factory=asyncio.Condition)
    service: CentralDatabaseService | None = None

    async def publish(self) -> None:
        async with self.condition:
            self.condition.notify_all()


async def async_setup_database_service(
    hass: HomeAssistant,
    *,
    database_path: Path | None = None,
    create_database: bool = False,
    bootstrap_schema: bool = True,
    defer_start: bool = False,
) -> CentralDatabaseService:
    """Start or return the one service instance for this HA installation."""

    domain_data = hass.data.setdefault(DOMAIN, {})
    controller = domain_data.get(_CONTROLLER_KEY)
    if controller is None:
        controller = _BootstrapController()
        domain_data[_CONTROLLER_KEY] = controller
    if not isinstance(controller, _BootstrapController):
        raise ServiceUnavailable("Invalid database service bootstrap state")
    async with controller.lock:
        if controller.service is not None:
            if (
                database_path is not None
                and controller.service.database_path
                != database_path.expanduser().resolve(strict=False)
            ):
                raise ServiceUnavailable(
                    "A database service for a different path already exists"
                )
            if (
                not defer_start
                and controller.service.state is ServiceState.DATABASE_MISSING
            ):
                await controller.service.start()
                if controller.service.state is ServiceState.READY:
                    await controller.publish()
            return controller.service
        path = database_path or Path(
            hass.config.path("solar_forecast_ml", "solar_forecast.db")
        )
        service = CentralDatabaseService(
            path,
            create_database=create_database,
            bootstrap_schema=bootstrap_schema,
        )
        controller.service = service
        domain_data[DATABASE_SERVICE_KEY] = service
        if not defer_start:
            try:
                await service.start()
            except BaseException:
                controller.service = None
                domain_data.pop(DATABASE_SERVICE_KEY, None)
                raise
        await controller.publish()
        return service


async def async_attach_database_manager(
    hass: HomeAssistant, database_manager: Any
) -> CentralDatabaseService:
    """Publish the connected SFML writer as the service's sole connection."""

    domain_data = hass.data.setdefault(DOMAIN, {})
    controller = domain_data.get(_CONTROLLER_KEY)
    if not isinstance(controller, _BootstrapController):
        raise ServiceUnavailable("Database service must be initialized before attach")
    async with controller.lock:
        service = controller.service
        if service is None:
            raise ServiceUnavailable("Database service is unavailable")
        await service.attach_database_manager(database_manager)
        await controller.publish()
        return service


async def async_detach_database_manager(
    hass: HomeAssistant, database_manager: Any
) -> None:
    """Release the current entry writer while retaining the service facade."""

    domain_data = hass.data.get(DOMAIN)
    if not isinstance(domain_data, dict):
        return
    controller = domain_data.get(_CONTROLLER_KEY)
    if not isinstance(controller, _BootstrapController):
        return
    async with controller.lock:
        if controller.service is not None:
            await controller.service.detach_database_manager(database_manager)
        await controller.publish()


async def async_shutdown_database_service(
    hass: HomeAssistant, *, drain: bool = False
) -> None:
    """Stop and unpublish the installation-wide service during HA shutdown."""

    domain_data = hass.data.get(DOMAIN)
    if not isinstance(domain_data, dict):
        return
    controller = domain_data.get(_CONTROLLER_KEY)
    if not isinstance(controller, _BootstrapController):
        return
    async with controller.lock:
        if controller.service is not None:
            await controller.service.stop(drain=drain)
            controller.service = None
        domain_data.pop(DATABASE_SERVICE_KEY, None)
        await controller.publish()


async def async_wait_for_database_service(
    hass: HomeAssistant,
    *,
    api_version: str = SERVICE_API_VERSION,
    timeout: float = 30.0,
) -> CentralDatabaseService:
    """Wait without polling until a compatible service becomes available."""

    domain_data = hass.data.setdefault(DOMAIN, {})
    controller = domain_data.get(_CONTROLLER_KEY)
    if controller is None:
        controller = _BootstrapController()
        domain_data[_CONTROLLER_KEY] = controller
    if not isinstance(controller, _BootstrapController):
        raise ServiceUnavailable("Invalid database service bootstrap state")

    async def ready() -> CentralDatabaseService:
        service = controller.service
        if service is None or service.state is not ServiceState.READY:
            raise ServiceUnavailable("Central database service is not ready")
        if service.api_version.split(".", 1)[0] != api_version.split(".", 1)[0]:
            raise CompatibilityError("Incompatible central database service API")
        return service

    try:
        return await ready()
    except ServiceUnavailable:
        pass
    try:
        async with asyncio.timeout(timeout):
            async with controller.condition:
                while True:
                    await controller.condition.wait()
                    try:
                        return await ready()
                    except ServiceUnavailable:
                        continue
    except TimeoutError as error:
        raise ServiceUnavailable(
            "Timed out waiting for the central database service"
        ) from error
