import json
from pathlib import Path

import pytest

from cogwar.resilience.drills import run_drill
from cogwar.resilience.metrics import calculate_readiness_score, create_metric


def test_drill_emits_result():
    # Use real fixtures dir
    fixtures_dir = Path("cogwar/resilience/fixtures").absolute()

    result = run_drill("SCEN-001", fixtures_dir)
    assert result["success"] is True
    assert result["scenario_id"] == "SCEN-001"

    result_fail = run_drill("SCEN-002", fixtures_dir)
    assert result_fail["success"] is False # Offensive drill should fail

def test_calculate_readiness():
    results = [
        {"success": True},
        {"success": True},
        {"success": False},
        {"success": True}
    ]
    score = calculate_readiness_score(results)
    assert score == 0.75

def test_create_metric_structure():
    m = create_metric("Drill Success Rate", 0.75, "percent", "2024-Q1")
    assert "metric_id" in m
    assert m["value"] == 0.75
