#!/usr/bin/env python3
"""CI gate to enforce presence of segment governance policy guardrails."""

from pathlib import Path
import sys

REQUIRED_FIELDS = [
    "allowed_features:",
    "prohibited_inferences:",
    "requirements:",
    "segment_level_only",
    "uncertainty_bounds_required",
    "provenance_required",
]


def main() -> int:
    policy_path = Path("policy/segment_governance.yaml")
    if not policy_path.exists():
        print("segment_policy_gate: missing policy/segment_governance.yaml")
        return 1

    content = policy_path.read_text(encoding="utf-8")
    missing = [field for field in REQUIRED_FIELDS if field not in content]
    if missing:
        print("segment_policy_gate: missing required fields:")
        for field in missing:
            print(f"- {field}")
        return 1

    print("segment_policy_gate: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
