import os

from intelgraph.policy import EnvPolicyEngine, PolicyRequest


def test_allow_all():
    os.environ["INTELGRAPH_POLICY_MODE"] = "allow_all"
    engine = EnvPolicyEngine()
    req = PolicyRequest("user", "read", "resource")
    decision, reason = engine.decide(req)
    assert decision == "allow"
    assert reason == "default_allow"


def test_deny_all():
    os.environ["INTELGRAPH_POLICY_MODE"] = "deny_all"
    engine = EnvPolicyEngine()
    req = PolicyRequest("user", "read", "resource")
    decision, reason = engine.decide(req)
    assert decision == "deny"
    assert reason == "deny_all"


def test_opa_fallback():
    os.environ["INTELGRAPH_POLICY_MODE"] = "opa"
    engine = EnvPolicyEngine()
    req = PolicyRequest("user", "read", "resource")
    decision, reason = engine.decide(req)
    assert decision == "allow"
    # Should log warning but we don't assert logs here easily without caplog
    assert reason == "default_allow"
