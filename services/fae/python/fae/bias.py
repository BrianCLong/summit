"""Bias and health checks for aggregated experiments."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Mapping

from .aggregates import CohortKey, SecureAggregatedMetrics


@dataclass
class BiasSignal:
    name: str
    value: float
    threshold: float
    passes: bool


def _sample_ratio_test(control_n: int, treatment_n: int) -> BiasSignal:
    total = control_n + treatment_n
    if total == 0:
        return BiasSignal("sample_ratio", 0.0, 3.0, True)
    expected = total / 2
    z = (control_n - expected) / math.sqrt(total / 4)
    return BiasSignal("sample_ratio", abs(z), 3.0, abs(z) <= 3.0)


def _covariate_shift(metric: SecureAggregatedMetrics) -> BiasSignal:
    control_mean = metric.control.mean_x
    treatment_mean = metric.treatment.mean_x
    diff = treatment_mean - control_mean
    return BiasSignal("covariate_shift", diff, 0.1, abs(diff) <= 0.1)


def run_bias_checks(metrics: Mapping[CohortKey, SecureAggregatedMetrics]):
    results = {}
    for cohort, metric in metrics.items():
        signals = [
            _sample_ratio_test(metric.control.n, metric.treatment.n),
            _covariate_shift(metric),
        ]
        results[cohort] = signals
    return results

