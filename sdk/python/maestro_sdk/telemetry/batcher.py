from __future__ import annotations

from typing import List

from .types import ProcessedTelemetryEvent


class OfflineBatcher:
    def __init__(self, max_batch_size: int = 50) -> None:
        self._queue: List[ProcessedTelemetryEvent] = []
        self._max_batch_size = max_batch_size

    def enqueue(self, event: ProcessedTelemetryEvent) -> int:
        self._queue.append(event)
        return len(self._queue)

    def should_flush(self) -> bool:
        return len(self._queue) >= self._max_batch_size

    def flush(self) -> List[ProcessedTelemetryEvent]:
        snapshot = list(self._queue)
        self._queue.clear()
        return snapshot

    def size(self) -> int:
        return len(self._queue)
