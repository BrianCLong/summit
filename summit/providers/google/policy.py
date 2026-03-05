from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PolicyEnforcementResult:
    """Deterministic policy enforcement result for enterprise provider execution."""

    allowed: bool
    policy_status: str
    violations: tuple[str, ...]


def enforce_admin_policy(policy: dict[str, Any] | None) -> PolicyEnforcementResult:
    """Apply deny-by-default behavior when no validated policy is provided."""

    if policy is None:
        return PolicyEnforcementResult(
            allowed=False,
            policy_status="missing",
            violations=("GEM-ENT-POLICY-001",),
        )

    return PolicyEnforcementResult(
        allowed=True,
        policy_status="enforced",
        violations=(),
    )
