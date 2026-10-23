# ******************************************************************************
# @copyright (C) 2026 Zara-Toorox - Solar Forecast S-INV
# * This program is protected by a Proprietary Non-Commercial License.
# 1. Personal and Educational use only.
# 2. COMMERCIAL USE AND AI TRAINING ARE STRICTLY PROHIBITED.
# 3. Clear attribution to "Zara-Toorox" is required.
# * Full license terms: https://www.solarforecastml.com/license
# ******************************************************************************

"""Read-only Solarman V5 transport for one Modbus RTU exchange. @zara

Frame layout (little-endian header, big-endian Modbus RTU inside): start 0xA5,
payload length, control (request 0x4510, response 0x1510), a two-byte sequence
whose first byte is echoed, the logger serial, then the payload, a checksum
over every byte except start, checksum and end, and end 0x15. The request
payload is frame type 0x02, a zero sensor type and three zero time fields, then
the Modbus RTU frame. The response payload is frame type, a status byte and the
three time fields, then the Modbus RTU frame. S-INV only reads (0x03, 0x04). A well-framed datagram
whose control code is not the response is discarded, at most three of them per
read and inside that read's timeout. Any other framing error closes the socket.
"""

from __future__ import annotations

import asyncio
import contextlib
import struct

from .modbus_tcp import (
    MAX_REGISTERS_PER_READ,
    READ_FUNCTIONS,
    READ_HOLDING_REGISTERS,
    ModbusError,
)

START = 0xA5
END = 0x15
CONTROL_REQUEST = 0x4510
CONTROL_RESPONSE = 0x1510
FRAME_TYPE_INVERTER = 0x02
# response prefix (14) plus the smallest Modbus RTU frame (unit, function, crc)
MIN_PAYLOAD = 18
# 125 registers: 14 byte prefix + unit/function/count + 250 data + crc + 2 stray
MAX_PAYLOAD = 300
# logger heartbeats and other unsolicited frames on the same socket
MAX_DISCARDED_FRAMES = 3
CLOSE_TIMEOUT = 5.0
_RESPONSE_PREFIX = 14


class SolarmanError(ModbusError):
    """A Solarman frame or the Modbus RTU frame inside it is not usable. @zara"""

    def __init__(
        self, message: str, code: int | None = None, *, fatal: bool = True
    ) -> None:
        """``fatal`` closes the socket; a Modbus exception does not. @zara"""
        super().__init__(message, code)
        self.fatal = fatal


def _crc16(data: bytes) -> int:
    """Modbus RTU CRC-16 (poly 0xA001, init 0xFFFF). @zara"""
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc


def _crc_ok(frame: bytes) -> bool:
    if len(frame) < 4:
        return False
    return _crc16(frame[:-2]) == struct.unpack_from("<H", frame, len(frame) - 2)[0]


def framed_control(frame: bytes) -> int:
    """Return the control code when start, length, checksum and end match. @zara"""
    if len(frame) < 13 or frame[0] != START:
        raise SolarmanError("frame did not start with 0xA5")
    length = struct.unpack_from("<H", frame, 1)[0]
    if length > MAX_PAYLOAD:
        raise SolarmanError("frame length out of range")
    expected = 11 + length + 2
    if len(frame) != expected:
        raise SolarmanError(
            "short frame" if len(frame) < expected else "trailing bytes after frame"
        )
    if (sum(frame[1:-2]) & 0xFF) != frame[-2]:
        raise SolarmanError("frame checksum mismatch")
    if frame[-1] != END:
        raise SolarmanError("frame did not end with 0x15")
    return struct.unpack_from("<H", frame, 3)[0]


def _assemble(control: int, sequence: int, logger_serial: int, payload: bytes) -> bytes:
    if len(payload) > MAX_PAYLOAD:
        raise SolarmanError("payload length out of range")
    header = struct.pack(
        "<BHHHI",
        START,
        len(payload),
        control & 0xFFFF,
        sequence & 0xFFFF,
        logger_serial & 0xFFFFFFFF,
    )
    # every byte except start, the checksum itself and the end byte
    checksum = (sum(header[1:]) + sum(payload)) & 0xFF
    return header + payload + bytes((checksum, END))


def _modbus_rtu(unit_id: int, pdu: bytes) -> bytes:
    body = bytes((unit_id & 0xFF,)) + pdu
    return body + struct.pack("<H", _crc16(body))


