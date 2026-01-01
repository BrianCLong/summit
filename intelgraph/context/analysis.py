from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .counterfactual import CounterfactualVariant


@dataclass(slots=True)
class DivergenceScore:
    base_request_id: str
    variant_id: str
    divergence: float


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
            DivergenceScore(base_request_id=base_request_id, variant_id=variant.id, divergence=divergence)
            for variant, divergence in variants
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
