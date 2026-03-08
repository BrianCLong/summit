from __future__ import annotations

from agents.preflight.plan_types import AgentPlan


class PlanValidationError(ValueError):
    """Raised when the preflight plan is missing required fields."""


def validate_plan(plan: AgentPlan) -> AgentPlan:
    if not plan.goal.strip():
        raise PlanValidationError("goal must exist")
    if len(plan.acceptance_criteria) < 1:
        raise PlanValidationError("acceptance criteria must contain at least one item")
    if any(not criterion.strip() for criterion in plan.acceptance_criteria):
        raise PlanValidationError("acceptance criteria must not include blank values")
    return plan
