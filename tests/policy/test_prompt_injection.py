import json
from pathlib import Path

import pytest

from summit.policy.engine import PolicyEngine
from summit.policy.rules.prompt_injection import PromptInjectionRule
from summit.protocols.envelope import SummitEnvelope, ToolCall

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "prompt_injection"

def load_envelope(filename):
    path = FIXTURES_DIR / filename
    data = json.loads(path.read_text())
    return SummitEnvelope(
        message_id=data["message_id"],
        conversation_id=data["conversation_id"],
        sender=data["sender"],
        recipient=data["recipient"],
        intent=data["intent"],
        text=data["text"],
        tool_calls=[ToolCall(**tc) for tc in data["tool_calls"]],
        security=data["security"]
    )

def test_prompt_injection_blocked():
    env = load_envelope("negative_basic.json")
    rule = PromptInjectionRule()
    engine = PolicyEngine(allow_tools_by_agent={}, rules=[rule])
    decision = engine.evaluate(env)
    assert not decision.allowed
    assert "prompt_injection_detected" in decision.reasons

def test_safe_content_allowed():
    env = load_envelope("positive_basic.json")
    rule = PromptInjectionRule()
    engine = PolicyEngine(allow_tools_by_agent={}, rules=[rule])
    decision = engine.evaluate(env)
    assert decision.allowed
    assert "prompt_injection_detected" not in decision.reasons
