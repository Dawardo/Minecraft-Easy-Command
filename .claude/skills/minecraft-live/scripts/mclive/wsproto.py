"""Minimal RFC 6455 WebSocket framing on asyncio streams. Standard library only.

Used by the bridge (server side, talking to Minecraft) and by the simulator (client side).
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import os
import struct

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
OP_CONT, OP_TEXT, OP_BINARY, OP_CLOSE, OP_PING, OP_PONG = 0x0, 0x1, 0x2, 0x8, 0x9, 0xA


class ConnectionClosed(Exception):
    pass


def accept_key(key: str) -> str:
    return base64.b64encode(hashlib.sha1((key.strip() + GUID).encode()).digest()).decode()


def _mask(data: bytes, mask: bytes) -> bytes:
    n = len(data)
    if not n:
        return data
    m = (mask * (n // 4 + 1))[:n]
    return (int.from_bytes(data, "big") ^ int.from_bytes(m, "big")).to_bytes(n, "big")


class WebSocket:
    """One WebSocket connection over an already-upgraded asyncio stream pair."""

    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter,
                 is_client: bool = False, max_size: int = 64 * 1024 * 1024):
        self.reader = reader
        self.writer = writer
        self.is_client = is_client
        self.max_size = max_size
        self.closed = False
        self._send_lock = asyncio.Lock()

    async def _read_frame(self):
        head = await self.reader.readexactly(2)
        fin = bool(head[0] & 0x80)
        opcode = head[0] & 0x0F
        masked = bool(head[1] & 0x80)
        length = head[1] & 0x7F
        if length == 126:
            length = struct.unpack("!H", await self.reader.readexactly(2))[0]
        elif length == 127:
            length = struct.unpack("!Q", await self.reader.readexactly(8))[0]
        if length > self.max_size:
            raise ConnectionClosed("frame too large")
        mask = await self.reader.readexactly(4) if masked else None
        payload = await self.reader.readexactly(length) if length else b""
        if mask:
            payload = _mask(payload, mask)
        return fin, opcode, payload

    async def recv(self):
        """Return (opcode, payload) for the next complete TEXT/BINARY message.

        Pings are answered, pongs ignored, fragments reassembled. Raises ConnectionClosed.
        """
        parts, first_op = [], None
        while True:
            try:
                fin, opcode, payload = await self._read_frame()
            except (asyncio.IncompleteReadError, ConnectionError, OSError) as e:
                self.closed = True
                raise ConnectionClosed(str(e) or "connection lost")
            if opcode == OP_PING:
                await self.send(payload, OP_PONG)
                continue
            if opcode == OP_PONG:
                continue
            if opcode == OP_CLOSE:
                if not self.closed:
                    try:
                        await self.send(payload[:2], OP_CLOSE)
                    except Exception:
                        pass
                self.closed = True
                raise ConnectionClosed("closed by peer")
            if opcode in (OP_TEXT, OP_BINARY):
                first_op, parts = opcode, [payload]
            elif opcode == OP_CONT and first_op is not None:
                parts.append(payload)
            else:
                continue
            if fin:
                return first_op, b"".join(parts)

    async def send(self, data, opcode: int | None = None):
        if isinstance(data, str):
            data = data.encode("utf-8")
            opcode = OP_TEXT if opcode is None else opcode
        elif opcode is None:
            opcode = OP_BINARY
        n = len(data)
        head = bytearray([0x80 | opcode])
        mbit = 0x80 if self.is_client else 0
        if n < 126:
            head.append(mbit | n)
        elif n < 65536:
            head.append(mbit | 126)
            head += struct.pack("!H", n)
        else:
            head.append(mbit | 127)
            head += struct.pack("!Q", n)
        if self.is_client:
            mask = os.urandom(4)
            head += mask
            data = _mask(data, mask)
        async with self._send_lock:
            if self.closed and opcode != OP_CLOSE:
                raise ConnectionClosed("connection is closed")
            self.writer.write(bytes(head) + data)
            await self.writer.drain()

    async def close(self, code: int = 1000):
        if not self.closed:
            try:
                await self.send(struct.pack("!H", code), OP_CLOSE)
            except Exception:
                pass
        self.closed = True
        try:
            self.writer.close()
            await self.writer.wait_closed()
        except Exception:
            pass


async def read_http_head(reader: asyncio.StreamReader, limit: int = 65536):
    """Read an HTTP request/response head. Returns (first_line, headers dict with lowercase keys)."""
    raw = await reader.readuntil(b"\r\n\r\n")
    if len(raw) > limit:
        raise ValueError("header too large")
    lines = raw.decode("latin-1").split("\r\n")
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            headers[k.strip().lower()] = v.strip()
    return lines[0], headers


async def client_connect(host: str, port: int, path: str = "/", protocols=("com.microsoft.minecraft.wsencrypt",)):
    """Open a client WebSocket connection (used by the simulator and tests)."""
    reader, writer = await asyncio.open_connection(host, port)
    key = base64.b64encode(os.urandom(16)).decode()
    req = (f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
           f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n")
    if protocols:
        req += f"Sec-WebSocket-Protocol: {', '.join(protocols)}\r\n"
    writer.write((req + "\r\n").encode())
    await writer.drain()
    status, headers = await read_http_head(reader)
    if " 101 " not in status + " ":
        writer.close()
        raise ConnectionError(f"handshake failed: {status}")
    if headers.get("sec-websocket-accept") != accept_key(key):
        writer.close()
        raise ConnectionError("bad Sec-WebSocket-Accept")
    return WebSocket(reader, writer, is_client=True)
