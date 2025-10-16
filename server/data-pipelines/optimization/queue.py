"""Priority queue tuned for business critical pipeline workloads."""

from __future__ import annotations

import itertools
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from heapq import heappop, heappush

_CRITICALITY_TO_PRIORITY: dict[str, int] = {
    "blocker": 0,
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 4,
    "deferred": 5,
}


@dataclass(frozen=True)
class QueuedJob:
    name: str
    criticality: str
    payload: object
    priority_override: int | None = None


class PriorityJobQueue:
    """Priority queue where lower numeric priority is dequeued first."""

    def __init__(self) -> None:
        self._heap: list[tuple[int, int, QueuedJob]] = []
        self._counter = itertools.count()

    @staticmethod
    def _priority(job: QueuedJob) -> int:
        if job.priority_override is not None:
            return job.priority_override
        return _CRITICALITY_TO_PRIORITY.get(job.criticality.lower(), 3)

    def enqueue(self, job: QueuedJob) -> None:
        heappush(self._heap, (self._priority(job), next(self._counter), job))

    def dequeue(self) -> QueuedJob:
        if not self._heap:
            raise IndexError("Cannot dequeue from an empty queue")
        return heappop(self._heap)[-1]

    def drain(self) -> Iterator[QueuedJob]:
        while self._heap:
            yield self.dequeue()

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._heap)

    def __bool__(self) -> bool:  # pragma: no cover - trivial
        return bool(self._heap)

    def extend(self, jobs: Iterable[QueuedJob]) -> None:
        for job in jobs:
            self.enqueue(job)