def build_request(
    sequence: int,
    logger_serial: int,
    unit_id: int,
    function: int,
    address: int,
    count: int,
) -> bytes:
    """Build one read request. ``sequence`` uses the low byte only. @zara"""
    if function not in READ_FUNCTIONS:
        raise ValueError(f"function {function:#04x} is not a read function")
    if not 1 <= count <= MAX_REGISTERS_PER_READ:
        raise ValueError(f"invalid register count {count}")
    # frame type, sensor type, total working time, power-on time, offset time
    prefix = struct.pack("<BHIII", FRAME_TYPE_INVERTER, 0, 0, 0, 0)
    pdu = struct.pack(">BHH", function & 0xFF, address & 0xFFFF, count & 0xFFFF)
    return _assemble(
        CONTROL_REQUEST,
        sequence,
        logger_serial,
        prefix + _modbus_rtu(unit_id, pdu),
    )


def build_response(
    sequence: int,
    logger_serial: int,
    unit_id: int,
    function: int,
    values: list[int],
) -> bytes:
    """Build a matching read response (tests and the local fake peer). @zara"""
    data = struct.pack(f">{len(values)}H", *[value & 0xFFFF for value in values])
    prefix = struct.pack("<BBIII", FRAME_TYPE_INVERTER, 0x01, 0, 0, 0)
    pdu = bytes((function & 0xFF, len(data))) + data
    return _assemble(
        CONTROL_RESPONSE, sequence, logger_serial, prefix + _modbus_rtu(unit_id, pdu)
    )


def build_exception_response(
    sequence: int,
    logger_serial: int,
    unit_id: int,
    function: int,
    code: int,
) -> bytes:
    """Build a Modbus exception inside a valid V5 frame. @zara"""
    prefix = struct.pack("<BBIII", FRAME_TYPE_INVERTER, 0x01, 0, 0, 0)
    pdu = bytes(((function & 0xFF) | 0x80, code & 0xFF))
    return _assemble(
        CONTROL_RESPONSE, sequence, logger_serial, prefix + _modbus_rtu(unit_id, pdu)
    )


def _modbus_body(raw: bytes) -> bytes:
    """Return the Modbus RTU frame without its CRC; accept one extra 0x0000. @zara"""
    if _crc_ok(raw):
        return raw[:-2]
    # some loggers append a second CRC that is always 0x0000
    if len(raw) >= 6 and raw[-2:] == b"\x00\x00" and _crc_ok(raw[:-2]):
        return raw[:-4]
    raise SolarmanError("modbus checksum mismatch")


def parse_response(
    frame: bytes,
    *,
    sequence: int,
    logger_serial: int,
    unit_id: int,
    function: int,
    count: int,
) -> list[int]:
    """Return ``count`` registers or raise ``SolarmanError``. @zara"""
    if len(frame) < 1 + 2 + MIN_PAYLOAD + 2:
        raise SolarmanError("short frame")
    if frame[0] != START:
        raise SolarmanError("frame did not start with 0xA5")
    length = struct.unpack_from("<H", frame, 1)[0]
    if not MIN_PAYLOAD <= length <= MAX_PAYLOAD:
        raise SolarmanError("frame length out of range")
    # 11 byte header, payload, checksum and end
    expected = 11 + length + 2
    if len(frame) < expected:
        raise SolarmanError("short frame")
    if len(frame) > expected:
        raise SolarmanError("trailing bytes after frame")
    if (sum(frame[1:-2]) & 0xFF) != frame[-2]:
        raise SolarmanError("frame checksum mismatch")
    if frame[-1] != END:
        raise SolarmanError("frame did not end with 0x15")
    control, seq, serial = struct.unpack_from("<HHI", frame, 3)
    if control != CONTROL_RESPONSE:
        raise SolarmanError("unexpected control code")
    # the logger owns the second sequence byte and increments it on its own
    if (seq & 0xFF) != (sequence & 0xFF):
        raise SolarmanError("sequence mismatch")
    if serial != (logger_serial & 0xFFFFFFFF):
        raise SolarmanError("logger serial mismatch")
    payload = frame[11 : 11 + length]
    if len(payload) < _RESPONSE_PREFIX or payload[0] != FRAME_TYPE_INVERTER:
        raise SolarmanError("unexpected frame type")
    body = _modbus_body(payload[_RESPONSE_PREFIX:])
    if not body or body[0] != (unit_id & 0xFF):
        raise SolarmanError("unit mismatch")
    if body[1] == (function | 0x80):
        code = body[2] if len(body) > 2 else None
        raise SolarmanError(f"exception code {code}", code, fatal=False)
    if body[1] != function or len(body) < 3 or body[2] != 2 * count:
        raise SolarmanError("unexpected modbus response")
    data = body[3 : 3 + 2 * count]
    if len(data) != 2 * count:
        raise SolarmanError("unexpected modbus response")
    return list(struct.unpack(f">{count}H", data))


