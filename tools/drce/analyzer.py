"""Attribution engine for the Drift Root-Cause Explorer."""

from __future__ import annotations

import math
from typing import Iterable, List, Sequence

from .models import (
    AttributionResult,
    CandidateEvidence,
    CounterfactualAction,
    CounterfactualResult,
    normalise_scores,
)
from .scenario import DriftScenario


class DriftRootCauseExplorer:
    """Runs attribution and counterfactual simulations for drift analysis."""

    def __init__(self, confidence_floor: float = 0.05) -> None:
        self._confidence_floor = confidence_floor

    def rank_attributions(self, scenario: DriftScenario) -> Sequence[AttributionResult]:
        """Produce ranked attributions for the supplied scenario."""

        raw_results: List[AttributionResult] = []
        for evidence in scenario.candidates():
            contribution = evidence.drift_magnitude()
            score = contribution
            interval = self._confidence_interval(evidence, score)
            raw_results.append(
                AttributionResult(
                    name=evidence.name,
                    type=evidence.type,
                    score=score,
                    confidence_interval=interval,
                    supporting_metrics=dict(evidence.metadata),
                )
            )

        raw_results.sort(key=lambda result: result.score, reverse=True)
        return normalise_scores(raw_results)

    def _confidence_interval(
        self, evidence: CandidateEvidence, score: float
    ) -> tuple[float, float]:
        strength = min(1.0, math.sqrt(evidence.sample_size) / 50.0)
        radius = max(self._confidence_floor, (1 - strength) * score * 0.25)
        lower = max(0.0, score - radius)
        upper = score + radius
        return (lower, upper)

    def run_counterfactual(
        self, scenario: DriftScenario, candidate_name: str, action: CounterfactualAction
    ) -> CounterfactualResult:
        return scenario.apply_counterfactual(candidate_name, action)

    def analyse_with_counterfactuals(
        self,
        scenario: DriftScenario,
        counterfactual_candidates: Iterable[str] | None = None,
    ) -> tuple[Sequence[AttributionResult], List[CounterfactualResult]]:
        """Return ranked attributions and optional counterfactual simulations."""

        attributions = self.rank_attributions(scenario)
        if counterfactual_candidates is None:
            counterfactual_candidates = [r.name for r in attributions[:3]]

        results: List[CounterfactualResult] = []
        for candidate in counterfactual_candidates:
            action = CounterfactualAction(description=f"Revert {candidate} to baseline")
            results.append(self.run_counterfactual(scenario, candidate, action))
        return attributions, results

    def explain_top_k(self, scenario: DriftScenario, k: int = 3) -> Sequence[str]:
        """Return human-readable summaries for the top-k candidates."""

        attributions = self.rank_attributions(scenario)
        summaries: List[str] = []
        for attribution in attributions[:k]:
            ci_low, ci_high = attribution.confidence_interval
            metadata = ", ".join(
                f"{key.split(':')[-1]}={value:.3f}" for key, value in attribution.supporting_metrics.items()
            )
            summaries.append(
                (
                    f"{attribution.name} ({attribution.type.value}) score={attribution.score:.3f} "
                    f"CI[{ci_low:.3f}, {ci_high:.3f}]"
                    + (f" metrics: {metadata}" if metadata else "")
                )
            )
        return summaries
