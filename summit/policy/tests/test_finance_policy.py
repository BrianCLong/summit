import json
from pathlib import Path

import pytest

from summit.policy.finance_engine import create_finance_engine
from summit.protocols.envelope import SummitEnvelope, ToolCall

FIXTURES_DIR = Path("summit/policy/fixtures")

def load_fixture(name):
    return json.loads((FIXTURES_DIR / name).read_text())

def test_finance_deny_all():
    fixture = load_fixture("finance_deny_all.json")

    # Construct envelope from fixture
    env = SummitEnvelope(
        message_id="msg_1",
        conversation_id="conv_1",
        sender=fixture["sender"],
        recipient=fixture["recipient"],
        intent="REQUEST",
        tool_calls=[ToolCall(**tc) for tc in fixture["tool_calls"]],
        security=fixture["security"]
    )

    engine = create_finance_engine(
        allow_tools_by_agent={fixture["sender"]: fixture["allowed_tools"]}
    )

    decision = engine.evaluate(env)

    assert decision.allowed == fixture["expected_allowed"]
    if not decision.allowed:
        assert any(fixture["expected_reason"] in r for r in decision.reasons)

def test_finance_allow_readonly():
    fixture = load_fixture("finance_allow_readonly.json")

    env = SummitEnvelope(
        message_id="msg_2",
        conversation_id="conv_2",
        sender=fixture["sender"],
        recipient=fixture["recipient"],
        intent="REQUEST",
        tool_calls=[ToolCall(**tc) for tc in fixture["tool_calls"]],
        security=fixture["security"]
    )

    engine = create_finance_engine(
        allow_tools_by_agent={fixture["sender"]: fixture["allowed_tools"]}
    )

    decision = engine.evaluate(env)

    assert decision.allowed == fixture["expected_allowed"]

def test_tool_not_allowed():
    # Test built-in engine logic
    engine = create_finance_engine(allow_tools_by_agent={"agent_x": ["allowed_tool"]})

    env = SummitEnvelope(
        message_id="msg_3",
        conversation_id="conv_3",
        sender="agent_x",
        recipient="executor",
        intent="REQUEST",
        tool_calls=[ToolCall(name="forbidden_tool", arguments={})],
        security={"classification": "INTERNAL"}
    )

    decision = engine.evaluate(env)
    assert not decision.allowed
    assert "tool_not_allowed:forbidden_tool" in decision.reasons

def test_hitl_approval_allows_sensitive():
    # If HITL approved, even sensitive actions should be allowed (if tool allowed)
    engine = create_finance_engine(allow_tools_by_agent={"agent_finance": ["transfer_funds"]})

    env = SummitEnvelope(
        message_id="msg_4",
        conversation_id="conv_4",
        sender="agent_finance",
        recipient="executor",
        intent="REQUEST",
        tool_calls=[ToolCall(name="transfer_funds", arguments={})],
        security={
            "classification": "FINANCIAL_SENSITIVE",
            "hitl_approved": True
        }
    )

    decision = engine.evaluate(env)
    assert decision.allowed
