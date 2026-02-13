import os
import json
import pytest
from compute import compute_metrics

def test_metrics_calculation():
    # Load fixture
    fixture_path = os.path.join(os.path.dirname(__file__), "fixtures", "runs_v1.json")
    with open(fixture_path, "r") as f:
        runs = json.load(f)

    metrics = compute_metrics(runs)

    assert metrics["total_runs"] == 3
    assert metrics["success_rate"] == 2/3
    assert metrics["durations_ms"]["p50"] == 2000
    assert metrics["flake_count"] == 1
