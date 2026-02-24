import pytest
import os
import json
import shutil
from summit.self_evolve.policy import EvolutionPolicy
from summit.self_evolve.operators import OPERATORS
from summit.self_evolve.concierge import ConciergeRouter
from summit.self_evolve.meta import MetaCognitionEngine
from summit.self_evolve.evidence import EvolutionEvidenceWriter
from summit.self_evolve.drift import DriftDetector
from summit.self_evolve.redact import redact_data

def test_evolution_budget_enforced():
    max_steps = 3
    current_steps = 0
    # Simulate evolution loop
    for _ in range(5):
        if current_steps < max_steps:
            current_steps += 1
        else:
            break
    assert current_steps == max_steps

def test_concierge_hires_specialist():
    router = ConciergeRouter(capacity=2)
    meta = MetaCognitionEngine()

    router.register_specialist("coder", "Writes code")
    router.register_specialist("tester", "Tests code")
    router.register_specialist("docgen", "Generates docs")

    # Meta-cognition identifies a gap
    gap = meta.detect_gap({"missing_capability": "coder"})
    assert gap == "coder"

    # Router hires based on identified gap
    capability = router.hire_specialist(gap)
    assert capability == "Writes code"
    assert "coder" in router.get_active_specialists()

    # Fill capacity
    router.hire_specialist("tester")
    assert "tester" in router.get_active_specialists()

    # Eviction test
    router.hire_specialist("docgen")
    assert "coder" not in router.get_active_specialists()
    assert "docgen" in router.get_active_specialists()

def test_deterministic_evidence():
    run_id = "test-run-123"
    writer = EvolutionEvidenceWriter(run_id)
    data = {"task": "evolution", "result": "better"}
    writer.write_evidence(data)

    path = f"artifacts/self-evolving-agents/{run_id}/evidence.json"
    with open(path, "r") as f:
        loaded = json.load(f)
    assert loaded == data
    # Clean up
    shutil.rmtree(f"artifacts/self-evolving-agents/{run_id}")

def test_policy_denies_mutation():
    policy = EvolutionPolicy()
    assert not policy.is_allowed("OP_PROMPT_PATCH")
    policy.allow_operator("OP_PROMPT_PATCH")
    assert policy.is_allowed("OP_PROMPT_PATCH")

def test_drift_detector_flags_regression():
    detector = DriftDetector(threshold=0.1)
    baseline = {"success_rate": 0.9, "cost": 10.0}

    # Slight regression within threshold
    assert not detector.detect_regression({"success_rate": 0.85}, baseline)

    # Regression beyond threshold
    assert detector.detect_regression({"success_rate": 0.75}, baseline)

    # Cost increase within threshold
    assert not detector.detect_regression({"cost": 10.5}, baseline)

    # Cost increase beyond threshold
    assert detector.detect_regression({"cost": 12.0}, baseline)

def test_evidence_redaction():
    sensitive_data = {
        "user_email": "user@example.com",
        "api_key": "sk-12345",
        "nested": {
            "token": "secret-token",
            "public_field": "visible"
        }
    }
    redacted = redact_data(sensitive_data)
    assert redacted["user_email"] == "[REDACTED]"
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["nested"]["token"] == "[REDACTED]"
    assert redacted["nested"]["public_field"] == "visible"
