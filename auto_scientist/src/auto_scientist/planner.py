from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .graph import ExperimentGraph


@dataclass
class ProposedExperiment:
    description: str
    config: dict
    depends_on: list[str]


class Planner(Protocol):
    def propose_experiments(
        self,
        graph: ExperimentGraph,
        curriculum_stage: str,
        max_proposals: int = 3,
    ) -> list[ProposedExperiment]: ...
