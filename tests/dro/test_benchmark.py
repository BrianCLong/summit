from __future__ import annotations

from benchmarks.dro.benchmark_runner import BASELINE_OBJECTIVE, TOLERANCE, run_benchmark


def test_benchmark_runner_respects_tolerance() -> None:
    result = run_benchmark()
    assert abs(result.objective_cost - BASELINE_OBJECTIVE) / BASELINE_OBJECTIVE <= TOLERANCE
    assert "changes" in result.diff_from_baseline
