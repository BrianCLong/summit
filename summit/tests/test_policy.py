import pytest

from summit.policy.engine import PolicyDecision, PolicyEngine
from summit.protocols.envelope import SummitEnvelope, ToolCall


def test_policy_engine_deny_by_default():
    engine = PolicyEngine(allow_tools_by_agent={})
    env = SummitEnvelope(
        message_id="msg1",
        conversation_id="conv1",
        sender="agent1",
        recipient="system",
        intent="REQUEST",
        tool_calls=[ToolCall(name="git", arguments={})],
        security={"classification": "internal"}
    )
    decision = engine.evaluate(env)
    assert not decision.allowed
    assert "tool_not_allowed:git" in decision.reasons

def test_policy_engine_allow():
    engine = PolicyEngine(allow_tools_by_agent={"agent1": ["git"]})
    env = SummitEnvelope(
        message_id="msg1",
        conversation_id="conv1",
        sender="agent1",
        recipient="system",
        intent="REQUEST",
        tool_calls=[ToolCall(name="git", arguments={})],
        security={"classification": "internal"}
    )
    decision = engine.evaluate(env)
    assert decision.allowed
    assert len(decision.reasons) == 0

def test_policy_engine_missing_classification():
    engine = PolicyEngine(allow_tools_by_agent={"agent1": ["git"]})
    env = SummitEnvelope(
        message_id="msg1",
        conversation_id="conv1",
        sender="agent1",
        recipient="system",
        intent="REQUEST",
        tool_calls=[ToolCall(name="git", arguments={})],
        security={} # missing classification
    )
    decision = engine.evaluate(env)
    assert not decision.allowed
    assert "missing_classification" in decision.reasons
