import pytest
from datetime import datetime, timezone
from modules.info_integrity.reporting import generate_compliance_report

def test_generate_compliance_report_structure():
    metrics = {"score": 0.95}
    violations = []
    report = generate_compliance_report("EVD-123", metrics, violations)

    assert report["evidence_id"] == "EVD-123"
    assert report["metrics"] == metrics
    assert report["violations"] == violations
    assert report["status"] == "pass"
    # Verify timestamp is recent and valid
    dt = datetime.fromisoformat(report["timestamp"])
    assert dt.tzinfo == timezone.utc

def test_generate_compliance_report_failure():
    metrics = {"score": 0.5}
    violations = ["Too low"]
    report = generate_compliance_report("EVD-123", metrics, violations)
    assert report["status"] == "fail"
