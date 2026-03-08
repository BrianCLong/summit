from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


class EnterprisePolicyError(ValueError):
    """Raised when enterprise policy requirements are not satisfied."""


@dataclass(frozen=True)
class EnterprisePolicy:
    workspace_bound: bool
    policy_status: str
    controls: tuple[str, ...]


def parse_enterprise_policy(raw_policy: Mapping[str, Any] | None) -> EnterprisePolicy:
    """Parse enterprise policy configuration using deny-by-default semantics."""
    if raw_policy is None:
        raise EnterprisePolicyError("Enterprise admin policy missing; execution denied by default")

    workspace_bound = bool(raw_policy.get("workspace_bound"))
    if not workspace_bound:
        raise EnterprisePolicyError("Workspace binding required for enterprise execution")

    controls_value = raw_policy.get("controls", ())
    if not isinstance(controls_value, (list, tuple)):
        raise EnterprisePolicyError("Policy controls must be a list or tuple")

    controls = tuple(str(control) for control in controls_value)
    return EnterprisePolicy(
        workspace_bound=True,
        policy_status="enforced",
        controls=controls,
    )
