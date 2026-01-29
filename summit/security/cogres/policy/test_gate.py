import pytest
from summit.security.cogres.policy.gate import CogResGate, GateDecision

def test_cogres_gate_allow_normal():
    gate = CogResGate(config={})
    decision = gate.check(event={"action": "summarize"}, signals={})
    assert decision.allow
    assert decision.reasons == []

def test_cogres_gate_block_sensitive_with_signals():
    gate = CogResGate(config={})
    decision = gate.check(
        event={"action": "generate_targeted_persuasion"},
        signals={"microtargeting_intent": True}
    )
    assert not decision.allow
    assert "microtargeting_intent" in decision.reasons

def test_cogres_gate_allow_sensitive_without_signals():
    gate = CogResGate(config={})
    # Sensitive action but no signals
    decision = gate.check(
        event={"action": "generate_targeted_persuasion"},
        signals={}
    )
    assert decision.allow

def test_cogres_gate_allow_non_sensitive_with_signals():
    gate = CogResGate(config={})
    # Signal present but action not sensitive
    decision = gate.check(
        event={"action": "summarize"},
        signals={"microtargeting_intent": True}
    )
    assert decision.allow

def test_cogres_gate_custom_sensitive_actions():
    gate = CogResGate(config={"sensitive_actions": ["custom_action"]})
    decision = gate.check(
        event={"action": "custom_action"},
        signals={"campaign_mode": True}
    )
    assert not decision.allow
    assert "campaign_mode" in decision.reasons
