#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

import yaml

REQUIRED_TOP_LEVEL = {
    "version",
    "policy",
    "enabled",
    "deny_by_default",
    "default_provider",
    "providers",
    "budgets",
}


def main() -> int:
    policy_path = Path("summit/policies/flex_node_policy.yaml")
    doc = yaml.safe_load(policy_path.read_text(encoding="utf-8"))

    missing = sorted(REQUIRED_TOP_LEVEL - set(doc.keys()))
    if missing:
        raise SystemExit(f"policy-schema-validate: missing keys: {missing}")

    if doc["deny_by_default"] is not True:
        raise SystemExit("policy-schema-validate: deny_by_default must be true")

    providers = doc["providers"]
    if not providers:
        raise SystemExit("policy-schema-validate: providers cannot be empty")

    for name, provider in providers.items():
        if not provider.get("allowed_families"):
            raise SystemExit(
                f"policy-schema-validate: provider {name} has empty allowed_families"
            )

    print("policy-schema-validate: pass")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
