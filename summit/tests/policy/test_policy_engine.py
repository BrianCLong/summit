import pytest
from summit.policy.engine import PolicyEngine, PolicyDecision
from summit.protocols.envelope import SummitEnvelope
from typing import List

class MockRule:
    def check(self, env: SummitEnvelope) -> List[str]:
        # 'metadata' doesn't exist on SummitEnvelope, so we use 'security' for arbitrary properties in this mock
        if env.security.get("risk") == "high":
            return ["risk_too_high"]
        return []

class TestPolicyEngine:
    def test_allow_explicit_tools(self):
        allow_list = {"agent-a": ["tool-x"]}
        engine = PolicyEngine(allow_tools_by_agent=allow_list)

        # Mock envelope
        env = SummitEnvelope(
            message_id="msg-1",
            conversation_id="conv-1",
            sender="agent-a",
            recipient="agent-b",
            intent="REQUEST",
            tool_calls=[type("ToolCall", (), {"name": "tool-x"})],
            security={"classification": "public"}
        )

        decision = engine.evaluate(env)
        assert decision.allowed is True
        assert len(decision.reasons) == 0

    def test_deny_unlisted_tools(self):
        allow_list = {"agent-a": ["tool-x"]}
        engine = PolicyEngine(allow_tools_by_agent=allow_list)

        env = SummitEnvelope(
            message_id="msg-2",
            conversation_id="conv-1",
            sender="agent-a",
            recipient="agent-b",
            intent="REQUEST",
            tool_calls=[type("ToolCall", (), {"name": "tool-y"})],
            security={"classification": "public"}
        )

        decision = engine.evaluate(env)
        assert decision.allowed is False
        assert "tool_not_allowed:tool-y" in decision.reasons

    def test_require_classification(self):
        allow_list = {"agent-a": ["tool-x"]}
        engine = PolicyEngine(allow_tools_by_agent=allow_list)

        env = SummitEnvelope(
            message_id="msg-3",
            conversation_id="conv-1",
            sender="agent-a",
            recipient="agent-b",
            intent="REQUEST",
            tool_calls=[type("ToolCall", (), {"name": "tool-x"})],
            security={} # Missing classification
        )

        decision = engine.evaluate(env)
        assert decision.allowed is False
        assert "missing_classification" in decision.reasons

    def test_pluggable_rules(self):
        allow_list = {"agent-a": ["tool-x"]}
        engine = PolicyEngine(allow_tools_by_agent=allow_list, rules=[MockRule()])

        env = SummitEnvelope(
            message_id="msg-4",
            conversation_id="conv-1",
            sender="agent-a",
            recipient="agent-b",
            intent="REQUEST",
            tool_calls=[type("ToolCall", (), {"name": "tool-x"})],
            security={"classification": "public", "risk": "high"}
        )

        decision = engine.evaluate(env)
        assert decision.allowed is False
        assert "risk_too_high" in decision.reasons
