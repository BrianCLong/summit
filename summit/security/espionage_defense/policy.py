from dataclasses import dataclass
from typing import Dict, Any, List, Optional

@dataclass(frozen=True)
class GateDecision:
  allow: bool
  reasons: List[str]
  risk_score: float

class SecurityGate:
  """
  Deny-by-default for high-risk actions unless explicitly allowed by policy.
  """
  def __init__(self, *, config: Dict[str, Any]):
    self.config = config

  def check(self, *, event: Dict[str, Any], signals: Dict[str, Any]) -> GateDecision:
    action = event.get("action", "")
    # Default allow low-risk actions
    if action in self.config.get("allow_actions", []):
      return GateDecision(True, [], 0.0)

    # Deny sensitive actions when any high-risk signal is present
    sensitive = action in self.config.get("sensitive_actions", [])
    high_risk = bool(signals.get("persona_mimicry")) or bool(signals.get("deception_pattern")) or bool(signals.get("exfil_intent"))
    if sensitive and high_risk:
      reasons = []
      if signals.get("persona_mimicry"): reasons.append("persona_mimicry")
      if signals.get("deception_pattern"): reasons.append("deception_pattern")
      if signals.get("exfil_intent"): reasons.append("exfil_intent")
      return GateDecision(False, reasons, float(signals.get("risk_score", 0.9)))

    return GateDecision(True, [], float(signals.get("risk_score", 0.0)))
