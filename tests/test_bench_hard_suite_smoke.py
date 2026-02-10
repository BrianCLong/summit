import pytest
from summit.bench.run import run_benchmark, load_suite
import os

def test_load_suite():
    path = "summit/bench/suites/hard.yaml"
    if not os.path.exists(path):
        pytest.skip("Suite file not found")
    suite = load_suite(path)
    assert suite["name"] == "hard-tasks-v1"
    assert len(suite["cases"]) >= 1

def test_run_benchmark_mock():
    # Mock run should return a summary
    summary = run_benchmark("summit/bench/suites/hard.yaml", mode="composer15_like")
    assert summary["mode"] == "composer15_like"
    assert summary["total_cases"] == 2
    assert summary["results"][0]["deliberation_units"] == 50
