from __future__ import annotations

from typing import List

from .model import JobSpec, MAX_TIMEOUT_SECONDS
from .policy import SUPPORTED_POLICIES


class ValidationError(Exception):
    pass


def validate_spec(spec: JobSpec) -> List[str]:
    errors: List[str] = []
    if not spec.name:
        errors.append("name is required")
    if not spec.owner:
        errors.append("owner is required")
    if not spec.environment:
        errors.append("environment is required")
    if not spec.steps:
        errors.append("at least one step is required")
    for step in spec.steps:
        if not step.command:
            errors.append(f"step {step.id} command is required")
        if step.timeout_seconds <= 0:
            errors.append(f"step {step.id} timeout_seconds must be positive")
        if step.timeout_seconds > MAX_TIMEOUT_SECONDS * 2:
            errors.append(
                f"step {step.id} timeout_seconds {step.timeout_seconds} exceeds hard limit {MAX_TIMEOUT_SECONDS * 2}"
            )
        if step.retries < 0:
            errors.append(f"step {step.id} retries must be non-negative")
    for policy in spec.required_policies:
        if policy not in SUPPORTED_POLICIES:
            errors.append(f"unsupported policy declared: {policy}")
    return errors
