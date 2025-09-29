import asyncio
import time
from typing import Any, Dict

import socketio
from prometheus_client import Counter

# Socket.IO server for real-time collaboration
sio = socketio.AsyncServer(async_mode="asgi")
app = socketio.ASGIApp(sio)

# Prometheus counter for broadcast events
broadcast_events_total = Counter(
    "graph_broadcast_events_total", "Graph broadcast events"
)

_emit_lock = asyncio.Lock()
_last_emit = 0.0
_DEBOUNCE_WINDOW = 0.1  # seconds


async def emit_change(action: str, payload: Dict[str, Any], user: str) -> None:
    """Broadcast a graph change to all clients with metadata.

    A small debounce window is used to avoid spamming the network when many
    changes occur in rapid succession.
    """
    global _last_emit
    async with _emit_lock:
        now = time.time()
        delta = now - _last_emit
        if delta < _DEBOUNCE_WINDOW:
            await asyncio.sleep(_DEBOUNCE_WINDOW - delta)
        _last_emit = time.time()
    message = {
        "user": user,
        "timestamp": _last_emit,
        "action": action,
        "data": payload,
    }
    broadcast_events_total.inc()
    await sio.emit("graph_change", message)


@sio.event
async def connect(sid, environ):  # pragma: no cover - simple connection log
    await sio.emit("connected", {"sid": sid})
