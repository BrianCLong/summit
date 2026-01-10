from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Sequence

from .counterfactual import CounterfactualVariant


@dataclass(slots=True)
class DivergenceScore:
    base_request_id: str
    variant_id: str
    divergence: float
    mutation: str | None = None
    mutated_segment_id: str | None = None


@dataclass(slots=True)
class PoisoningIndicator(DivergenceScore):
    mutated_segment_id: str | None = None


class DivergenceAnalyzer:
    def __init__(self, threshold: float = 0.5):
        self.threshold = threshold

    def score(
        self, base_request_id: str, variants: List[tuple[CounterfactualVariant, float]]
    ) -> List[DivergenceScore]:
        return [
            DivergenceScore(
                base_request_id=base_request_id,
                variant_id=variant.id,
                divergence=divergence,
                mutation=variant.mutation,
                mutated_segment_id=variant.mutated_segment_id,
            )
            for variant, divergence in variants
        ]

    def score_from_responses(
        self,
        base_response_id: str,
        base_output: Any,
        responses: Sequence[tuple[CounterfactualVariant, Any]],
    ) -> List[DivergenceScore]:
        return [
            DivergenceScore(
                base_request_id=base_response_id,
                variant_id=variant.id,
                divergence=self.compute_divergence(base_output, output),
                mutation=variant.mutation,
                mutated_segment_id=variant.mutated_segment_id,
            )
            for variant, output in responses
        ]

    def detect_poisoning(
        self, scores: List[DivergenceScore], variants: List[CounterfactualVariant]
    ) -> List[PoisoningIndicator]:
        variants_by_id = {variant.id: variant for variant in variants}
        return [
            PoisoningIndicator(
                base_request_id=score.base_request_id,
                variant_id=score.variant_id,
                divergence=score.divergence,
                mutated_segment_id=variants_by_id.get(score.variant_id, None).mutated_segment_id
                if variants_by_id.get(score.variant_id, None)
                else None,
            )
            for score in scores
            if score.divergence >= self.threshold
        ]

    def compute_divergence(self, base_output: Any, variant_output: Any) -> float:
        if isinstance(base_output, (int, float)) and isinstance(variant_output, (int, float)):
            denom = max(1.0, abs(base_output), abs(variant_output))
            return abs(base_output - variant_output) / denom
        if isinstance(base_output, str) and isinstance(variant_output, str):
            return 0.0 if base_output == variant_output else 1.0
        return 0.0 if _stable_stringify(base_output) == _stable_stringify(variant_output) else 1.0


def _stable_stringify(value: Any) -> str:
    if value is None or isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return "[" + ",".join(_stable_stringify(item) for item in value) + "]"
    if isinstance(value, dict):
        items = sorted((str(key), _stable_stringify(val)) for key, val in value.items())
        return "{" + ",".join(f"{key}:{val}" for key, val in items) + "}"
    return str(value)
