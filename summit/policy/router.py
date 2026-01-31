from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass(frozen=True)
class PolicyDecision:
    policy_id: str
    mode: str  # "baseline" | "skill_preserving"
    reasons: list[str] = field(default_factory=list)

def route(context: dict[str, Any]) -> PolicyDecision:
    """
    Deny-by-default: only enable skill_preserving when explicitly requested
    or when context indicates 'learning/new domain' AND org allows it.
    """
    flags = context.get("feature_flags", {})

    # Check if Skill Preserving Mode is enabled via feature flag
    if not flags.get("SKILL_PRESERVING_MODE", False):
        return PolicyDecision(
            policy_id="POL-BASELINE",
            mode="baseline",
            reasons=["flag_off"]
        )

    org_policy = context.get("org_policy") or {}
    if not org_policy.get("allow_skill_preserving", False):
        return PolicyDecision(
            policy_id="POL-BASELINE",
            mode="baseline",
            reasons=["org_policy_deny"]
        )

    user_settings = context.get("user_settings") or {}
    if not user_settings.get("opt_in_skill_preserving", False):
        return PolicyDecision(
            policy_id="POL-BASELINE",
            mode="baseline",
            reasons=["user_opt_out"]
        )

    return PolicyDecision(
        policy_id="POL-SKILL-PRESERVE",
        mode="skill_preserving",
        reasons=["flag_on"]
    )
