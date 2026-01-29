from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass(frozen=True)
class GateDecision:
  allow: bool
  reasons: List[str]
  risk_score: float

class CogResGate:
  """
  Defensive cognitive-resilience gate. Blocks:
  - targeted persuasion / microtargeting
  - bulk influence/campaign-mode generation
  - impersonation / synthetic identity
  - recommender manipulation intent
  """
  def __init__(self, *, config: Dict[str, Any]):
    self.config = config

  def check(self, *, event: Dict[str, Any], signals: Dict[str, Any]) -> GateDecision:
    action = event.get("action","")
    sensitive = action in self.config.get("sensitive_actions", [
      "generate_targeted_persuasion","bulk_message_send","narrative_variant_generation","profile_audience"
    ])
    triggers = [k for k in (
      "microtargeting_intent","campaign_mode","impersonation_intent",
      "recommender_manipulation_intent","synthetic_media_risk"
    ) if signals.get(k)]
    if sensitive and triggers:
      return GateDecision(False, triggers, float(signals.get("risk_score", 0.9)))
    return GateDecision(True, [], float(signals.get("risk_score", 0.0)))
