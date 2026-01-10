from __future__ import annotations

from dataclasses import dataclass
from typing import List

from .counterfactual import CounterfactualVariant
from .types import ModelExecutionResponse


@dataclass
class DivergenceScore:
    base_request_id: str
    variant_id: str
    modification: str
    divergence: float


@dataclass
class PoisoningIndicator:
    segment_id: str
    modification: str
    divergence: float


class DivergenceAnalyzer:
    def __init__(self, threshold: float = 0.25) -> None:
        self.threshold = threshold

    def score_responses(
        self,
        base: ModelExecutionResponse,
        variants: dict[str, ModelExecutionResponse],
        variant_meta: List[CounterfactualVariant],
    ) -> List[DivergenceScore]:
        scores: List[DivergenceScore] = []
        base_text = str(base.output or "")

        for variant in variant_meta:
            response = variants.get(variant.id)
            if not response:
                continue
            divergence = self._compute_divergence(
                base_text, str(response.output or "")
            )
            scores.append(
                DivergenceScore(
                    base_request_id=base.request_id,
                    variant_id=variant.id,
                    modification=variant.modification,
                    divergence=divergence,
                )
            )

        return scores

    def detect_poisoning(
        self, scores: List[DivergenceScore]
    ) -> List[PoisoningIndicator]:
        return [
            PoisoningIndicator(
                segment_id=self._extract_segment_id(score.modification),
                modification=score.modification,
                divergence=score.divergence,
            )
            for score in scores
            if score.divergence >= self.threshold
        ]

    def _compute_divergence(self, base: str, candidate: str) -> float:
        if not base and not candidate:
            return 0.0
        overlap = self._longest_common_subsequence(base, candidate)
        max_length = max(len(base), len(candidate))
        return 1 - overlap / max_length

    def _longest_common_subsequence(self, a: str, b: str) -> int:
        dp = [[0 for _ in range(len(b) + 1)] for _ in range(len(a) + 1)]
        for i in range(1, len(a) + 1):
            for j in range(1, len(b) + 1):
                if a[i - 1] == b[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        return dp[-1][-1]

    def _extract_segment_id(self, modification: str) -> str:
        parts = modification.split(":")
        return parts[1] if len(parts) > 1 else "unknown"
