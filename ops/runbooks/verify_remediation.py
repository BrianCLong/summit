#!/usr/bin/env python3
"""Verification hook to ensure remediation artifacts exist and completed."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

METADATA_DIR = Path("ops/runbooks/generated/alerts")
VERIFICATION_DIR = Path("ops/runbooks/generated/verification")


def load_json(path: Path) -> dict[str, Any]:
    with open(path) as handle:
        return json.load(handle)


def verify(alert_name: str) -> bool:
    metadata_path = METADATA_DIR / f"{alert_name}.json"
    verification_path = VERIFICATION_DIR / f"{alert_name}.json"

    missing: list[str] = []
    if not metadata_path.exists():
        missing.append(str(metadata_path))
    if not verification_path.exists():
        missing.append(str(verification_path))

    if missing:
        print("❌ Missing artifacts:")
        for path in missing:
            print(f" - {path}")
        return False

    metadata = load_json(metadata_path)
    verification = load_json(verification_path)

    checks = [
        verification.get("execution_status") == "completed",
        metadata.get("alert") == verification.get("alert"),
        verification.get("pagerduty_escalation_checked") is True,
    ]

    if all(checks):
        print("✅ Verification passed")
        print(f"Alert: {alert_name}")
        print(f"Proposal: {verification.get('proposal_id')}")
        return True

    print("❌ Verification failed")
    print(json.dumps({"metadata": metadata, "verification": verification}, indent=2))
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify remediation execution for an alert")
    parser.add_argument("alert_name", help="Alert name to verify")
    args = parser.parse_args()

    success = verify(args.alert_name)
    raise SystemExit(0 if success else 1)


if __name__ == "__main__":
    main()
