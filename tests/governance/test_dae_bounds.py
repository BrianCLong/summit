import pytest
import time
from summit.governance.dae.bounds import ExecutionBounds
from summit.governance.dae.envelope import DeterministicActionEnvelope, BoundsViolationError, ApprovalRequiredError, PolicyViolationError
from summit.governance.policy.runtime import PolicyRuntime
from summit.governance.risk.classifier import RiskClassifier

def test_tool_allowance():
    bounds = ExecutionBounds(allowed_tools=["allowed_tool"])
    dae = DeterministicActionEnvelope(bounds, "test")

    # Should pass
    dae.check_pre_execution("allowed_tool", {})

    # Should fail
    with pytest.raises(BoundsViolationError, match="not in the allowed list"):
        dae.check_pre_execution("forbidden_tool", {})

def test_max_tool_calls():
    bounds = ExecutionBounds(allowed_tools=["tool"], max_tool_calls=2)
    dae = DeterministicActionEnvelope(bounds, "test")

    dae.wrap_execution("tool", lambda: None) # 1
    dae.wrap_execution("tool", lambda: None) # 2

    with pytest.raises(BoundsViolationError, match="Max tool calls"):
        dae.wrap_execution("tool", lambda: None) # 3

def test_max_duration():
    bounds = ExecutionBounds(allowed_tools=["tool"], max_duration_seconds=0.1)
    dae = DeterministicActionEnvelope(bounds, "test")

    time.sleep(0.2)

    with pytest.raises(BoundsViolationError, match="Max duration"):
        dae.wrap_execution("tool", lambda: None)

def test_policy_approval_blocking():
    bounds = ExecutionBounds(allowed_tools=["external_email"])
    classifier = RiskClassifier()
    policy = PolicyRuntime(classifier)

    # High sensitivity -> High Risk -> Approval Required for everything
    metadata = {"sensitivity": "high"}

    dae = DeterministicActionEnvelope(bounds, "test", policy_runtime=policy, agent_metadata=metadata)

    with pytest.raises(ApprovalRequiredError, match="Approval required"):
        dae.check_pre_execution("external_email", {})

def test_policy_deny():
    bounds = ExecutionBounds(allowed_tools=["write"])
    classifier = RiskClassifier()
    policy = PolicyRuntime(classifier)

    # Low sensitivity -> Low Risk -> Only 'read' allowed
    metadata = {"sensitivity": "low"}

    dae = DeterministicActionEnvelope(bounds, "test", policy_runtime=policy, agent_metadata=metadata)

    with pytest.raises(PolicyViolationError, match="Policy denied"):
        dae.check_pre_execution("write", {})
