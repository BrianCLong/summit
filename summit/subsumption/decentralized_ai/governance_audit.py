"""Governance and distribution metrics for decentralized AI claims."""

from __future__ import annotations

import math


def shannon_entropy(distribution: list[float]) -> float:
    """Compute Shannon entropy over non-negative weights."""
    total = sum(distribution)
    if total <= 0:
        return 0.0
    normalized = [value / total for value in distribution if value > 0]
    return -sum(p * math.log2(p) for p in normalized)


def gini(values: list[float]) -> float:
    """Compute Gini coefficient for concentration risk."""
    if not values:
        return 0.0
    sorted_values = sorted(max(value, 0.0) for value in values)
    n = len(sorted_values)
    total = sum(sorted_values)
    if total == 0:
        return 0.0
    weighted = sum((index + 1) * value for index, value in enumerate(sorted_values))
    return (2 * weighted) / (n * total) - (n + 1) / n


def participation_rate(votes_cast: int, eligible_voters: int) -> float:
    """Compute governance participation as a bounded ratio."""
    if eligible_voters <= 0:
        return 0.0
    return max(0.0, min(1.0, votes_cast / eligible_voters))
