from summit.self_evolve.drift import DriftDetector

def test_drift_detector_flags_regression():
    detector = DriftDetector(success_threshold=0.05, cost_threshold=0.20)

    baseline = {"success_rate": 0.90, "avg_cost": 1.0}

    # PASS
    current_pass = {"success_rate": 0.88, "avg_cost": 1.1}
    report = detector.analyze_drift(baseline, current_pass)
    assert report["regression"] is False

    # FAIL - Success Rate
    current_fail_success = {"success_rate": 0.84, "avg_cost": 1.0}
    report = detector.analyze_drift(baseline, current_fail_success)
    assert report["regression"] is True
    assert report["details"]["success_rate"]["status"] == "FAIL"

    # FAIL - Cost
    current_fail_cost = {"success_rate": 0.90, "avg_cost": 1.25}
    report = detector.analyze_drift(baseline, current_fail_cost)
    assert report["regression"] is True
    assert report["details"]["avg_cost"]["status"] == "FAIL"

def test_drift_detector_handles_missing_metrics():
    detector = DriftDetector()
    report = detector.analyze_drift({}, {})
    assert report["regression"] is False
