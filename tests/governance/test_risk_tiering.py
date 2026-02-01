import pytest
from summit.governance.risk.classifier import RiskClassifier
from summit.governance.policy.runtime import PolicyRuntime

def test_risk_classification():
    classifier = RiskClassifier()

    assert classifier.classify({"sensitivity": "low"}) == "low"
    assert classifier.classify({"sensitivity": "high"}) == "high"
    assert classifier.classify({"capabilities": ["external_email"]}) == "high"
    # Fallback to low if no match
    assert classifier.classify({"capabilities": ["read_data"]}) == "low"

def test_policy_evaluation():
    classifier = RiskClassifier()
    runtime = PolicyRuntime(classifier)

    # Low risk
    decision = runtime.evaluate_action({"sensitivity": "low"}, "read", "resource")
    assert decision.decision == "allow"

    # High risk -> needs approval
    decision = runtime.evaluate_action({"sensitivity": "high"}, "write", "resource")
    assert decision.decision == "needs_approval"

    # Low risk -> deny forbidden action
    decision = runtime.evaluate_action({"sensitivity": "low"}, "write", "resource") # Low only allows read
    assert decision.decision == "deny"
    assert "not allowed" in decision.reason
