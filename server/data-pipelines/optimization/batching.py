"""Adaptive batching strategies for throughput-optimized database operations."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Iterable, Iterator, List, Sequence


@dataclass(frozen=True)
class BatchPlan:
    """Metadata describing a batch execution decision."""

    size: int
    expected_latency_ms: float
    throughput_per_second: float


class AdaptiveBatcher:
    """Plan intelligent batches for database operations based on live telemetry."""

    def __init__(
        self,
        *,
        min_batch_size: int = 25,
        max_batch_size: int = 500,
        latency_slo_ms: float = 250.0,
    ) -> None:
        if min_batch_size <= 0 or max_batch_size <= 0:
            raise ValueError("Batch sizes must be positive")
        if min_batch_size > max_batch_size:
            raise ValueError("min_batch_size cannot exceed max_batch_size")
        self._min_batch_size = min_batch_size
        self._max_batch_size = max_batch_size
        self._latency_slo_ms = latency_slo_ms
        self._latency_history: List[float] = []
        self._size_history: List[int] = []

    @property
    def latency_history(self) -> Sequence[float]:
        return tuple(self._latency_history)

    @property
    def size_history(self) -> Sequence[int]:
        return tuple(self._size_history)

    def suggest_batch_plan(self, pending_records: int) -> BatchPlan:
        """Return the batch size and expected performance for the next execution."""

        if pending_records <= 0:
            raise ValueError("pending_records must be positive")

        if not self._latency_history:
            size = min(max(self._min_batch_size, pending_records), self._max_batch_size)
            latency = min(self._latency_slo_ms, size * 1.2)
        else:
            avg_latency = mean(self._latency_history)
            avg_size = mean(self._size_history)
            slope = avg_latency / max(avg_size, 1)
            proposed_size = self._latency_slo_ms / max(slope, 0.1)
            size = int(min(max(proposed_size, self._min_batch_size), self._max_batch_size))
            size = min(size, pending_records)
            latency = slope * size
            # Penalize if history suggested we were close to SLO
            if avg_latency > self._latency_slo_ms * 0.9:
                latency *= 0.9
                size = max(int(size * 0.85), self._min_batch_size)
        throughput = (size / latency) * 1000 if latency else float("inf")
        plan = BatchPlan(size=size, expected_latency_ms=latency, throughput_per_second=throughput)
        return plan

    def record_batch_outcome(self, size: int, latency_ms: float) -> None:
        if size <= 0:
            raise ValueError("size must be positive")
        if latency_ms <= 0:
            raise ValueError("latency_ms must be positive")
        self._size_history.append(size)
        self._latency_history.append(latency_ms)
        if len(self._size_history) > 50:
            self._size_history.pop(0)
            self._latency_history.pop(0)

    def batch_iterable(self, records: Iterable[object], plan: BatchPlan) -> Iterator[List[object]]:
        """Yield records grouped according to the supplied plan."""

        batch: List[object] = []
        for record in records:
            batch.append(record)
            if len(batch) >= plan.size:
                yield batch
                batch = []
        if batch:
            yield batch
