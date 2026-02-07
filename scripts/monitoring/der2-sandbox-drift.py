#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Detect drift in DeR2 sandbox metrics")
    parser.add_argument("--baseline", required=True, help="Path to baseline metrics.json")
    parser.add_argument("--current", required=True, help="Path to current metrics.json")
    parser.add_argument("--output", required=True, help="Output drift report path")
    args = parser.parse_args()

    baseline = json.loads(Path(args.baseline).read_text())
    current = json.loads(Path(args.current).read_text())

    drift = {
        "bench_id": current.get("bench_id"),
        "model": current.get("model"),
        "accuracy_delta": {},
        "regime_gap_delta": {},
    }

    for key, value in current.get("accuracy", {}).items():
        drift["accuracy_delta"][key] = value - baseline.get("accuracy", {}).get(key, 0.0)

    for key, value in current.get("regime_gap", {}).items():
        drift["regime_gap_delta"][key] = value - baseline.get("regime_gap", {}).get(key, 0.0)

    Path(args.output).write_text(json.dumps(drift, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    main()
