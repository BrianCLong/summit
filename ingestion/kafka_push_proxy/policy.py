"""Policy guard placeholders for kafka push proxy."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PolicyDecision:
    """Result of a policy evaluation."""

    allowed: bool
    reason: str


def evaluate_topic_allowlist(topic: str, allowlist: set[str]) -> PolicyDecision:
    """Apply deny-by-default topic authorization."""

    if topic in allowlist:
        return PolicyDecision(allowed=True, reason="allowed")
    return PolicyDecision(allowed=False, reason="topic_not_allowlisted")
