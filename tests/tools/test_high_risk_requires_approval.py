import pytest

from summit.policy.engine import PolicyEngine
from summit.policy.rules.tool_risk import HighRiskToolRule
from summit.protocols.envelope import SummitEnvelope, ToolCall


def test_high_risk_tool_blocked_without_approval():
    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="agent", recipient="system", intent="REQUEST",
        tool_calls=[ToolCall(name="delete_file", arguments={"path": "foo"})],
        security={"classification": "internal"}
    )
    rule = HighRiskToolRule()
    engine = PolicyEngine(allow_tools_by_agent={"agent": ["delete_file"]}, rules=[rule])
    decision = engine.evaluate(env)
    assert not decision.allowed
    assert "high_risk_tool_requires_approval:delete_file" in decision.reasons

def test_high_risk_tool_allowed_with_approval():
    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="agent", recipient="system", intent="REQUEST",
        tool_calls=[ToolCall(name="delete_file", arguments={"path": "foo"})],
        security={"approval_id": "auth-123", "classification": "internal"}
    )
    rule = HighRiskToolRule()
    engine = PolicyEngine(allow_tools_by_agent={"agent": ["delete_file"]}, rules=[rule])
    decision = engine.evaluate(env)
    assert decision.allowed

def test_low_risk_tool_allowed_without_approval():
    env = SummitEnvelope(
        message_id="1", conversation_id="1", sender="agent", recipient="system", intent="REQUEST",
        tool_calls=[ToolCall(name="read_file", arguments={"path": "foo"})],
        security={"classification": "internal"}
    )
    rule = HighRiskToolRule()
    engine = PolicyEngine(allow_tools_by_agent={"agent": ["read_file"]}, rules=[rule])
    decision = engine.evaluate(env)
    assert decision.allowed
