"""Explainability helpers for IG-RL decisions."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(slots=True)
class Explanation:
    decision_id: str
    rationale: str
    counterfactual: str
    features: dict[str, float]


class Explainer:
    """Generates human-readable artifacts for RL decisions."""

    def __init__(self, feature_names: Sequence[str]) -> None:
        self._feature_names = list(feature_names)

    def explain(
        self, state_vector, action: str, reward_components: dict[str, float]
    ) -> Explanation:
        ranked = sorted(reward_components.items(), key=lambda item: abs(item[1]), reverse=True)
        rationale = ", ".join(f"{name} contributed {value:.2f}" for name, value in ranked[:3])
        counterfactual = (
            f"If {self._feature_names[0]} decreased, policy might prefer a different action."
        )
        features = {
            name: float(state_vector[idx]) if idx < len(state_vector) else 0.0
            for idx, name in enumerate(self._feature_names)
        }
        return Explanation(
            decision_id="pending",
            rationale=rationale or "No dominant reward contributors",
            counterfactual=counterfactual,
            features=features,
        )
