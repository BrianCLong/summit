from __future__ import annotations

from typing import Iterable


def compute_allow_rate(decisions: Iterable[str]) -> float:
    decision_list = list(decisions)
    if not decision_list:
        return 0.0
    allow_count = sum(1 for item in decision_list if item == 'ALLOW')
    return allow_count / len(decision_list)
