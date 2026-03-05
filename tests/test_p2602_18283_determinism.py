import json
import os

import pytest

from summit.experiments.p2602_18283.evaluator import run_evaluation, write_artifacts


def test_determinism():
    config = {"fixture": "fixed_dataset", "learning_rate": 0.01}

    report1, metrics1, stamp1 = run_evaluation(config)
    report2, metrics2, stamp2 = run_evaluation(config)

    assert json.dumps(report1, sort_keys=True) == json.dumps(report2, sort_keys=True)
    assert json.dumps(metrics1, sort_keys=True) == json.dumps(metrics2, sort_keys=True)
    assert json.dumps(stamp1, sort_keys=True) == json.dumps(stamp2, sort_keys=True)

    # Check evidence ID format
    assert stamp1["evidence_id"].startswith("SUMMIT-P2602-18283-fixed_dataset-hit_rate-")

def test_metric_matches_paper_baseline():
    config = {"fixture": "fixed_dataset"}
    report, metrics, stamp = run_evaluation(config)

    # 8% improvement is claimed
    EXPECTED_HIT_RATE_IMPROVEMENT = 0.08
    TOL = 1e-5

    assert abs(metrics["hit_rate_improvement"] - EXPECTED_HIT_RATE_IMPROVEMENT) <= TOL
