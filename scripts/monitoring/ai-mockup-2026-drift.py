#!/usr/bin/env python3
"""Detect claim drift for ai-mockup-2026 benchmark evidence mappings."""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_FILE = REPO_ROOT / "benchmarks" / "ai-mockup-2026" / "tools.yaml"
CLAIMS_FILE = REPO_ROOT / "benchmarks" / "ai-mockup-2026" / "fixtures" / "ground_truth_claims.json"
DRIFT_FILE = REPO_ROOT / "reports" / "ai-mockup-2026" / "drift_report.json"


def main() -> int:
    import yaml

    tools = yaml.safe_load(TOOLS_FILE.read_text(encoding="utf-8"))["tools"]
    claims = json.loads(CLAIMS_FILE.read_text(encoding="utf-8"))

    missing = []
    for tool in tools:
        evd = tool.get("evidence")
        if evd not in claims:
            missing.append({"tool_id": tool.get("id"), "evidence": evd})

    drift = {
        "benchmark_id": "ai-mockup-2026",
        "missing_evidence_mappings": missing,
        "status": "drift" if missing else "clean",
    }

    DRIFT_FILE.parent.mkdir(parents=True, exist_ok=True)
    DRIFT_FILE.write_text(f"{json.dumps(drift, indent=2, sort_keys=True)}\n", encoding="utf-8")

    if missing:
        print("Drift detected: evidence mismatches found")
        return 1

    print("No drift detected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
