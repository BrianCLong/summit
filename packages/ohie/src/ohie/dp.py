"""Differential privacy aware sampling plan utilities."""

from __future__ import annotations

import math
from dataclasses import dataclass
from statistics import NormalDist

from .core import OptOutScenario, analytic_kpi


@dataclass(frozen=True)
class SamplingPlan:
  """Represents a sampling plan that accounts for DP noise."""

  sample_size: int
  achieved_error: float
  dp_noise: float
  sampling_error: float
  confidence: float


def _gaussian_sigma(epsilon: float, delta: float) -> float:
  if epsilon <= 0:
    raise ValueError("epsilon must be positive")
  if not 0 < delta < 1:
    raise ValueError("delta must be between 0 and 1")
  return math.sqrt(2 * math.log(1.25 / delta)) / epsilon


def plan_dp_sampling(
  scenario: OptOutScenario,
  epsilon: float,
  delta: float,
  target_error: float,
  confidence: float = 0.95,
  sensitivity: float = 1.0,
  max_iterations: int = 1_000_000,
) -> SamplingPlan:
  """Compute the minimum sample size meeting a target error bound with DP noise."""

  if target_error <= 0:
    raise ValueError("target_error must be positive")
  z_score = NormalDist().inv_cdf((1 + confidence) / 2)
  dp_sigma = _gaussian_sigma(epsilon, delta) * sensitivity
  expected_kpi = analytic_kpi(scenario)

  sample = max(10, int(0.01 * scenario.population))
  best_plan: SamplingPlan | None = None

  while sample <= max_iterations:
    sampling_se = math.sqrt(max(expected_kpi * (1 - expected_kpi) / sample, 1e-12))
    dp_se = dp_sigma / sample
    total_error = z_score * math.sqrt(sampling_se ** 2 + dp_se ** 2)
    plan = SamplingPlan(
      sample_size=sample,
      achieved_error=total_error,
      dp_noise=z_score * dp_se,
      sampling_error=z_score * sampling_se,
      confidence=confidence,
    )
    if total_error <= target_error:
      return plan
    best_plan = plan
    sample = int(sample * 1.1) + 1

  if best_plan is None:
    raise RuntimeError("failed to construct a sampling plan within max_iterations")
  return best_plan
