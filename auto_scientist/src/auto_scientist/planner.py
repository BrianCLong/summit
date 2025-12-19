from __future__ import annotations
from dataclasses import dataclass
from typing import List, Protocol
from .graph import ExperimentGraph
from .schemas import Node


@dataclass
class ProposedExperiment:
    description: str
    config: dict
    depends_on: List[str]


class Planner(Protocol):
    def propose_experiments(
        self,
        graph: ExperimentGraph,
        curriculum_stage: str,
        max_proposals: int = 3,
    ) -> List[ProposedExperiment]:
        ...
