#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Profile DeR2 benchmark overhead")
    parser.add_argument("--report", required=True, help="Path to report.json")
    parser.add_argument("--output", required=True, help="Path to profile.json")
    args = parser.parse_args()

    report_path = Path(args.report)
    report = json.loads(report_path.read_text())

    instance_count = len(report)
    evidence_count = sum(len(entry.get("evidence", [])) for entry in report)

    profile = {
        "instance_count": instance_count,
        "evidence_count": evidence_count,
        "estimated_overhead_ms": 0,
    }

    Path(args.output).write_text(json.dumps(profile, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
