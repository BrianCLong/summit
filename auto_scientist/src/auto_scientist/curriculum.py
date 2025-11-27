# src/auto_scientist/curriculum.py
from __future__ import annotations
import yaml
from pathlib import Path
from typing import List, Dict

from pydantic import BaseModel, Field

from .graph import ExperimentGraph
from .schemas import Node, NodeType

class CurriculumError(Exception):
    """Base exception for curriculum errors."""

class StageConstraint(BaseModel):
    """Defines the constraints for a curriculum stage."""
    max_runs: int | None = None
    required_metrics: Dict[str, float] = Field(default_factory=dict)

class CurriculumStage(BaseModel):
    """Defines a single stage of the research curriculum."""
    name: str
    description: str
    goals: List[str]
    constraints: StageConstraint

class Curriculum(BaseModel):
    """Represents the entire research curriculum, composed of multiple stages."""
    stages: List[CurriculumStage]
    current_stage_index: int = 0

    @property
    def current(self) -> CurriculumStage:
        return self.stages[self.current_stage_index]

    @property
    def is_complete(self) -> bool:
        return self.current_stage_index >= len(self.stages) - 1

    @classmethod
    def from_yaml(cls, path: Path) -> Curriculum:
        """Load a curriculum from a YAML file."""
        try:
            with path.open("r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            return cls.model_validate(data)
        except Exception as e:
            raise CurriculumError(f"Failed to load or parse curriculum from '{path}': {e}")

    def can_advance(self, graph: ExperimentGraph) -> bool:
        """
        Checks if the current stage's goals have been met based on graph state.
        """
        eval_nodes: List[Node] = [
            n for n in graph.nodes_by_type(NodeType.EVAL)
            if n.stage == self.current.name
        ]

        # Check max_runs constraint
        if self.current.constraints.max_runs and len(eval_nodes) >= self.current.constraints.max_runs:
            # For simplicity, we advance if max_runs is hit, even if metrics aren't met.
            # A more complex policy could be implemented here.
            return True

        # Check required_metrics against the best evaluation in the current stage
        best_metrics: Dict[str, float] = {}
        for node in eval_nodes:
            metrics = node.payload.get("metrics", {})
            for k, v in metrics.items():
                best_metrics[k] = max(best_metrics.get(k, float("-inf")), v)

        for metric, threshold in self.current.constraints.required_metrics.items():
            if best_metrics.get(metric, float("-inf")) < threshold:
                return False

        return True

    def advance(self) -> bool:
        """Advances the curriculum to the next stage if not complete."""
        if not self.is_complete:
            self.current_stage_index += 1
            return True
        return False
