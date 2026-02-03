from summit.policy.engine import PolicyEngine
from summit.protocols.envelope import SummitEnvelope, ToolCall


def test_denies_unlisted_tool():
  engine = PolicyEngine(allow_tools_by_agent={"agentA": ["tool.safe"]})
  env = SummitEnvelope(
    message_id="m1", conversation_id="c1",
    sender="agentA", recipient="orchestrator",
    intent="REQUEST",
    tool_calls=[ToolCall(name="tool.danger", arguments={})],
    security={"classification": "internal"}
  )
  decision = engine.evaluate(env)
  assert decision.allowed is False
  assert "tool_not_allowed:tool.danger" in decision.reasons

def test_denies_missing_classification():
  engine = PolicyEngine(allow_tools_by_agent={"agentA": ["tool.safe"]})
  env = SummitEnvelope(
    message_id="m2", conversation_id="c1",
    sender="agentA", recipient="orchestrator",
    intent="REQUEST",
    tool_calls=[ToolCall(name="tool.safe", arguments={})],
    security={}
  )
  decision = engine.evaluate(env)
  assert decision.allowed is False
  assert "missing_classification" in decision.reasons

def test_allows_listed_tool_with_classification():
  engine = PolicyEngine(allow_tools_by_agent={"agentA": ["tool.safe"]})
  env = SummitEnvelope(
    message_id="m3", conversation_id="c1",
    sender="agentA", recipient="orchestrator",
    intent="REQUEST",
    tool_calls=[ToolCall(name="tool.safe", arguments={})],
    security={"classification": "internal"}
  )
  decision = engine.evaluate(env)
  assert decision.allowed is True
