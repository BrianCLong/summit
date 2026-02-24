import pytest
from summit.policy.osint_policy import evaluate, OsintPolicyInput

def test_evaluate_allowed():
    inp = OsintPolicyInput(
        target="1.1.1.1",
        target_type="IP_ADDRESS",
        allowlist=["1.1.1.1"],
        authorization_attestation="auth_token",
        tor_enabled=False
    )
    passed, reasons = evaluate(inp)
    assert passed
    assert len(reasons) == 0

def test_evaluate_disallowed_type():
    inp = OsintPolicyInput(
        target="1.1.1.1",
        target_type="INVALID_TYPE",
        allowlist=["1.1.1.1"],
        authorization_attestation="auth_token",
        tor_enabled=False
    )
    passed, reasons = evaluate(inp)
    assert not passed
    assert "target_type_not_allowed" in reasons

def test_evaluate_missing_allowlist():
    inp = OsintPolicyInput(
        target="1.1.1.1",
        target_type="IP_ADDRESS",
        allowlist=[],
        authorization_attestation="auth_token",
        tor_enabled=False
    )
    passed, reasons = evaluate(inp)
    assert not passed
    assert "missing_allowlist" in reasons

def test_evaluate_target_not_in_allowlist():
    inp = OsintPolicyInput(
        target="1.1.1.1",
        target_type="IP_ADDRESS",
        allowlist=["8.8.8.8"],
        authorization_attestation="auth_token",
        tor_enabled=False
    )
    passed, reasons = evaluate(inp)
    assert not passed
    assert "target_not_in_allowlist" in reasons

def test_evaluate_missing_auth():
    inp = OsintPolicyInput(
        target="1.1.1.1",
        target_type="IP_ADDRESS",
        allowlist=["1.1.1.1"],
        authorization_attestation=None,
        tor_enabled=False
    )
    passed, reasons = evaluate(inp)
    assert not passed
    assert "missing_authorization_attestation" in reasons

def test_evaluate_tor_enabled():
    inp = OsintPolicyInput(
        target="1.1.1.1",
        target_type="IP_ADDRESS",
        allowlist=["1.1.1.1"],
        authorization_attestation="auth_token",
        tor_enabled=True
    )
    passed, reasons = evaluate(inp)
    assert not passed
    assert "tor_disabled_by_default" in reasons
