"""Estimator implementations for the Policy Impact Causal Analyzer (PICA).

The estimators prioritise clarity over asymptotic optimality—they are meant to
serve as reference implementations that can operate purely from rollout
telemetry without external dependencies besides NumPy.
"""
from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Mapping, Tuple

import numpy as np

from .data import ConfidenceInterval, KPIObservation, RolloutPhase

_Z_ALPHA_975 = 1.959963984540054  # 95% two-sided


@dataclass
class EstimatorResult:
    estimate: float
    standard_error: float
    details: Mapping[str, float]

    def interval(self, z_score: float = _Z_ALPHA_975) -> ConfidenceInterval:
        radius = z_score * self.standard_error
        return ConfidenceInterval(self.estimate - radius, self.estimate + radius)


def _weighted_mean_and_var(values: Iterable[Tuple[float, float]]) -> Tuple[float, float, float]:
    total_weight = sum(weight for _, weight in values)
    if total_weight == 0:
        return 0.0, 0.0, 0.0
    mean = sum(value * weight for value, weight in values) / total_weight
    # Unbiased weighted variance. When only one observation is present we report zero variance.
    if total_weight <= 1:
        variance = 0.0
    else:
        variance = sum(weight * (value - mean) ** 2 for value, weight in values) / (total_weight - 1)
    return mean, variance, total_weight


def difference_in_differences(records: Iterable[KPIObservation], metric: str) -> EstimatorResult:
    buckets: Dict[Tuple[bool, RolloutPhase], List[Tuple[float, float]]] = defaultdict(list)
    for record in records:
        buckets[(record.is_treated, record.phase)].append((record.value_for(metric), record.weight))

    treated_pre = buckets[(True, RolloutPhase.PRE)]
    treated_post = buckets[(True, RolloutPhase.POST)]
    control_pre = buckets[(False, RolloutPhase.PRE)]
    control_post = buckets[(False, RolloutPhase.POST)]

    mean_treated_pre, var_treated_pre, n_treated_pre = _weighted_mean_and_var(treated_pre)
    mean_treated_post, var_treated_post, n_treated_post = _weighted_mean_and_var(treated_post)
    mean_control_pre, var_control_pre, n_control_pre = _weighted_mean_and_var(control_pre)
    mean_control_post, var_control_post, n_control_post = _weighted_mean_and_var(control_post)

    diff_treated = mean_treated_post - mean_treated_pre
    diff_control = mean_control_post - mean_control_pre
    estimate = diff_treated - diff_control

    variance = 0.0
    for var, n in (
        (var_treated_post, n_treated_post),
        (var_treated_pre, n_treated_pre),
        (var_control_post, n_control_post),
        (var_control_pre, n_control_pre),
    ):
        if n > 0:
            variance += var / max(n, 1)
    standard_error = math.sqrt(max(variance, 1e-12))

    details = {
        "treated_pre_mean": mean_treated_pre,
        "treated_post_mean": mean_treated_post,
        "control_pre_mean": mean_control_pre,
        "control_post_mean": mean_control_post,
    }

    return EstimatorResult(estimate=estimate, standard_error=standard_error, details=details)


def synthetic_control(records: Iterable[KPIObservation], metric: str) -> EstimatorResult:
    per_unit: Dict[str, Dict[str, List[Tuple[float, float]]]] = defaultdict(lambda: defaultdict(list))
    treated_units: List[str] = []
    control_units: List[str] = []

    for record in records:
        phase_key = record.phase.value
        per_unit[record.unit][phase_key].append((record.value_for(metric), record.weight))
        if record.is_treated and record.unit not in treated_units:
            treated_units.append(record.unit)
        elif not record.is_treated and record.unit not in control_units:
            control_units.append(record.unit)

    if not treated_units or not control_units:
        raise ValueError("Synthetic control requires at least one treated and one control unit.")

    def summarise(unit: str, phase: str) -> Tuple[float, float, float]:
        return _weighted_mean_and_var(per_unit[unit][phase])

    treated_pre = np.array([summarise(unit, RolloutPhase.PRE.value)[0] for unit in treated_units])
    treated_post = np.array([summarise(unit, RolloutPhase.POST.value)[0] for unit in treated_units])
    control_pre = np.array([summarise(unit, RolloutPhase.PRE.value)[0] for unit in control_units])
    control_post = np.array([summarise(unit, RolloutPhase.POST.value)[0] for unit in control_units])

    # Solve for control weights that best match the treated pre-period means while summing to 1.
    design_matrix = np.vstack([control_pre, np.ones_like(control_pre)])
    target = np.array([treated_pre.mean(), 1.0])
    weights, *_ = np.linalg.lstsq(design_matrix, target, rcond=None)
    weights = np.clip(weights, 0.0, None)
    if weights.sum() == 0:
        weights = np.full_like(weights, 1.0 / len(weights))
    else:
        weights = weights / weights.sum()

    synthetic_post = float(weights @ control_post)
    estimate = float(treated_post.mean() - synthetic_post)

    var_treated_post = np.var(treated_post, ddof=1) if treated_post.size > 1 else 0.0
    # Use unit-level post variances to propagate uncertainty through the weights.
    control_post_variances = np.array(
        [summarise(unit, RolloutPhase.POST.value)[1] for unit in control_units]
    )
    weighted_control_var = float(np.sum((weights ** 2) * control_post_variances))
    standard_error = math.sqrt(max(var_treated_post / max(len(treated_units), 1) + weighted_control_var, 1e-12))

    details = {
        "treated_post_mean": float(treated_post.mean()),
        "synthetic_post_mean": synthetic_post,
    }

    return EstimatorResult(estimate=estimate, standard_error=standard_error, details=details)


def cuped(records: Iterable[KPIObservation], metric: str) -> EstimatorResult:
    per_unit: Dict[str, Dict[str, List[Tuple[float, float]]]] = defaultdict(lambda: defaultdict(list))
    treated_flags: Dict[str, bool] = {}

    for record in records:
        phase_key = record.phase.value
        per_unit[record.unit][phase_key].append((record.value_for(metric), record.weight))
        treated_flags[record.unit] = record.is_treated

    pre_means: List[float] = []
    post_means: List[float] = []
    treated_mask: List[bool] = []

    for unit, phases in per_unit.items():
        pre_mean, _, _ = _weighted_mean_and_var(phases[RolloutPhase.PRE.value])
        post_mean, _, _ = _weighted_mean_and_var(phases[RolloutPhase.POST.value])
        pre_means.append(pre_mean)
        post_means.append(post_mean)
        treated_mask.append(treated_flags[unit])

    pre = np.array(pre_means)
    post = np.array(post_means)
    treated = np.array(treated_mask)

    if np.var(pre) == 0:
        theta = 0.0
    else:
        theta = float(np.cov(pre, post, ddof=1)[0, 1] / np.var(pre, ddof=1))

    adjusted = post - theta * (pre - pre.mean())
    treated_adjusted = adjusted[treated]
    control_adjusted = adjusted[~treated]

    estimate = float(treated_adjusted.mean() - control_adjusted.mean())

    var_treated = float(np.var(treated_adjusted, ddof=1)) if treated_adjusted.size > 1 else 0.0
    var_control = float(np.var(control_adjusted, ddof=1)) if control_adjusted.size > 1 else 0.0
    standard_error = math.sqrt(
        max(var_treated / max(treated_adjusted.size, 1) + var_control / max(control_adjusted.size, 1), 1e-12)
    )

    details = {
        "theta": theta,
        "pre_mean": float(pre.mean()),
    }
    return EstimatorResult(estimate=estimate, standard_error=standard_error, details=details)
