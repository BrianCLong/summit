import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

# Setup logging
logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class PolicyDecision:
    policy_id: str
    mode: str  # "baseline" | "skill_preserving"
    reasons: list[str] = field(default_factory=list)

@dataclass(frozen=True)
class RoutingDecision:
    provider_id: str
    model_id: str
    fallback_provider_id: str | None = None
    reason: str = "default"

def route(context: Any) -> PolicyDecision:
    """
    Deny-by-default: only enable skill_preserving when explicitly requested
    or when context indicates 'learning/new domain' AND org allows it.
    """
    if not isinstance(context, dict):
        logger.error("Invalid context type: expected dict, got %s", type(context))
        return PolicyDecision(
            policy_id="POL-ERROR",
            mode="baseline",
            reasons=["invalid_context"]
        )

    flags = context.get("feature_flags", {})
    if not isinstance(flags, dict):
        flags = {}

    # Check if Skill Preserving Mode is enabled via feature flag
    if not flags.get("SKILL_PRESERVING_MODE", False):
        logger.debug("SPM disabled: feature flag SKILL_PRESERVING_MODE is False")
        return PolicyDecision(
            policy_id="POL-BASELINE",
            mode="baseline",
            reasons=["flag_off"]
        )

    org_policy = context.get("org_policy") or {}
    if not isinstance(org_policy, dict) or not org_policy.get("allow_skill_preserving", False):
        logger.info("SPM denied: org policy does not allow skill preserving")
        return PolicyDecision(
            policy_id="POL-BASELINE",
            mode="baseline",
            reasons=["org_policy_deny"]
        )

    user_settings = context.get("user_settings") or {}
    if not isinstance(user_settings, dict) or not user_settings.get("opt_in_skill_preserving", False):
        logger.info("SPM denied: user has not opted in")
        return PolicyDecision(
            policy_id="POL-BASELINE",
            mode="baseline",
            reasons=["user_opt_out"]
        )

    logger.info("SPM enabled: all policies satisfied")
    return PolicyDecision(
        policy_id="POL-SKILL-PRESERVE",
        mode="skill_preserving",
        reasons=["flag_on"]
    )

def route_request(request: Any, context: Any) -> RoutingDecision:
    """
    Routes a request to a specific provider based on policy.
    Anti-lock-in logic: prefer user choice, fallback to widely available providers.
    """
    if not isinstance(request, dict):
        logger.warning("Invalid request type: expected dict, got %s. Using defaults.", type(request))
        request = {}

    preferred_provider = request.get("preferred_provider")
    model = request.get("model", "gpt-4")

    if preferred_provider == "azure-foundry":
         return RoutingDecision(
             provider_id="azure-foundry",
             model_id=model,
             fallback_provider_id="openai",
             reason="user_preference"
         )

    # Check if model implies a provider
    if isinstance(model, str) and "azure" in model:
         return RoutingDecision(
             provider_id="azure-foundry",
             model_id=model,
             reason="model_name_implication"
         )

    return RoutingDecision(
        provider_id="openai",
        model_id=model,
        reason="default"
    )
