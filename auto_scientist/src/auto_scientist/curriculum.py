from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from .graph import ExperimentGraph
from .schemas import Node


@dataclass
class StageConstraint:
    max_runs: Optional[int] = None
    required_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class CurriculumStage:
    name: str
    goals: List[str]
    constraints: StageConstraint
    description: str = ""


@dataclass
class Curriculum:
    stages: List[CurriculumStage]
    current_index: int = 0

    @property
    def current(self) -> CurriculumStage:
        return self.stages[self.current_index]

    def can_advance(self, graph: ExperimentGraph, eval_selector) -> bool:
        """
        `eval_selector(graph) -> List[Node]` returns eval nodes with metrics.
        """
        eval_nodes: List[Node] = eval_selector(graph)
        if not eval_nodes:
            return False

        # Simple policy: check required_metrics against best eval.
        best_metrics: Dict[str, float] = {}
        for node in eval_nodes:
            metrics = node.payload.get("metrics", {})
            for k, v in metrics.items():
                best_metrics[k] = max(best_metrics.get(k, float("-inf")), v)

        for metric, threshold in self.current.constraints.required_metrics.items():
            if best_metrics.get(metric, float("-inf")) < threshold:
                return False

        return True

    def advance_if_possible(self, graph: ExperimentGraph, eval_selector) -> bool:
        if self.current_index >= len(self.stages) - 1:
            return False
        if self.can_advance(graph, eval_selector):
            self.current_index += 1
            return True
        return False
