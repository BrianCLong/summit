from __future__ import annotations

import re
from typing import Dict, List, Tuple

from .model import MAX_TIMEOUT_SECONDS, JobSpec


class PolicyResult:
    def __init__(self, allowed: bool, reasons: List[str]):
        self.allowed = allowed
        self.reasons = reasons

    @classmethod
    def ok(cls) -> "PolicyResult":
        return cls(True, [])

    @classmethod
    def deny(cls, reasons: List[str]) -> "PolicyResult":
        return cls(False, reasons)


DESTRUCTIVE_PATTERNS = [
    re.compile(r"rm\s+-rf\s+/"),
    re.compile(r":\(\)\{:\|:&\};:"),
]

SUPPORTED_POLICIES = {
    "owner-present",
    "no-destruction",
    "prod-requires-approval",
    "max-step-timeout",
}


def evaluate_policies(spec: JobSpec) -> PolicyResult:
    reasons: List[str] = []
    required = spec.required_policies or list(SUPPORTED_POLICIES)

    if "owner-present" in required and not spec.owner:
        reasons.append("owner-present: job owner is required")

    if "prod-requires-approval" in required and spec.environment.lower() == "prod":
        if not spec.metadata.get("prod_approved"):
            reasons.append("prod-requires-approval: production jobs require metadata.prod_approved=true")

    if "no-destruction" in required:
        for step in spec.steps:
            for pattern in DESTRUCTIVE_PATTERNS:
                if pattern.search(step.command):
                    reasons.append(f"no-destruction: step {step.id} command blocked by policy")
                    break

    if "max-step-timeout" in required:
        for step in spec.steps:
            if step.timeout_seconds > MAX_TIMEOUT_SECONDS:
                reasons.append(
                    f"max-step-timeout: step {step.id} timeout {step.timeout_seconds}s exceeds {MAX_TIMEOUT_SECONDS}s"
                )

    allowed = len(reasons) == 0
    return PolicyResult(allowed=allowed, reasons=reasons)


def validate_required_policies(required: List[str]) -> Tuple[bool, List[str]]:
    unknown = [policy for policy in required if policy not in SUPPORTED_POLICIES]
    if unknown:
        return False, [f"unsupported policy: {policy}" for policy in unknown]
    return True, []
