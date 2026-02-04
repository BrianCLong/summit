from __future__ import annotations

import summit.flags

from ..baseline import BaselinePlanner
from ..planner import MultilingualScalingPlanner, PlanRequest, PlanResponse
from .decision import get_pretrain_vs_finetune_decision
from .heuristics import scale_for_language_count


class AtlasPlanner(MultilingualScalingPlanner):
    """
    Multilingual scaling planner implementing ATLAS-derived heuristics.
    Gated by ATLAS_PLANNER_ENABLED flag.
    """
    def __init__(self):
        self.baseline = BaselinePlanner()

    def plan(self, req: PlanRequest) -> PlanResponse:
        if not summit.flags.ATLAS_PLANNER_ENABLED:
            return self.baseline.plan(req)

        # Apply ATLAS heuristics
        # Assuming we are expanding from a baseline of 1 language if not specified?
        # Or maybe we use the current K (training_languages) vs target?
        # The request has training_languages (List[str]).

        # If we have model_size_params, we apply multipliers.
        # Guidance: Doubling K (K -> 2K) -> 1.18x N, 1.66x D

        # We need a reference K. Let's assume K=1 as reference for now if not otherwise known.
        # Or better: the request should imply a 'scaling' from some known baseline.
        # For simplicity, we'll assume the req.training_languages is the 'new' K
        # and we are comparing it to a baseline of 1.

        k_new = len(req.training_languages)
        k_base = 1 # Default reference

        scaling = scale_for_language_count(k_base, k_new)

        recommended_n = int((req.model_size_params or 0) * scaling.model_mult)
        recommended_d = int(req.token_budget * scaling.data_mult)

        decision = get_pretrain_vs_finetune_decision(
            recommended_n,
            req.target_language,
            recommended_d
        )

        return PlanResponse(
            recommended_model_params=recommended_n,
            recommended_total_tokens=recommended_d,
            recommended_helpers=[],
            rationale={
                "message": f"Applied ATLAS scaling for K={k_new} languages.",
                "model_mult": f"{scaling.model_mult:.2f}x",
                "data_mult": f"{scaling.data_mult:.2f}x",
                "strategy_recommendation": decision.strategy,
                "strategy_rationale": decision.rationale
            },
            assumptions=[
                "Scaling laws hold for the given parameter range",
                "Language mixture matches ATLAS training distribution",
                f"Crossover threshold for strategy is {decision.threshold_tokens} tokens"
            ],
            provenance={
                "planner": "AtlasPlanner",
                "version": "1.0.0",
                "source": "Google DeepMind ATLAS scaling laws (2026)"
            },
            confidence=0.8
        )
