import json
import os
import sys

# Ensure scripts directory is in path for tests
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scripts.monitoring.cbm_drift import detect_drift, write_drift_report

def test_drift_detection(tmp_path):
    current = {"laundering_risk": 0.9, "void_score": 0.2}
    baseline = {"laundering_risk": 0.5, "void_score": 0.25}

    drift = detect_drift(current, baseline)
    assert "laundering_risk" in drift
    assert drift["laundering_risk"]["alert"] is True
    assert "void_score" not in drift

    artifact_path = os.path.join(tmp_path, "drift_report.json")
    write_drift_report(drift, artifact_path)

    with open(artifact_path) as f:
        data = json.load(f)
        assert "laundering_risk" in data
