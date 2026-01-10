from __future__ import annotations

from collections.abc import Iterable

import pandas as pd

from .models import (
    GraphEstimate,
    InterventionResult,
    PathContribution,
    enumerate_paths,
    topological_sort,
)


class DoCalculusSimulator:
    def __init__(self, graph: GraphEstimate, baseline: dict[str, float]) -> None:
        self.graph = graph
        self.baseline = baseline
        self._weights = graph.adjacency()

    def _propagate(self, interventions: dict[str, float]) -> dict[str, float]:
        projected: dict[str, float] = {**self.baseline}
        order = topological_sort(self.graph)
        for node in order:
            if node in interventions:
                projected[node] = interventions[node]
                continue
            parents = self._weights.get(node, {})
            value = self.baseline.get(node, 0.0)
            for parent, weight in parents.items():
                value += projected.get(parent, self.baseline.get(parent, 0.0)) * weight
            projected[node] = value
        return projected

    def intervene(
        self,
        sim_id: str,
        interventions: dict[str, float],
        target: str | None,
        confidence: float,
        top_k_paths: int,
    ) -> InterventionResult:
        projected = self._propagate(interventions)
        delta = {node: projected[node] - self.baseline.get(node, 0.0) for node in projected}
        contribution_paths: list[PathContribution] = []
        if target:
            contribution_paths = enumerate_paths(
                self.graph, sources=interventions.keys(), target=target, limit=top_k_paths
            )
        return InterventionResult(
            sim_id=sim_id,
            interventions=interventions,
            target=target,
            delta=delta,
            projected=projected,
            paths=contribution_paths,
            confidence=confidence,
        )


def compute_baseline(df: pd.DataFrame) -> dict[str, float]:
    return {col: float(df[col].mean()) for col in df.columns}


__all__: Iterable[str] = ["DoCalculusSimulator", "compute_baseline"]
