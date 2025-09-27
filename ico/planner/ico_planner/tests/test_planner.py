"""Tests for ICO planner."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from ico_planner import Planner, PlannerConfig

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures"


@pytest.fixture()
def planning_request():
    return Planner.load_request(FIXTURES / "request.json")


def test_plan_meets_slos_and_reduces_cost(planning_request):
    planner = Planner(PlannerConfig(target_utilization=0.65, scale_buffer=1.2))
    result = planner.plan(planning_request)

    assert result.summary.total_savings_pct() > 0.5

    for plan in result.summary.plans:
        assert plan.latency_headroom_ms >= 0
        assert plan.accuracy_headroom >= 0
        assert plan.planned_cost < plan.baseline_cost

    # Validate determinism by re-planning and comparing JSON output
    second = planner.plan(planning_request)
    assert result.to_json() == second.to_json()


def test_apply_plan_matches_benchmark(planning_request):
    planner = Planner(PlannerConfig(target_utilization=0.65, scale_buffer=1.2))
    result = planner.plan(planning_request)

    benchmark = json.loads((FIXTURES / "benchmarks.json").read_text())
    expected_total = benchmark["expected_total_savings_pct"]
    tolerance = benchmark["tolerance_pct"]

    actual_total = result.summary.total_savings_pct()
    assert abs(actual_total - expected_total) <= tolerance

    actual_map = {
        f"{plan.endpoint.model}:{plan.endpoint.endpoint}": {
            "baseline_cost": plan.baseline_cost,
            "planned_cost": plan.planned_cost,
        }
        for plan in result.summary.plans
    }
    for key, expected in benchmark["endpoints"].items():
        assert key in actual_map
        assert actual_map[key]["baseline_cost"] == pytest.approx(expected["baseline_cost"], abs=1e-6)
        assert actual_map[key]["planned_cost"] == pytest.approx(expected["planned_cost"], abs=1e-6)


def test_simulation_load_curves_are_monotonic(planning_request):
    planner = Planner()
    multipliers = [0.5, 1.0, 1.5]
    simulations = planner.simulate(planning_request, multipliers)

    for series in simulations.values():
        util_values = [point["utilization"] for point in series]
        assert util_values == sorted(util_values)

        latency_values = [point["latency_ms"] for point in series]
        assert latency_values[0] <= latency_values[-1]


