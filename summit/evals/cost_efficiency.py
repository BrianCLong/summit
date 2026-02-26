from __future__ import annotations

from typing import Dict


def calculate_cost_efficiency_score(accuracy: float, cost_per_1k_tokens: float) -> float:
    """
    Calculates the cost-efficiency score for a model.
    Higher is better.

    Formula: accuracy / (cost_per_1k_tokens + epsilon)
    """
    epsilon = 1e-9 # Prevent division by zero
    return accuracy / (cost_per_1k_tokens + epsilon)


def compare_models_efficiency(model_a_metrics: dict[str, float], model_b_metrics: dict[str, float]) -> dict[str, float]:
    """
    Compares the cost-efficiency of two models.
    """
    score_a = calculate_cost_efficiency_score(
        model_a_metrics.get("accuracy", 0.0),
        model_a_metrics.get("cost_per_1k_tokens", 1.0)
    )
    score_b = calculate_cost_efficiency_score(
        model_b_metrics.get("accuracy", 0.0),
        model_b_metrics.get("cost_per_1k_tokens", 1.0)
    )

    return {
        "model_a_score": score_a,
        "model_b_score": score_b,
        "improvement_factor": score_b / (score_a + 1e-9)
    }
