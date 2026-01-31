from __future__ import annotations

from .planner import MultilingualScalingPlanner, PlanRequest, PlanResponse


class BaselinePlanner(MultilingualScalingPlanner):
    """
    Baseline planner that returns identity recommendations and
    "insufficient data" rationales.
    """
    def plan(self, req: PlanRequest) -> PlanResponse:
        return PlanResponse(
            recommended_model_params=req.model_size_params or 0,
            recommended_total_tokens=req.token_budget,
            recommended_helpers=[],
            rationale={
                "message": "Baseline planner provides no scaling adjustments.",
                "status": "identity"
            },
            assumptions=[
                "Sufficient data available for all target languages",
                "No cross-lingual transfer effects modeled"
            ],
            provenance={
                "planner": "BaselinePlanner",
                "version": "1.0.0"
            },
            confidence=0.5
        )
