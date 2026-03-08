from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class InstanceCandidate:
    """Input candidate used by flex node selection."""

    provider: str
    instance_type: str
    family: str
    vcpu: int
    memory_gib: float
    hourly_cost_usd: float
    availability_score: float
    performance_score: float


def normalize_cost(cost: float, max_cost: float) -> float:
    """Convert cost to a [0,1] preference score where lower cost is better."""

    if max_cost <= 0:
        return 1.0
    bounded = max(0.0, min(cost / max_cost, 1.0))
    return 1.0 - bounded
