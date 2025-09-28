"""Tests for the Drift Root-Cause Explorer synthetic workflow."""

from __future__ import annotations

import math

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.drce import DriftRootCauseExplorer, build_synthetic_scenario
from tools.drce.models import CounterfactualAction


def test_planted_cause_ranked_top_three() -> None:
    scenario = build_synthetic_scenario(planted_cause="feature:payment_failure_rate")
    explorer = DriftRootCauseExplorer()

    attributions = explorer.rank_attributions(scenario)
    top_three = [result.name for result in attributions[:3]]

    assert "feature:payment_failure_rate" in top_three


def test_counterfactual_replay_reduces_drift_as_predicted() -> None:
    scenario = build_synthetic_scenario()
    explorer = DriftRootCauseExplorer()

    attributions = explorer.rank_attributions(scenario)
    planted_feature = attributions[0].name

    action = CounterfactualAction(description=f"Revert {planted_feature} to baseline")
    result = explorer.run_counterfactual(scenario, planted_feature, action)

    assert result.actual_drift < scenario.total_drift_metric
    assert math.isclose(result.predicted_reduction, result.actual_reduction, rel_tol=1e-5)
