import asyncio
import json
import subprocess
import sys
from typing import AsyncGenerator, List, Optional


class StdioNdjsonTransport:
    def __init__(self, argv: list[str]):
        self._argv = argv
        self._proc: Optional[asyncio.subprocess.Process] = None

    async def start(self):
        self._proc = await asyncio.create_subprocess_exec(
            *self._argv,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=None
        )

    async def send(self, obj: dict):
        if not self._proc or not self._proc.stdin:
            raise RuntimeError("Transport not started")
        line = (json.dumps(obj, separators=(",", ":")) + "\n").encode("utf-8")
        self._proc.stdin.write(line)
        await self._proc.stdin.drain()

    async def recv_lines(self) -> AsyncGenerator[dict, None]:
        if not self._proc or not self._proc.stdout:
            raise RuntimeError("Transport not started")
        while True:
            line = await self._proc.stdout.readline()
            if not line:
                break
            try:
                yield json.loads(line.decode("utf-8"))
            except json.JSONDecodeError:
                continue # Skip invalid lines or logs

    async def close(self):
        if self._proc:
            if self._proc.stdin:
                self._proc.stdin.close()
            try:
                self._proc.terminate()
                await self._proc.wait()
            except Exception:
                pass
