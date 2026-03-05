from __future__ import annotations

import os

from agents.preflight.plan_types import AgentPlan
from agents.preflight.validator import validate_plan


class PreflightRequiredError(RuntimeError):
    """Raised when preflight is required but no valid plan is provided."""


def is_preflight_enabled() -> bool:
    return os.getenv("SUMMIT_AGENT_PREFLIGHT", "0") == "1"


def enforce_preflight(plan: AgentPlan | None) -> AgentPlan | None:
    """Require a valid preflight plan when SUMMIT_AGENT_PREFLIGHT=1."""
    if not is_preflight_enabled():
        return plan

    if plan is None:
        raise PreflightRequiredError(
            "Agent execution blocked: SUMMIT_AGENT_PREFLIGHT=1 requires a valid plan"
        )

    return validate_plan(plan)
