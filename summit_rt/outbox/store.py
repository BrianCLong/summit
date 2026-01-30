from __future__ import annotations
from typing import Iterable, Protocol
from summit_rt.events.envelope import EventEnvelope

class OutboxStore(Protocol):
    def append(self, event: EventEnvelope) -> None: ...
    def iter_pending(self, limit: int = 100) -> Iterable[EventEnvelope]: ...
    def mark_done(self, event_id: str, stage: str) -> None: ...

# TODO: implement backed by your existing DB, Redis, or a file log.
# Keep v1 simple: file-based append + done markers.
