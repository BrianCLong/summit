from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class RunPlan:
    goal: str
    constraints: List[str]
    acceptance_criteria: List[str]
    risks: List[str]
    non_goals: List[str]
