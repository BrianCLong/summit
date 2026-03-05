from __future__ import annotations

from typing import Any, Dict, List

from .decisions import PolicyDecision

DEFAULT_POLICY_REFS = {
    "human_approval": "policy.external_publish.human_approval",
    "simulate_only": "policy.simulate_only.allow",
    "deny_default": "policy.default.deny",
}


def evaluate_intervention(intervention: dict[str, Any]) -> PolicyDecision:
    explanations: list[str] = []
    policy_refs: list[str] = []

    channel = intervention.get("channel")
    if channel == "external_publish" and not intervention.get("human_approval"):
        explanations.append("external publishing requires explicit human approval")
        policy_refs.append(DEFAULT_POLICY_REFS["human_approval"])
        return PolicyDecision("deny", explanations, policy_refs)

    if intervention.get("simulate_only") is True:
        explanations.append("simulate-only intervention allowed")
        policy_refs.append(DEFAULT_POLICY_REFS["simulate_only"])
        return PolicyDecision("allow", explanations, policy_refs)

    explanations.append("no matching allow policy; deny by default")
    policy_refs.append(DEFAULT_POLICY_REFS["deny_default"])
    return PolicyDecision("deny", explanations, policy_refs)
