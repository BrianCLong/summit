from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class RunPlan:
    goal: str
    constraints: list[str]
    acceptance_criteria: list[str]
    risks: list[str]
    non_goals: list[str]
