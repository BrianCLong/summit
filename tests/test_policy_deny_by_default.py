from summit.policy.engine import PolicyEngine
from summit.protocols.envelope import SummitEnvelope, ToolCall


def test_policy_denies_missing_allowlist_and_classification() -> None:
  engine = PolicyEngine(allow_tools_by_agent={"agent-a": ["allowed"]})
  env = SummitEnvelope(
    message_id="m1",
    conversation_id="c1",
    sender="agent-a",
    recipient="router",
    intent="REQUEST",
    tool_calls=[ToolCall(name="denied", arguments={})],
    security={},
  )

  decision = engine.evaluate(env)

  assert decision.allowed is False
  assert "tool_not_allowed:denied" in decision.reasons
  assert "missing_classification" in decision.reasons


def test_policy_allows_explicit_tool_and_classification() -> None:
  engine = PolicyEngine(allow_tools_by_agent={"agent-a": ["allowed"]})
  env = SummitEnvelope(
    message_id="m2",
    conversation_id="c2",
    sender="agent-a",
    recipient="router",
    intent="REQUEST",
    tool_calls=[ToolCall(name="allowed", arguments={})],
    security={"classification": "internal"},
  )

  decision = engine.evaluate(env)

  assert decision.allowed is True
  assert decision.reasons == []
