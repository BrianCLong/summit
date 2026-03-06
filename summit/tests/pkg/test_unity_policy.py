from __future__ import annotations

from pathlib import Path

import pytest

from summit.pkg.policy import (
    RegistryPolicy,
    RegistryPolicyError,
    validate_package_scope,
    validate_registry_url,
)

POLICY_PATH = Path("policies/registry_policy.yaml")


def test_registry_policy_blocks_http() -> None:
    policy = RegistryPolicy.from_yaml(POLICY_PATH.read_text(encoding="utf-8"))

    with pytest.raises(RegistryPolicyError):
        validate_registry_url("http://packages.company.test", policy)


def test_registry_policy_allows_scoped_package() -> None:
    policy = RegistryPolicy.from_yaml(POLICY_PATH.read_text(encoding="utf-8"))
    validate_package_scope("com.company.analytics", policy)
