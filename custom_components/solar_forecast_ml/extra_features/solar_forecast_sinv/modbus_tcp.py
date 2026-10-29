# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Minimal read-only Modbus TCP client (functions 0x03 and 0x04). @zara

S-INV only reads holding (0x03) or input (0x04) registers; there is deliberately
no write function. One connection per read cycle, requests strictly one after
another, optionally with a minimum gap the device requires between requests.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import struct

READ_HOLDING_REGISTERS = 0x03
READ_INPUT_REGISTERS = 0x04
READ_FUNCTIONS = (READ_HOLDING_REGISTERS, READ_INPUT_REGISTERS)
MAX_REGISTERS_PER_READ = 125
CLOSE_TIMEOUT = 5.0
# complete frames with a foreign transaction id skipped before the answer
MAX_FOREIGN_FRAMES = 3

_LOGGER = logging.getLogger(__package__)


class ModbusError(Exception):
    """The device answered with a Modbus exception or a malformed frame. @zara"""

    def __init__(self, message: str, code: int | None = None) -> None:
        """Keep the Modbus exception code, if the device sent one. @zara"""
        super().__init__(message)
        self.code = code


class ModbusTcpClient:
    """Read holding registers over one TCP connection. @zara"""

    def __init__(
        self,
        host: str,
        port: int,
        unit_id: int,
        timeout: float = 10.0,
        min_gap: float = 0.0,
    ) -> None:
        """Remember the target; connect in ``__aenter__``. @zara"""
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self.timeout = timeout
        self.min_gap = min_gap
        self._last_request = 0.0
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._transaction = 0

    @property
    def connected(self) -> bool:
        """Return True while the TCP connection is open. @zara"""
        return self._writer is not None and not self._writer.is_closing()

    async def connect(self) -> None:
        """Open the connection. @zara"""
        self._reader, self._writer = await asyncio.wait_for(
            asyncio.open_connection(self.host, self.port), self.timeout
        )

    async def close(self) -> None:
        """Close the connection. @zara"""
        if self._writer is not None:
            self._writer.close()
            with contextlib.suppress(OSError, TimeoutError):
                await asyncio.wait_for(self._writer.wait_closed(), CLOSE_TIMEOUT)
        self._reader = self._writer = None

    async def __aenter__(self) -> ModbusTcpClient:
        """Open the connection. @zara"""
        await self.connect()
        return self

    async def __aexit__(self, *args) -> None:
        """Close the connection. @zara"""
        await self.close()

    def _header_error(
        self, transaction: int, protocol: int, length: int, unit: int
    ) -> ModbusError:
        return ModbusError(
            "unexpected Modbus TCP header: "
            f"transaction {transaction} (sent {self._transaction}), "
            f"protocol {protocol}, length {length}, "
            f"unit {unit} (sent {self.unit_id})"
        )

    async def _read_answer(self, reader: asyncio.StreamReader) -> bytes:
        """Return the PDU answering the current transaction. @zara"""
        for _ in range(MAX_FOREIGN_FRAMES + 1):
            header = await reader.readexactly(7)
            transaction, protocol, length, unit = struct.unpack(">HHHB", header)
            if protocol != 0 or not 2 <= length <= 254:
                raise self._header_error(transaction, protocol, length, unit)
            body = await reader.readexactly(length - 1)
            if transaction == self._transaction:
                if unit != self.unit_id:
                    raise self._header_error(transaction, protocol, length, unit)
                return body
            # a late answer, e.g. to a request a gateway received just before it
            # dropped the previous connection: the frame was read completely, so
            # the stream stays in step and the right answer may still follow
            _LOGGER.debug(
                "Modbus %s:%s skipped foreign frame: transaction %s (sent %s), unit %s",
                self.host,
                self.port,
                transaction,
                self._transaction,
                unit,
            )
        raise ModbusError(
            f"no answer to transaction {self._transaction} after "
            f"{MAX_FOREIGN_FRAMES} foreign frames"
        )

    async def read(
        self, address: int, count: int, function: int = READ_HOLDING_REGISTERS
    ) -> list[int]:
        """Read ``count`` holding (0x03) or input (0x04) registers. @zara"""
        if self._reader is None or self._writer is None:
            raise ModbusError("not connected")
        if function not in READ_FUNCTIONS:
            raise ValueError(f"function {function:#04x} is not a read function")
        if not 1 <= count <= MAX_REGISTERS_PER_READ:
            raise ValueError(f"invalid register count {count}")
        if self.min_gap:
            # the gap counts from the end of the previous answer
            wait = self._last_request + self.min_gap - asyncio.get_running_loop().time()
            if wait > 0:
                await asyncio.sleep(wait)
        self._transaction = (self._transaction + 1) % 0x10000
        request = struct.pack(
            ">HHHBBHH",
            self._transaction,
            0,
            6,
            self.unit_id,
            function,
            address,
            count,
        )
        try:
            self._writer.write(request)
            await self._writer.drain()
            async with asyncio.timeout(self.timeout):
                body = await self._read_answer(self._reader)
        except (ModbusError, OSError, TimeoutError, EOFError):
            # a malformed or half-read frame leaves the stream out of step:
            # the connection is never reused after it
            await self.close()
            raise
        # exception answers count too, so the next request still keeps the gap
        self._last_request = asyncio.get_running_loop().time()
        if body[0] == function | 0x80:
            code = body[1] if len(body) > 1 else None
            raise ModbusError(f"exception code {code}", code)
        if body[0] != function or len(body) < 2 + 2 * count or body[1] != 2 * count:
            raise ModbusError("unexpected Modbus response")
        return list(struct.unpack(f">{count}H", body[2 : 2 + 2 * count]))
