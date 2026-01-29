from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass(frozen=True)
class GateDecision:
  allow: bool
  reasons: List[str]
  risk_score: float

class InfluenceOpsGate:
  """
  Deny-by-default for high-risk influence behaviors (precision influence, profiling, campaign-mode).
  """
  def __init__(self, *, config: Dict[str, Any]):
    self.config = config

  def check(self, *, event: Dict[str, Any], signals: Dict[str, Any]) -> GateDecision:
    action = event.get("action", "")
    sensitive = action in self.config.get("sensitive_actions", ["generate_persuasion","bulk_message_send","ad_copy_variants"])

    # High-risk signals (all optional; detectors populate)
    microtargeting = bool(signals.get("microtargeting_intent"))
    profiling = bool(signals.get("profiling_intent"))
    campaign_mode = bool(signals.get("campaign_mode"))

    if sensitive and (microtargeting or profiling or campaign_mode):
      reasons = []
      if microtargeting: reasons.append("microtargeting_intent")
      if profiling: reasons.append("profiling_intent")
      if campaign_mode: reasons.append("campaign_mode")
      return GateDecision(False, reasons, float(signals.get("risk_score", 0.9)))

    return GateDecision(True, [], float(signals.get("risk_score", 0.0)))
