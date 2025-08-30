from __future__ import annotations

"""Bias and fairness auditing utilities for AI-generated intelligence outputs.

This module provides lightweight tools to measure fairness metrics, track
metric stability over time, collect analyst feedback, and generate simple
explanations for model decisions.  The goal is to enable continuous
validation of AI systems and to surface potential sources of bias.
"""

from statistics import mean
from typing import Any


class BiasAudit:
    """Compute simple fairness metrics on model outputs."""

    @staticmethod
    def detect_bias(
        predictions: list[dict[str, Any]],
        protected_key: str,
        outcome_key: str,
    ) -> dict[str, Any]:
        """Calculate demographic parity difference for a set of predictions.

        Args:
            predictions: List of prediction dictionaries containing protected
                attribute and outcome values.
            protected_key: Key in each prediction representing the protected
                attribute (e.g., ``"gender"``).
            outcome_key: Key representing the model outcome (1 for positive,
                0 for negative).

        Returns:
            Dictionary with demographic parity difference and per-group rates.
        """
        counts: dict[Any, int] = {}
        totals: dict[Any, int] = {}
        for pred in predictions:
            group = pred.get(protected_key)
            outcome = pred.get(outcome_key, 0)
            totals[group] = totals.get(group, 0) + 1
            counts[group] = counts.get(group, 0) + int(outcome)

        rates = {g: counts[g] / totals[g] for g in totals}
        values = list(rates.values())
        parity_diff = max(values) - min(values) if values else 0.0
        return {"demographic_parity_diff": parity_diff, "rates": rates}

    @staticmethod
    def continuous_validation(metric_history: list[float]) -> float:
        """Return the mean of fairness metrics over time."""
        return mean(metric_history) if metric_history else 0.0


class FeedbackLoop:
    """Simple in-memory store for analyst feedback."""

    def __init__(self) -> None:
        self._records: list[dict[str, Any]] = []

    def add_feedback(
        self, analyst_id: str, note: str, metadata: dict[str, Any] | None = None
    ) -> None:
        self._records.append({"analyst_id": analyst_id, "note": note, "metadata": metadata or {}})

    def get_feedback(self) -> list[dict[str, Any]]:
        return list(self._records)


def explain_decision(feature_importances: dict[str, float]) -> str:
    """Generate a human-readable explanation from feature importances."""
    if not feature_importances:
        return "No features provided."
    feature, importance = max(feature_importances.items(), key=lambda item: abs(item[1]))
    return f"Decision primarily influenced by {feature} " f"(importance {importance:.2f})."
