import json

import pytest

from summit.policy.osint_policy import OsintPolicyInput, evaluate


def test_allow_valid():
    inp = OsintPolicyInput(
        target="1.2.3.4",
        target_type="IP_ADDRESS",
        allowlist=["1.2.3.4"],
        authorization_attestation="ticket-123"
    )
    allowed, reasons = evaluate(inp)
    assert allowed
    assert not reasons

def test_deny_missing_allowlist():
    inp = OsintPolicyInput(
        target="1.2.3.4",
        target_type="IP_ADDRESS",
        allowlist=[],
        authorization_attestation="ticket-123"
    )
    allowed, reasons = evaluate(inp)
    assert not allowed
    assert "missing_allowlist" in reasons
    assert "target_not_in_allowlist" in reasons

def test_deny_target_mismatch():
    inp = OsintPolicyInput(
        target="1.2.3.4",
        target_type="IP_ADDRESS",
        allowlist=["5.6.7.8"],
        authorization_attestation="ticket-123"
    )
    allowed, reasons = evaluate(inp)
    assert not allowed
    assert "target_not_in_allowlist" in reasons

def test_deny_tor():
    inp = OsintPolicyInput(
        target="1.2.3.4",
        target_type="IP_ADDRESS",
        allowlist=["1.2.3.4"],
        authorization_attestation="ticket-123",
        tor_enabled=True
    )
    allowed, reasons = evaluate(inp)
    assert not allowed
    assert "tor_disabled_by_default" in reasons
