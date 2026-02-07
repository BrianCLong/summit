from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Any, Iterable


@dataclass
class NodeStats:
    prior: float
    visits: int = 0
    total_value: float = 0.0

    @property
    def q_value(self) -> float:
        if self.visits == 0:
            return 0.0
        return self.total_value / self.visits

    def score(self, parent_visits: int, c_puct: float) -> float:
        return self.q_value + c_puct * self.prior * sqrt(parent_visits) / (1 + self.visits)


def select_with_puct(
    candidates: Iterable[Any],
    stats: dict[Any, NodeStats],
    c_puct: float,
) -> Any:
    candidate_list = list(candidates)
    if not candidate_list:
        raise ValueError("PUCT selection requires at least one candidate")
    parent_visits = max(1, sum(stats[candidate].visits for candidate in candidate_list))

    best_candidate = None
    best_score = float("-inf")
    for candidate in sorted(candidate_list, key=_stable_key):
        node = stats[candidate]
        score = node.score(parent_visits, c_puct)
        if score > best_score:
            best_score = score
            best_candidate = candidate
    return best_candidate


def _stable_key(candidate: Any) -> str:
    return repr(candidate)
