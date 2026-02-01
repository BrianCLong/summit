from dataclasses import dataclass
from typing import Protocol, Dict, Any, Tuple, Optional
import os

@dataclass
class VerificationResult:
  ok: bool
  reason: str
  details: Dict[str, Any]

class ConstraintVerifier(Protocol):
  def verify(self, draft: str, context: Dict[str, Any]) -> VerificationResult: ...

def draft_verify_refine(draft_fn, refine_fn, verifier: ConstraintVerifier, context: Dict[str, Any]) -> Tuple[str, VerificationResult]:
  draft = draft_fn(context)

  if os.environ.get("TRUST_DVR_ENABLED", "0") != "1":
      # Feature flag off - return draft without verification
      return draft, VerificationResult(ok=True, reason="Disabled", details={})

  vr = verifier.verify(draft, context)
  if vr.ok:
    return draft, vr

  refined = refine_fn(draft, vr, context)
  vr2 = verifier.verify(refined, context)

  # If still invalid, we return the refined result but the VR will indicate failure.
  # The caller must check VR.
  return refined, vr2
