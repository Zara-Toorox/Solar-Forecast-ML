# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Push coordinator for the maxxisun CCU webhook. @zara

The CCU posts JSON. There is no poll. Setup refresh with no payload yet returns
an empty device map so the config entry can load; entities appear with the
first valid push. Five minutes without a valid push mark the data stale.
"""

from __future__ import annotations

from collections.abc import Mapping
import json
from typing import Any

from aiohttp import web
from homeassistant.components import webhook
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import CONF_WEBHOOK_ID, DOMAIN, LOGGER
from .vendors import maxxisun

MAX_BODY = 65536  # 64 KiB
STALE_SECONDS = 300
# sanitized device id of the first accepted payload; later ids are ignored
SERIAL_KEY = "serial"


class MaxxisunCoordinator(DataUpdateCoordinator[dict[str, maxxisun.Device]]):
    """Receive one CCU webhook and publish its devices. @zara"""

    vendor = maxxisun

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        """Register the local POST webhook and the staleness timer. @zara"""
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name="S-INV maxxisun",
            update_interval=None,
        )
        self.webhook_id: str = entry.data[CONF_WEBHOOK_ID]
        self._stale_unsub: Any = None
        self._registered = False
        self._register_webhook()
        self._arm_stale()

    async def _async_update_data(self) -> dict[str, maxxisun.Device]:
        """Return an empty map until a push arrives. Keep a stale error. @zara"""
        if not self.last_update_success:
            raise UpdateFailed("no MaxxiCharge payload for 5 minutes")
        return self.data or {}

    def _register_webhook(self) -> None:
        """Accept only local POST requests. @zara"""
        webhook.async_register(
            self.hass,
            DOMAIN,
            "S-INV maxxisun",
            self.webhook_id,
            self.async_handle_webhook,
            local_only=True,
            allowed_methods=["POST"],
        )
        self._registered = True

    def _unregister_webhook(self) -> None:
        """Drop the webhook registration once. @zara"""
        if not self._registered:
            return
        webhook.async_unregister(self.hass, self.webhook_id)
        self._registered = False

    def _cancel_stale(self) -> None:
        unsub = self._stale_unsub
        self._stale_unsub = None
        if unsub is not None:
            unsub()

    def _arm_stale(self) -> None:
        """Restart the five-minute timer after setup or a valid push. @zara"""
        self._cancel_stale()
        self._stale_unsub = async_call_later(
            self.hass, STALE_SECONDS, self._async_mark_stale
        )

    async def _async_mark_stale(self, _now: object) -> None:
        """Mark entities unavailable until the next valid push. @zara"""
        self._stale_unsub = None
        if self._shutdown_requested:
            return
        self.async_set_update_error(
            UpdateFailed("no MaxxiCharge payload for 5 minutes")
        )

    def _pin_serial(self, serial: str) -> bool:
        """Keep the first serial. A different one is rejected. @zara"""
        entry = self.config_entry
        data = getattr(entry, "data", None)
        if entry is None or not isinstance(data, Mapping):
            return False
        current = data.get(SERIAL_KEY)
        if isinstance(current, str) and current:
            return current == serial
        self.hass.config_entries.async_update_entry(
            entry, data={**data, SERIAL_KEY: serial}
        )
        return entry.data.get(SERIAL_KEY) == serial

    async def _read_body(self, request: web.Request) -> bytes | None:
        """Read until EOF or past 64 KiB. Short reads are continued. @zara"""
        length = request.content_length
        if isinstance(length, int) and length > MAX_BODY:
            return None
        chunks: list[bytes] = []
        size = 0
        try:
            while size <= MAX_BODY:
                piece = await request.content.read(MAX_BODY + 1 - size)
                if not piece:
                    break
                if not isinstance(piece, (bytes, bytearray)):
                    return None
                chunks.append(bytes(piece))
                size += len(piece)
        except (
            ConnectionError,
            OSError,
            TimeoutError,
            RuntimeError,
            TypeError,
            ValueError,
        ):
            return None
        if size > MAX_BODY:
            return None
        return b"".join(chunks)

    async def _handle_payload(self, request: web.Request) -> web.Response:
        """Store one valid payload from the pinned CCU. @zara"""
        if self._shutdown_requested:
            return web.Response(status=200)
        body = await self._read_body(request)
        if body is None:
            return web.Response(status=200)
        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError, RecursionError, ValueError):
            return web.Response(status=200)
        if not isinstance(payload, dict):
            return web.Response(status=200)
        devices = maxxisun.build_devices(payload)
        if len(devices) != 1:
            return web.Response(status=200)
        serial = next(iter(devices))
        if not self._pin_serial(serial):
            return web.Response(status=200)
        self.async_set_updated_data(devices)
        self._arm_stale()
        return web.Response(status=200)

    async def async_handle_webhook(
        self, hass: HomeAssistant, webhook_id: str, request: web.Request
    ) -> web.Response:
        """Store one valid payload. Nothing raised here reaches the webhook log. @zara"""
        try:
            return await self._handle_payload(request)
        except Exception:
            return web.Response(status=200)

    async def async_shutdown(self) -> None:
        """Unregister the webhook and cancel the staleness timer. @zara"""
        self._cancel_stale()
        self._unregister_webhook()
        await super().async_shutdown()
