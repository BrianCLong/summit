#!/usr/bin/env python3
"""Detect decentralized AI metric drift from baseline and current metrics JSON files."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from summit.subsumption.decentralized_ai.drift import detect_drift


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", required=True, type=Path)
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--threshold", type=float, default=0.1)
    args = parser.parse_args()

    baseline_payload = json.loads(args.baseline.read_text(encoding="utf-8"))
    current_payload = json.loads(args.current.read_text(encoding="utf-8"))

    baseline = baseline_payload.get("metrics", baseline_payload)
    current = current_payload.get("metrics", current_payload)
    drift_report = detect_drift(baseline=baseline, current=current, threshold=args.threshold)

    args.output.write_text(json.dumps(drift_report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return 1 if drift_report["triggered"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
