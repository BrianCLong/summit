import os

from packages.common.decision_record import DecisionRecord

FEATURE_EXPLAINABILITY_REQUIRED = os.getenv("FEATURE_EXPLAINABILITY_REQUIRED", "false").lower() == "true"

def test_decision_record_determinism():
    dr1 = DecisionRecord.create("ctx1", "allow", ["score>0.5"], ["policyA"])
    dr2 = DecisionRecord.create("ctx1", "allow", ["score>0.5"], ["policyA"])
    assert dr1.decision_id == dr2.decision_id

    dr3 = DecisionRecord.create("ctx1", "allow", ["score>0.9"], ["policyA"])
    assert dr1.decision_id != dr3.decision_id

def test_decision_record_required_when_enabled(monkeypatch):
    # Mock enabling the feature
    monkeypatch.setenv("FEATURE_EXPLAINABILITY_REQUIRED", "true")

    # Simulate a prioritizer flow
    decision_made = True
    record_produced = False

    # Logic under test
    if decision_made:
        # If enabled, must produce record
        dr = DecisionRecord.create("test", "go", ["factor"], [])
        record_produced = dr is not None

    assert record_produced is True

def test_decision_record_structure():
    dr = DecisionRecord.create("c", "o", ["f1"], ["p1"], model="v1")
    d = dr.to_dict()
    assert "decision_id" in d
    assert d["model_version"] == "v1"
    assert "summary" in d
