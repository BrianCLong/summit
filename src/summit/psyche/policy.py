from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

AllowedPurpose = Literal["situational_awareness", "research_eval", "redteam_defense"]

@dataclass(frozen=True)
class PolicyContext:
    purpose: AllowedPurpose
    subject_scope: Literal["document", "cohort", "community", "person"]
    contains_biometric: bool = False
    contains_pii: bool = True
    consent_assertion: Optional[str] = None

class PolicyDenied(Exception):
    pass

def enforce_policy(ctx: PolicyContext, flags: dict[str, Any]) -> None:
    """
    Deny-by-default psychographic policy gate.
    flags MUST include:
      - PSYCHE_ENABLED (bool)
      - PSYCHE_ALLOW_PERSON_SCOPE (bool) default False
      - PSYCHE_ALLOW_BIOMETRIC (bool) default False
      - PSYCHE_ALLOW_TARGETING (bool) default False
    """
    if not flags.get("PSYCHE_ENABLED", False):
        raise PolicyDenied("PSYCHE_DISABLED")
    if flags.get("PSYCHE_ALLOW_TARGETING", False):
        raise PolicyDenied("TARGETING_NOT_SUPPORTED")
    if ctx.subject_scope == "person" and not flags.get("PSYCHE_ALLOW_PERSON_SCOPE", False):
        raise PolicyDenied("PERSON_SCOPE_DENIED")
    if ctx.contains_biometric and not flags.get("PSYCHE_ALLOW_BIOMETRIC", False):
        raise PolicyDenied("BIOMETRIC_DENIED")
    if ctx.purpose not in ("situational_awareness", "research_eval", "redteam_defense"):
        raise PolicyDenied("PURPOSE_DENIED")
    if ctx.contains_pii and not ctx.consent_assertion:
        raise PolicyDenied("PII_REQUIRES_CONSENT_ASSERTION")
