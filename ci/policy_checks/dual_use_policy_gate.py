#!/usr/bin/env python3
"""CI gate to enforce presence of dual-use policy guardrails."""

from pathlib import Path
import sys

REQUIRED_LINES = [
    "No adversarial optimization",
    "No individual cognitive scoring",
    "Policy gates",
    "Audit & provenance",
]


def main() -> int:
    policy_path = Path("policy/dual_use_policy.md")
    if not policy_path.exists():
        print("dual_use_policy_gate: missing policy/dual_use_policy.md")
        return 1

    content = policy_path.read_text(encoding="utf-8")
    missing = [line for line in REQUIRED_LINES if line not in content]
    if missing:
        print("dual_use_policy_gate: missing required statements:")
        for line in missing:
            print(f"- {line}")
        return 1

    print("dual_use_policy_gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
