from __future__ import annotations

from ohie import (
  OptOutScenario,
  analytic_kpi,
  compute_degradation_confidence_interval,
  generate_risk_brief,
  generate_sensitivity_curve,
  plan_dp_sampling,
  simulate_opt_out,
)


def test_simulation_matches_analytic_baseline() -> None:
  scenario = OptOutScenario(baseline_kpi=0.82, opt_out_rate=0.15, population=5000, sensitivity=0.4)
  analytic_value = analytic_kpi(scenario)
  result = simulate_opt_out(scenario, trials=5000, seed=42)
  assert abs(result.observed_mean - analytic_value) < 0.01
  assert abs(result.degradation_mean - (scenario.baseline_kpi - analytic_value)) < 0.01

  curve = generate_sensitivity_curve(
    scenario,
    opt_out_rates=[0.05, 0.1, 0.15, 0.2],
    trials=3000,
    seed=7,
  )
  for point in curve:
    expected = analytic_kpi(
      OptOutScenario(
        baseline_kpi=scenario.baseline_kpi,
        opt_out_rate=point.opt_out_rate,
        population=scenario.population,
        sensitivity=scenario.sensitivity,
      )
    )
    assert abs(point.simulated_kpi - expected) < 0.015


def test_dp_sampling_plan_hits_error_bound() -> None:
  scenario = OptOutScenario(baseline_kpi=0.78, opt_out_rate=0.2, population=8000, sensitivity=0.5)
  plan = plan_dp_sampling(
    scenario,
    epsilon=2.0,
    delta=1e-5,
    target_error=0.05,
    confidence=0.95,
  )
  assert plan.achieved_error <= 0.05 + 1e-6
  assert plan.sample_size > 0
  assert plan.dp_noise < plan.achieved_error


def test_risk_brief_is_deterministic() -> None:
  scenario = OptOutScenario(baseline_kpi=0.81, opt_out_rate=0.12, population=6000, sensitivity=0.35)
  curve = generate_sensitivity_curve(scenario, [0.1, 0.12, 0.15], trials=2000, seed=11)
  plan = plan_dp_sampling(scenario, epsilon=1.5, delta=1e-6, target_error=0.04)
  interval = compute_degradation_confidence_interval(scenario, sample_size=plan.sample_size)

  brief_a = generate_risk_brief(scenario, curve, plan, interval, seed=99)
  brief_b = generate_risk_brief(scenario, curve, plan, interval, seed=99)
  assert brief_a.signature == brief_b.signature
  assert brief_a.mitigations == brief_b.mitigations
  mitigations_text = " ".join(brief_a.mitigations).lower()
  assert "minimal-view dmp" in mitigations_text
  assert "cadence" in mitigations_text
  assert interval[0] <= interval[1]
  assert interval[0] >= 0
  assert interval[1] <= 1
