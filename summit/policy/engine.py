from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List
from summit.protocols.envelope import SummitEnvelope

@dataclass(frozen=True)
class PolicyDecision:
  allowed: bool
  reasons: List[str]

class PolicyEngine:
  """
  Deny-by-default.
  Allow requires explicit (agent, tool) allowlist + data-classification constraints.
  """
  def __init__(self, allow_tools_by_agent: Dict[str, List[str]]):
    self._allow = allow_tools_by_agent

  def evaluate(self, env: SummitEnvelope) -> PolicyDecision:
    reasons: List[str] = []
    allowed_tools = set(self._allow.get(env.sender, []))
    for tc in env.tool_calls:
      if tc.name not in allowed_tools:
        reasons.append(f"tool_not_allowed:{tc.name}")
    # Example governance hook: require explicit classification tag
    classification = env.security.get("classification")
    if not classification:
      reasons.append("missing_classification")
    return PolicyDecision(allowed=(len(reasons) == 0), reasons=reasons)
