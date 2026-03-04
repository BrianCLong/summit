from __future__ import annotations

from agents.preflight.plan_types import AgentPlan


def plan_from_questionnaire(responses: dict[str, object]) -> AgentPlan:
    """Build a deterministic plan from preflight questionnaire responses."""
    return AgentPlan(
        goal=str(responses.get("goal", "")).strip(),
        constraints=[str(item).strip() for item in responses.get("constraints", [])],
        acceptance_criteria=[
            str(item).strip() for item in responses.get("acceptance_criteria", [])
        ],
        risks=[str(item).strip() for item in responses.get("risks", [])],
    )
