from __future__ import annotations

from typing import Iterable

from .policy_engine import PolicyDecision


def automation_allow_rate(decisions: Iterable[PolicyDecision]) -> float:
    items = list(decisions)
    if not items:
        return 0.0
    allows = sum(1 for decision in items if decision.decision == "allow")
    return round(allows / len(items), 4)
