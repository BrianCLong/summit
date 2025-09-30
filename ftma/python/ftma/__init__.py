"""Python helpers for the Federated T-Secure Metrics Aggregator."""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from typing import Iterable, List, Sequence

ftma_core = importlib.import_module("ftma_core")


@dataclass(frozen=True)
class AggregationResult:
    """Typed wrapper around the C++ aggregation result."""

    sum: List[float]
    mean: List[float]
    variance: List[float]
    participants: int
    survivors: int
    threshold: int


class Coordinator:
    """High-level coordinator orchestrating FTMA sessions."""

    def __init__(self, num_clients: int, threshold: int, metric_dimension: int, scale: int = 1_000_000) -> None:
        if threshold <= 0 or threshold > num_clients:
            raise ValueError("threshold must be within (0, num_clients]")
        self._core = ftma_core.FtmaCoordinator(num_clients, threshold, metric_dimension, scale)
        self._num_clients = num_clients
        self._dimension = metric_dimension
        self._scale = scale

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def scale(self) -> int:
        return self._scale

    def register_client(self, client_id: int, metrics: Sequence[float]) -> List[int]:
        if len(metrics) != self._dimension:
            raise ValueError("metrics dimension mismatch")
        masked = self._core.register_client(client_id, list(metrics))
        return [int(value) for value in masked]

    def finalize(self, active_clients: Iterable[int]) -> AggregationResult:
        active_list = list(active_clients)
        core_result = self._core.finalize(active_list)
        return AggregationResult(
            sum=list(core_result.sum),
            mean=list(core_result.mean),
            variance=list(core_result.variance),
            participants=core_result.participants,
            survivors=core_result.survivors,
            threshold=core_result.threshold,
        )


__all__ = ["AggregationResult", "Coordinator"]
