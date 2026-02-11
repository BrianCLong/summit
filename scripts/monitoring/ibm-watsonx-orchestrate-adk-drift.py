#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_stamp(path: Path) -> dict:
    return json.loads(path.read_text())


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect S-ADK evidence drift.")
    parser.add_argument("--runs-dir", default="artifacts/agent-runs", help="Path to agent runs directory.")
    args = parser.parse_args()

    runs_dir = Path(args.runs_dir)
    if not runs_dir.exists():
        print(f"runs-dir missing: {runs_dir}")
        return 2

    run_dirs = sorted([p for p in runs_dir.iterdir() if p.is_dir()])
    if len(run_dirs) < 2:
        print("insufficient runs for drift detection")
        return 0

    latest = run_dirs[-1]
    previous = run_dirs[-2]
    latest_stamp = load_stamp(latest / "stamp.json")
    previous_stamp = load_stamp(previous / "stamp.json")

    keys = ["manifest_digest", "fixture_digest", "trace_digest", "result_digest", "metrics_digest"]
    drift = {key: {"previous": previous_stamp.get(key), "latest": latest_stamp.get(key)} for key in keys}
    mismatches = [key for key, value in drift.items() if value["previous"] != value["latest"]]

    report = {
        "latest": str(latest),
        "previous": str(previous),
        "mismatches": mismatches,
        "digests": drift,
    }
    print(json.dumps(report, indent=2))

    return 1 if mismatches else 0


if __name__ == "__main__":
    raise SystemExit(main())
