"""AutoML-style planner that proposes next experiments."""
from __future__ import annotations

import itertools
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence

from .core import Config, Experiment, Metrics, Recommendation
from .modeling import LinearModel, ScalingFit, _config_features


@dataclass
class CandidateScore:
    config: Config
    predicted: Metrics
    utility: float


def evaluate_candidate(
    config: Config,
    scaling_fit: Optional[ScalingFit],
    response_surface: Optional[LinearModel],
    objective: str,
) -> CandidateScore:
    """Predict metrics and compute utility for a candidate config."""

    predicted_metrics = Metrics()
    if scaling_fit:
        predicted_metrics.training_loss = scaling_fit.predict(config.parameters)

    if response_surface:
        predicted_value = response_surface.predict(_config_features(config))
        setattr(predicted_metrics, objective, predicted_value)

    objective_value = getattr(predicted_metrics, objective, None)
    utility = -objective_value if objective == "training_loss" else objective_value or 0.0
    return CandidateScore(config=config, predicted=predicted_metrics, utility=utility)


def _within_constraints(config: Config, constraints: Dict[str, float]) -> bool:
    max_params = constraints.get("max_params")
    max_context = constraints.get("max_context")
    if max_params is not None and config.parameters > max_params:
        return False
    if max_context is not None and (config.context_length or 0) > max_context:
        return False
    return True


def plan(
    base_configs: Sequence[Config],
    scaling_fit: Optional[ScalingFit],
    response_surface: Optional[LinearModel],
    objective: str,
    constraints: Optional[Dict[str, float]] = None,
) -> Recommendation:
    """Generate a recommendation from candidate configurations."""

    constraints = constraints or {}
    candidate_pool: List[Config] = []

    # Expand simple grid over context length and learning rate around provided configs
    context_lengths = [4_096, 8_192, 16_384]
    lr_multipliers = [0.5, 1.0, 1.5]

    for base in base_configs:
        for ctx, lr_scale in itertools.product(context_lengths, lr_multipliers):
            candidate = Config(
                model_family=base.model_family,
                parameters=base.parameters,
                depth=base.depth,
                width=base.width,
                context_length=ctx,
                moe=base.moe,
                data_mix=base.data_mix,
                learning_rate=(base.learning_rate or 1e-4) * lr_scale,
                lr_schedule=base.lr_schedule,
                curriculum=base.curriculum,
                runtime=base.runtime,
            )
            if _within_constraints(candidate, constraints):
                candidate_pool.append(candidate)

    if not candidate_pool:
        raise ValueError("No candidates satisfy constraints")

    scored = [evaluate_candidate(c, scaling_fit, response_surface, objective) for c in candidate_pool]
    scored.sort(key=lambda c: c.utility, reverse=True)
    top = scored[0]

    rationale = (
        f"Selected {top.config.model_family} with {top.config.parameters:.2e} params; "
        f"predicted {objective}={getattr(top.predicted, objective, None):.3f}"
    )

    return Recommendation(
        config=top.config,
        predicted_metrics=top.predicted,
        expected_utility=top.utility,
        rationale=rationale,
        constraints=constraints,
        candidate_pool=[c.config for c in scored[:5]],
    )
