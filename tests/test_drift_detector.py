import pytest
from summit.self_evolve.drift import DriftDetector

def test_drift_detector_flags_regression():
    detector = DriftDetector(threshold=0.1)

    baseline = {"success_rate": 0.90, "avg_latency": 100}

    # Within threshold
    current_ok = {"success_rate": 0.85, "avg_latency": 105}
    assert len(detector.detect_drift(current_ok, baseline)) == 0

    # Outside threshold (regression)
    current_bad = {"success_rate": 0.80, "avg_latency": 120}
    regressions = detector.detect_drift(current_bad, baseline)
    assert len(regressions) == 2
    assert "success_rate" in regressions[0]
    assert "avg_latency" in regressions[1]
