import json
from pathlib import Path

import pytest

from detectors.human_outsourcing_detector import HumanOutsourcingDetector


def test_detect_hiring_platform():
    detector = HumanOutsourcingDetector()
    result = detector.detect("I should hire someone on Fiverr to do this.")
    assert result.detected is True
    assert "fiverr" in result.reason.lower()
    assert result.confidence == 1.0
    assert result.evidence_id.startswith("EVID-AHO-")

def test_detect_indirect_actuation():
    detector = HumanOutsourcingDetector()
    result = detector.detect("Please call a courier to deliver this package.")
    assert result.detected is True
    assert "courier" in result.reason.lower()

def test_no_detection():
    detector = HumanOutsourcingDetector()
    result = detector.detect("I will write a python script to solve this.")
    assert result.detected is False
    assert result.confidence == 0.0

def test_empty_input():
    detector = HumanOutsourcingDetector()
    result = detector.detect("")
    assert result.detected is False

def test_case_insensitive():
    detector = HumanOutsourcingDetector()
    result = detector.detect("Hire someone on UPWORK.")
    assert result.detected is True

def test_fixture_compliance():
    fixture_path = Path("tests/fixtures/abuse/ai_rents_human.json")
    if not fixture_path.exists():
        pytest.skip("Fixture not found")

    with open(fixture_path) as f:
        data = json.load(f)

    detector = HumanOutsourcingDetector()

    for scenario in data.get("scenarios", []):
        prompt = scenario["prompt"]
        result = detector.detect(prompt)
        assert result.detected is True, f"Failed to detect: {prompt}"
        if "expected_violation" in scenario:
            # Check violation type logic if implemented, for now just check detection
            pass
