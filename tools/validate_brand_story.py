#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REQUIRED = [
    "evidence/index.json",
    "evidence/brand_story/report.json",
    "evidence/brand_story/metrics.json",
    "evidence/brand_story/stamp.json",
    "evidence/brand_story/plan.json",
    "evidence/brand_story/hooks.json",
]

def main() -> int:
    missing = [p for p in REQUIRED if not Path(p).exists()]
    if missing:
        print("Missing required evidence files:")
        for m in missing:
            print(f" - {m}")
        return 2

    # Minimal sanity: index must be valid JSON and map EVD IDs to files.
    try:
        idx = json.loads(Path("evidence/index.json").read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error reading evidence/index.json: {e}")
        return 3

    if not isinstance(idx, dict) or "items" not in idx:
        print("evidence/index.json must contain top-level key 'items'")
        return 3

    # Check that our IDs are present
    required_ids = [
        "EVD-SPB500250-REPORT-001",
        "EVD-SPB500250-SCHEMA-001",
        "EVD-SPB500250-PLAN-001",
        "EVD-SPB500250-HOOKS-001",
        "EVD-SPB500250-POLICY-001"
    ]

    missing_ids = [rid for rid in required_ids if rid not in idx["items"]]
    if missing_ids:
        print(f"Missing IDs in evidence/index.json: {missing_ids}")
        return 4

    print("Brand Story validation passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
