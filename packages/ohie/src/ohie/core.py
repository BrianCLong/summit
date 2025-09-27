"""Core analytics utilities for the Opt-Out Herd Immunity Estimator."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import NormalDist
from typing import Iterable, List, Sequence

import numpy as np


@dataclass(frozen=True)
class OptOutScenario:
  """Configuration describing a single opt-out scenario."""

  baseline_kpi: float
  opt_out_rate: float
  population: int
  sensitivity: float = 1.0

  def __post_init__(self) -> None:
    if not 0 <= self.baseline_kpi <= 1:
      raise ValueError("baseline_kpi must be between 0 and 1")
    if not 0 <= self.opt_out_rate <= 1:
      raise ValueError("opt_out_rate must be between 0 and 1")
    if self.population <= 0:
      raise ValueError("population must be positive")
    if self.sensitivity < 0:
      raise ValueError("sensitivity must be non-negative")


@dataclass(frozen=True)
class SensitivityPoint:
  """Represents a single point on the sensitivity curve."""

  opt_out_rate: float
  analytic_kpi: float
  simulated_kpi: float
  kpi_degradation: float


@dataclass(frozen=True)
class SimulationResult:
  """Summary statistics for Monte Carlo simulations."""

  observed_mean: float
  observed_std: float
  degradation_mean: float
  degradation_std: float
  trials: int


def analytic_kpi(scenario: OptOutScenario) -> float:
  """Analytical expectation of KPI under the provided scenario."""

  expected = scenario.baseline_kpi - scenario.sensitivity * scenario.opt_out_rate
  return float(np.clip(expected, 0.0, 1.0))


def _simulated_observations(
  scenario: OptOutScenario,
  trials: int,
  seed: int | None = None,
) -> np.ndarray:
  rng = np.random.default_rng(seed)
  included = rng.binomial(scenario.population, 1 - scenario.opt_out_rate, size=trials)
  success_probability = analytic_kpi(scenario)
  successes = rng.binomial(included, success_probability)
  with np.errstate(divide="ignore", invalid="ignore"):
    observed = np.divide(successes, included, out=np.full(trials, success_probability), where=included > 0)
  return observed


def simulate_opt_out(
  scenario: OptOutScenario,
  trials: int = 2000,
  seed: int | None = None,
) -> SimulationResult:
  """Monte Carlo simulation of KPI degradation under opt-outs."""

  observations = _simulated_observations(scenario, trials, seed)
  observed_mean = float(np.mean(observations))
  observed_std = float(np.std(observations, ddof=1))
  degradation = scenario.baseline_kpi - observations
  degradation_mean = float(np.mean(degradation))
  degradation_std = float(np.std(degradation, ddof=1))
  return SimulationResult(
    observed_mean=observed_mean,
    observed_std=observed_std,
    degradation_mean=degradation_mean,
    degradation_std=degradation_std,
    trials=trials,
  )


def generate_sensitivity_curve(
  base_scenario: OptOutScenario,
  opt_out_rates: Sequence[float] | Iterable[float],
  trials: int = 2000,
  seed: int | None = None,
) -> List[SensitivityPoint]:
  """Generate analytic and simulated KPIs for a range of opt-out rates."""

  points: List[SensitivityPoint] = []
  for idx, rate in enumerate(opt_out_rates):
    scenario = OptOutScenario(
      baseline_kpi=base_scenario.baseline_kpi,
      opt_out_rate=rate,
      population=base_scenario.population,
      sensitivity=base_scenario.sensitivity,
    )
    analytic_value = analytic_kpi(scenario)
    result = simulate_opt_out(scenario, trials=trials, seed=None if seed is None else seed + idx)
    degradation = scenario.baseline_kpi - result.observed_mean
    points.append(
      SensitivityPoint(
        opt_out_rate=rate,
        analytic_kpi=analytic_value,
        simulated_kpi=result.observed_mean,
        kpi_degradation=degradation,
      )
    )
  return points


def compute_degradation_confidence_interval(
  scenario: OptOutScenario,
  sample_size: int,
  confidence: float = 0.95,
) -> tuple[float, float]:
  """Compute a two-sided confidence interval for KPI degradation."""

  if sample_size <= 0:
    raise ValueError("sample_size must be positive")
  if not 0 < confidence < 1:
    raise ValueError("confidence must be between 0 and 1")

  expected_kpi = analytic_kpi(scenario)
  z_score = NormalDist().inv_cdf((1 + confidence) / 2)
  variance = expected_kpi * (1 - expected_kpi) / sample_size
  standard_error = float(np.sqrt(variance))
  lower_kpi = expected_kpi - z_score * standard_error
  upper_kpi = expected_kpi + z_score * standard_error
  lower_degradation = float(np.clip(scenario.baseline_kpi - upper_kpi, 0.0, 1.0))
  upper_degradation = float(np.clip(scenario.baseline_kpi - lower_kpi, 0.0, 1.0))
  return (lower_degradation, upper_degradation)
