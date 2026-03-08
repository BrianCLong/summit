from dataclasses import dataclass


@dataclass(frozen=True)
class CompFeatDecision:
  allowed: bool
  reason: str

def evaluate_compfeat(actor: dict, request: dict, flags: dict) -> CompFeatDecision:
  # Deny-by-default unless explicitly enabled and actor is authorized.
  if not flags.get("compfeat_enabled", False):
    return CompFeatDecision(False, "feature_flag_disabled")
  if actor.get("role") not in {"admin", "trusted_tester"}:
    return CompFeatDecision(False, "actor_not_authorized")
  return CompFeatDecision(True, "ok")
