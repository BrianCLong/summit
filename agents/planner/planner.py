from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from agents.planner.schema import EngineeringPlan


class DeterministicPlanner:
    """Produces stable planning artifacts for CI-verifiable agent runs."""

    def create_plan(
        self,
        goal: str,
        constraints: list[str],
        acceptance_criteria: list[str],
        risks: list[str],
    ) -> EngineeringPlan:
        return EngineeringPlan(
            goal=goal,
            constraints=sorted(constraints),
            acceptance_criteria=sorted(acceptance_criteria),
            risks=sorted(risks),
        )

    def write_artifact(self, plan: EngineeringPlan, output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(asdict(plan), indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
