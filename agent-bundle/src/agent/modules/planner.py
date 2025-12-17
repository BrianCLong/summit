from __future__ import annotations
from dataclasses import dataclass
from .interpreter import InterpretedRequest


@dataclass
class PlanStep:
    name: str
    description: str


@dataclass
class Plan:
    steps: list[PlanStep]


class Planner:
    def make_plan(self, interpreted: InterpretedRequest) -> Plan:
        steps = [
            PlanStep("architecture", "Design overall architecture and components."),
            PlanStep("implementation", "Generate core code and modules."),
            PlanStep("tests", "Create tests at multiple levels."),
            PlanStep("docs", "Write documentation."),
            PlanStep("infra", "Set up CI/CD and infra files."),
            PlanStep("pr", "Prepare PR description and metadata.")
        ]
        return Plan(steps=steps)
