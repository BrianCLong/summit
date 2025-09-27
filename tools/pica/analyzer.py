"""High level orchestration for the Policy Impact Causal Analyzer (PICA)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, Sequence

from . import estimators
from .data import (
    ConfidenceInterval,
    ImpactBrief,
    ImpactEstimate,
    KPIObservation,
    PICAOptions,
    RolloutManifest,
    SensitivityResult,
)

_Z_ALPHA_DEFAULT = 1.959963984540054


@dataclass
class MetricAnalysis:
    metric: str
    estimates: Sequence[ImpactEstimate]


class PICAAnalyzer:
    """Coordinates estimator execution and reporting."""

    def __init__(self, options: PICAOptions | None = None) -> None:
        self.options = options or PICAOptions()

    def analyze(
        self,
        manifest: RolloutManifest,
        observations: Iterable[KPIObservation],
        metrics: Sequence[str],
        governance_notes: Mapping[str, float] | None = None,
    ) -> ImpactBrief:
        buffered = list(observations)
        estimates: list[ImpactEstimate] = []
        governance_notes = governance_notes or {}

        for metric in metrics:
            metric_estimates = self._analyze_metric(metric, buffered)
            estimates.extend(metric_estimates)

        return ImpactBrief(
            manifest=manifest,
            estimates=estimates,
            governance_notes=governance_notes,
        )

    def _analyze_metric(self, metric: str, observations: Sequence[KPIObservation]) -> Sequence[ImpactEstimate]:
        z_score = _Z_ALPHA_DEFAULT
        results = {
            "Difference-in-Differences": estimators.difference_in_differences(observations, metric),
            "Synthetic Control": estimators.synthetic_control(observations, metric),
            "CUPED": estimators.cuped(observations, metric),
        }

        impact_estimates: list[ImpactEstimate] = []
        for method, result in results.items():
            base_interval = result.interval(z_score)
            sensitivity: list[SensitivityResult] = []
            for name, multiplier in self.options.sensitivity_multipliers.items():
                adjusted = ConfidenceInterval(
                    lower=result.estimate - (z_score * result.standard_error * multiplier),
                    upper=result.estimate + (z_score * result.standard_error * multiplier),
                )
                sensitivity.append(
                    SensitivityResult(name=name, interval=adjusted, multiplier=multiplier)
                )

            impact_estimates.append(
                ImpactEstimate(
                    method=method,
                    metric=metric,
                    estimate=result.estimate,
                    interval=base_interval,
                    details=result.details,
                    sensitivity=sensitivity,
                )
            )

        return impact_estimates


__all__ = ["PICAAnalyzer", "MetricAnalysis"]
