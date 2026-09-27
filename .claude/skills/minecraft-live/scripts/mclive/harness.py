"""Run the real bridge and the simulated Minecraft together in a background thread.

Used by `mc selftest` and the automated tests. The bridge writes its state file into
MC_CLAUDE_HOME, so the normal CLI (`mc.main([...])`) talks to it unmodified.
"""
from __future__ import annotations

import asyncio
import os
import tempfile
import threading
import time

from .bridge import Bridge
from .client import Client
from .fakemc import FakeMinecraft


class Harness:
    def __init__(self, encryption="auto", home=None, connect=True, **fake_kw):
        self.encryption = encryption
        self.fake_kw = fake_kw
        self.connect = connect
        self._tmp = None
        self.home = home
        self.loop = None
        self.bridge = None
        self.fake = None
        self._old_home = None

    def __enter__(self):
        if self.home is None:
            self._tmp = tempfile.TemporaryDirectory(prefix="mc-claude-test-")
            self.home = self._tmp.name
        self._old_home = os.environ.get("MC_CLAUDE_HOME")
        os.environ["MC_CLAUDE_HOME"] = self.home
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self.loop.run_forever, daemon=True)
        self.thread.start()
        self.call(self._start(), timeout=30)
        return self

    async def _start(self):
        self.bridge = Bridge(port=0, hosts=("127.0.0.1",), encryption=self.encryption)
        await self.bridge.start()
        self.fake = FakeMinecraft(**self.fake_kw)
        if self.connect:
            await self.connect_fake()

    async def connect_fake(self, fake=None):
        if fake is not None:
            self.fake = fake
        await self.fake.connect("127.0.0.1", self.bridge.port)
        t0 = time.time()
        while time.time() - t0 < 20:  # wait for the bridge's connect sequence (encryption, name, greeting)
            s = self.bridge.active
            if s is not None and any(e["event"] == "_connected" and e["session"] == s.id for e in self.bridge.events):
                return
            await asyncio.sleep(0.02)
        raise TimeoutError("fake Minecraft did not finish connecting")

    def call(self, coro, timeout=60):
        return asyncio.run_coroutine_threadsafe(coro, self.loop).result(timeout)

    def client(self) -> Client:
        return Client(self.bridge.port, self.bridge.token)

    def __exit__(self, *exc):
        async def _stop():
            if self.fake is not None:
                await self.fake.close()
            await self.bridge.close()
            tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        try:
            self.call(_stop(), timeout=10)
        finally:
            self.loop.call_soon_threadsafe(self.loop.stop)
            self.thread.join(timeout=5)
            self.loop.close()
            if self._old_home is None:
                os.environ.pop("MC_CLAUDE_HOME", None)
            else:
                os.environ["MC_CLAUDE_HOME"] = self._old_home
            if self._tmp:
                self._tmp.cleanup()
