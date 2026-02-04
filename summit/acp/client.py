import asyncio
import uuid
from typing import Any, Callable, Dict, Optional

from .transport_stdio import StdioNdjsonTransport


class AcpClient:
    def __init__(self, transport: StdioNdjsonTransport):
        self._transport = transport
        self._pending_requests: dict[str, asyncio.Future] = {}
        self._notification_handler: Optional[Callable[[dict], Any]] = None
        self._listen_task: Optional[asyncio.Task] = None

    async def start(self):
        await self._transport.start()
        self._listen_task = asyncio.create_task(self._listen())
        # Initialize handshake could go here if ACP requires it immediately

    def set_notification_handler(self, handler: Callable[[dict], Any]):
        self._notification_handler = handler

    async def _listen(self):
        async for msg in self._transport.recv_lines():
            # Basic JSON-RPC 2.0 handling
            if "id" in msg and msg["id"] in self._pending_requests:
                # Response to a request
                fut = self._pending_requests.pop(msg["id"])
                if "error" in msg:
                    fut.set_exception(RuntimeError(msg["error"]))
                else:
                    fut.set_result(msg.get("result"))
            else:
                # Notification or request from server
                if self._notification_handler:
                    try:
                        res = self._notification_handler(msg)
                        if asyncio.iscoroutine(res):
                            await res
                    except Exception:
                        pass # TODO: log error

    async def send_request(self, method: str, params: Optional[dict] = None) -> Any:
        req_id = str(uuid.uuid4())
        req = {"jsonrpc": "2.0", "id": req_id, "method": method}
        if params is not None:
            req["params"] = params

        fut = asyncio.get_running_loop().create_future()
        self._pending_requests[req_id] = fut

        await self._transport.send(req)
        return await fut

    async def send_notification(self, method: str, params: Optional[dict] = None):
        req = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            req["params"] = params
        await self._transport.send(req)

    async def close(self):
        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        await self._transport.close()
