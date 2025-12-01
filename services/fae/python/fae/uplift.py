"""CUPED uplift estimation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict

from .aggregates import CupedAggregate


@dataclass
class CupedResult:
    uplift: float
    treatment_adjusted_mean: float
    control_adjusted_mean: float
    theta: float
    variance: float


def _theta_and_mean_x(control: CupedAggregate) -> Dict[str, float]:
    if control.n == 0:
        return {"theta": 0.0, "mean_x": 0.0}
    mean_x = control.sum_x / control.n
    mean_y = control.sum_y / control.n
    cov_xy = control.sum_xy / control.n - mean_x * mean_y
    var_x = control.sum_x2 / control.n - mean_x * mean_x
    theta = cov_xy / var_x if var_x > 1e-12 else 0.0
    return {"theta": theta, "mean_x": mean_x}


def _adjusted_moments(agg: CupedAggregate, theta: float, baseline_mean_x: float):
    if agg.n == 0:
        return 0.0, 0.0
    sum_z = agg.sum_y - theta * (agg.sum_x - agg.n * baseline_mean_x)
    sum_z2 = (
        agg.sum_y2
        - 2 * theta * (agg.sum_xy - baseline_mean_x * agg.sum_y)
        + theta**2
        * (agg.sum_x2 - 2 * baseline_mean_x * agg.sum_x + agg.n * baseline_mean_x**2)
    )
    mean_z = sum_z / agg.n
    var_z = sum_z2 / agg.n - mean_z**2
    return mean_z, max(var_z, 0.0)


def compute_cuped_uplift(control: CupedAggregate, treatment: CupedAggregate) -> CupedResult:
    params = _theta_and_mean_x(control)
    theta = params["theta"]
    baseline_mean_x = params["mean_x"]
    control_mean, control_var = _adjusted_moments(control, theta, baseline_mean_x)
    treat_mean, treat_var = _adjusted_moments(treatment, theta, baseline_mean_x)
    uplift = treat_mean - control_mean
    variance = (control_var / control.n if control.n else 0.0) + (
        treat_var / treatment.n if treatment.n else 0.0
    )
    return CupedResult(
        uplift=uplift,
        treatment_adjusted_mean=treat_mean,
        control_adjusted_mean=control_mean,
        theta=theta,
        variance=variance,
    )

