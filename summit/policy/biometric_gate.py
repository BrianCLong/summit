from dataclasses import dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class GateDecision:
    allowed: bool
    reason: str


def evaluate(event: Dict[str, Any], policy: Dict[str, Any]) -> GateDecision:
    if not policy.get("enabled", True):
        return GateDecision(True, "gate_disabled")
    cls = event.get("class", "unknown")
    has_consent = bool(event.get("has_consent", False))

    allowed_by_class = policy["classes"].get(cls, "deny") == "allow"
    if not allowed_by_class:
        return GateDecision(False, f"class_denied:{cls}")
    if cls != "command_decode" and not has_consent:
        return GateDecision(False, "consent_required")
    return GateDecision(True, "allowed")
