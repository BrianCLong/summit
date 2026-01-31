import pytest

from summit.policy.permission_broker import PermissionBroker


def test_headless_deny_all():
    broker = PermissionBroker(mode="headless")
    req = {"type": "tool", "toolName": "dangerous_tool"}
    decision = broker.decide(req)
    assert decision["optionId"] == "reject_once"

    req_url = {"type": "url", "url": "http://evil.com"}
    decision = broker.decide(req_url)
    assert decision["optionId"] == "reject_once"

def test_interactive_allowlist():
    allowlist = {("tool", "safe_tool"): True}
    broker = PermissionBroker(mode="interactive", allowlist=allowlist)

    # Allowed
    req = {"type": "tool", "toolName": "safe_tool"}
    decision = broker.decide(req)
    assert decision["optionId"] == "allow_once"

    # Denied (not in allowlist)
    req_bad = {"type": "tool", "toolName": "unknown_tool"}
    decision = broker.decide(req_bad)
    assert decision["optionId"] == "reject_once"

def test_interactive_url_allowlist():
    allowlist = {("url", "https://github.com"): True}
    broker = PermissionBroker(mode="interactive", allowlist=allowlist)

    req = {"type": "url", "url": "https://github.com"}
    decision = broker.decide(req)
    assert decision["optionId"] == "allow_once"

    req_bad = {"type": "url", "url": "https://other.com"}
    decision = broker.decide(req_bad)
    assert decision["optionId"] == "reject_once"
