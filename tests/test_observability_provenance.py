import pytest
from summit.observability.provenance import DecisionProvenance

def test_provenance_recording():
    prov = DecisionProvenance(evidence_id="EVD-TEST-001")
    prov.record_step(
        step="initial_query",
        input={"q": "hello"},
        output={"a": "hi", "confidence": 0.9},
        agent_id="agent-a"
    )

    report = prov.generate_report()
    assert report["evidence_id"] == "EVD-TEST-001"
    assert report["step_count"] == 1
    assert report["timeline"][0]["step"] == "initial_query"
    assert report["timeline"][0]["confidence"] == 0.9
    assert report["timeline"][0]["agent_id"] == "agent-a"

def test_provenance_multiple_steps():
    prov = DecisionProvenance(evidence_id="EVD-TEST-002")
    prov.record_step("step1", {}, {})
    prov.record_step("step2", {}, {})

    report = prov.generate_report()
    assert report["step_count"] == 2

def test_provenance_report_determinism():
    prov = DecisionProvenance(evidence_id="EVD-TEST-003")
    prov.record_step("step1", {}, {})
    report = prov.generate_report()
    assert "timestamp" not in report["timeline"][0]
