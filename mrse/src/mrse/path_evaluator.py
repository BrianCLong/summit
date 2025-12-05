from __future__ import annotations

from typing import Iterable, List, Optional

from .reality_graph import RealityGraph
from .world_state import WorldState


class PathEvaluator:
    """Scores full trajectories to surface optimal futures."""

    def __init__(self) -> None:
        self.alignment_weight = 1.0
        self.safety_weight = 1.0
        self.stability_weight = 1.0
        self.velocity_weight = 1.0
        self.risk_weight = 1.0

    def score_state(self, state: WorldState) -> float:
        alignment = self.alignment_weight * len(state.intents)
        safety = self.safety_weight * (1.0 - state.safety.get("risk", 0.0))
        stability = self.stability_weight * max(0.0, 1.0 - 0.01 * len(state.diffs))
        velocity = self.velocity_weight * (0.1 * len(state.tasks))
        risk = self.risk_weight * (0.2 * len(state.risks))
        return alignment + safety + stability + velocity - risk

    def score_path(self, path: Iterable[WorldState]) -> float:
        return sum(self.score_state(state) for state in path)

    def best_path(self, graph: RealityGraph, root_id: str) -> Optional[List[WorldState]]:
        paths = graph.paths_from(root_id)
        if not paths:
            return None
        scored = [(self.score_path(path), path) for path in paths]
        scored.sort(key=lambda item: item[0], reverse=True)
        best_score, best_path = scored[0]
        best_path[-1].apply_score(best_score)
        return best_path
