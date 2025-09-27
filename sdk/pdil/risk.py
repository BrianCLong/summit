"""Risk scoring utilities."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Iterable

from .models import PromptDiffOutcome, RiskAssessment


@dataclass
class RiskAssessor:
    """Computes risk metrics for prompt diffs."""

    coverage_weight: float = 5.0

    def assess(self, outcomes: Iterable[PromptDiffOutcome]) -> RiskAssessment:
        outcomes = list(outcomes)
        taxonomy_counts = Counter()
        total_risk = 0.0
        coverage_delta = 0.0
        regressions = []
        for outcome in outcomes:
            coverage_delta += outcome.coverage_delta
            if outcome.candidate.passed:
                continue
            taxonomy = outcome.candidate.taxonomy or "unknown"
            taxonomy_counts[taxonomy] += 1
            severity = outcome.case.severity_for(taxonomy)
            weighted = severity * outcome.case.business_impact
            if outcome.regression_detected:
                weighted *= 1.5
                regressions.append(outcome)
            total_risk += weighted
        normalized_coverage = coverage_delta / max(len(outcomes), 1)
        total_risk += self.coverage_weight * max(0.0, -normalized_coverage)
        return RiskAssessment(
            total_risk=round(total_risk, 4),
            coverage_delta=round(normalized_coverage, 4),
            taxonomy_counts=dict(taxonomy_counts),
            regressions=regressions,
        )