class SolarmanV5Client:
    """Read holding or input registers through one Solarman V5 socket. @zara"""

    def __init__(
        self,
        host: str,
        port: int,
        unit_id: int,
        logger_serial: int,
        timeout: float = 10.0,
        min_gap: float = 0.0,
    ) -> None:
        """Remember the target; connect in ``__aenter__``. @zara"""
        if isinstance(logger_serial, bool) or not isinstance(logger_serial, int):
            raise TypeError("logger serial must be an integer")
        if not 0 <= logger_serial <= 0xFFFFFFFF:
            raise ValueError("logger serial must be an integer")
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self.logger_serial = logger_serial
        self.timeout = timeout
        self.min_gap = min_gap
        self._last_request = 0.0
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._sequence = 0

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

    async def __aenter__(self) -> SolarmanV5Client:
        """Open the connection. @zara"""
        await self.connect()
        return self

    async def __aexit__(self, *args) -> None:
        """Close the connection. @zara"""
        await self.close()

    def _next_sequence(self) -> int:
        self._sequence = self._sequence % 255 + 1
        return self._sequence

    async def _wait_gap(self) -> None:
        if not self.min_gap:
            return
        wait = self._last_request + self.min_gap - asyncio.get_running_loop().time()
        if wait > 0:
            await asyncio.sleep(wait)

    def _mark_request(self) -> None:
        self._last_request = asyncio.get_running_loop().time()

    async def _read_exact(self, count: int, deadline: float) -> bytes:
        if self._reader is None:
            raise SolarmanError("not connected", fatal=False)
        remaining = deadline - asyncio.get_running_loop().time()
        if remaining <= 0:
            raise TimeoutError
        return await asyncio.wait_for(self._reader.readexactly(count), remaining)

    async def _read_frame(self, deadline: float) -> bytes:
        header = await self._read_exact(11, deadline)
        if header[0] != START:
            raise SolarmanError("frame did not start with 0xA5")
        length = struct.unpack_from("<H", header, 1)[0]
        if length > MAX_PAYLOAD:
            raise SolarmanError("frame length out of range")
        return header + await self._read_exact(length + 2, deadline)

    async def read(
        self, address: int, count: int, function: int = READ_HOLDING_REGISTERS
    ) -> list[int]:
        """Read ``count`` holding (0x03) or input (0x04) registers. @zara"""
        if self._reader is None or self._writer is None:
            raise SolarmanError("not connected", fatal=False)
        if function not in READ_FUNCTIONS:
            raise ValueError(f"function {function:#04x} is not a read function")
        if not 1 <= count <= MAX_REGISTERS_PER_READ:
            raise ValueError(f"invalid register count {count}")
        await self._wait_gap()
        sequence = self._next_sequence()
        request = build_request(
            sequence, self.logger_serial, self.unit_id, function, address, count
        )
        try:
            self._writer.write(request)
            await self._writer.drain()
            deadline = asyncio.get_running_loop().time() + self.timeout
            discarded = 0
            while True:
                frame = await self._read_frame(deadline)
                control = framed_control(frame)
                if control != CONTROL_RESPONSE:
                    discarded += 1
                    if discarded > MAX_DISCARDED_FRAMES:
                        raise SolarmanError("too many unexpected control frames")
                    continue
                values = parse_response(
                    frame,
                    sequence=sequence,
                    logger_serial=self.logger_serial,
                    unit_id=self.unit_id,
                    function=function,
                    count=count,
                )
                break
        except SolarmanError as err:
            if err.fatal:
                await self.close()
            else:
                self._mark_request()
            raise
        except (OSError, TimeoutError, EOFError):
            await self.close()
            raise
        self._mark_request()
        return values
