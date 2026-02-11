import pytest
from summit.policy.engine import PolicyEngine
from summit.protocols.envelope import SummitEnvelope, ToolCall

def test_policy_engine_allow():
    allow_map = {"agent_a": ["tool_1"]}
    engine = PolicyEngine(allow_map)

    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="agent_a", recipient="agent_b", intent="REQUEST",
        tool_calls=[ToolCall("tool_1", {})],
        security={"classification": "public"}
    )

    decision = engine.evaluate(env)
    assert decision.allowed is True
    assert len(decision.reasons) == 0

def test_policy_engine_deny_tool():
    allow_map = {"agent_a": ["tool_1"]}
    engine = PolicyEngine(allow_map)

    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="agent_a", recipient="agent_b", intent="REQUEST",
        tool_calls=[ToolCall("tool_2", {})],
        security={"classification": "public"}
    )

    decision = engine.evaluate(env)
    assert decision.allowed is False
    # Check if correct reason is present (partially matching string)
    assert any("tool_not_allowed" in r for r in decision.reasons)

def test_policy_engine_missing_classification():
    allow_map = {"agent_a": ["tool_1"]}
    engine = PolicyEngine(allow_map)

    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="agent_a", recipient="agent_b", intent="REQUEST",
        tool_calls=[ToolCall("tool_1", {})],
        security={}
    )

    decision = engine.evaluate(env)
    assert decision.allowed is False
    assert "missing_classification" in decision.reasons
