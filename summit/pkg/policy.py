"""Registry policy enforcement for Unity package metadata."""

from __future__ import annotations

from dataclasses import dataclass

import yaml


class RegistryPolicyError(ValueError):
    """Raised when registry policy validation fails."""


@dataclass(frozen=True)
class RegistryPolicy:
    allowed_scopes: list[str]
    blocked_registries: list[str]
    enforce_https: bool = True

    @classmethod
    def from_yaml(cls, raw: str) -> RegistryPolicy:
        payload = yaml.safe_load(raw) or {}
        return cls(
            allowed_scopes=list(payload.get("allowed_scopes", [])),
            blocked_registries=list(payload.get("blocked_registries", [])),
            enforce_https=bool(payload.get("enforce_https", True)),
        )


def validate_registry_url(registry_url: str, policy: RegistryPolicy) -> None:
    if policy.enforce_https and registry_url.startswith("http://"):
        raise RegistryPolicyError("Registry URL must use https")

    for blocked_prefix in policy.blocked_registries:
        if registry_url.startswith(blocked_prefix):
            raise RegistryPolicyError(f"Registry URL uses blocked prefix: {blocked_prefix}")


def validate_package_scope(package_name: str, policy: RegistryPolicy) -> None:
    if not policy.allowed_scopes:
        raise RegistryPolicyError("No allowed scopes configured in registry policy")

    normalized_patterns = [scope.rstrip("*") for scope in policy.allowed_scopes]
    if not any(package_name.startswith(pattern) for pattern in normalized_patterns):
        raise RegistryPolicyError(f"Package scope is not allowed: {package_name}")
