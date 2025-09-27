"""Opt-Out Herd Immunity Estimator public API."""

from .core import (
  OptOutScenario,
  SensitivityPoint,
  SimulationResult,
  analytic_kpi,
  compute_degradation_confidence_interval,
  generate_sensitivity_curve,
  simulate_opt_out,
)
from .dp import SamplingPlan, plan_dp_sampling
from .brief import RiskBrief, generate_risk_brief

__all__ = [
  "OptOutScenario",
  "SensitivityPoint",
  "SimulationResult",
  "SamplingPlan",
  "RiskBrief",
  "analytic_kpi",
  "simulate_opt_out",
  "generate_sensitivity_curve",
  "compute_degradation_confidence_interval",
  "plan_dp_sampling",
  "generate_risk_brief",
]
