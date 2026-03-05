#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load_score(metrics_path: Path) -> float:
    payload = json.loads(metrics_path.read_text(encoding="utf-8"))
    if "coordination_score" not in payload:
        raise ValueError("coordination_metrics.json missing coordination_score")
    return float(payload["coordination_score"])


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail CI when coordination score regresses")
    parser.add_argument(
        "--metrics",
        default="artifacts/coordination_metrics.json",
        help="Path to coordination metrics artifact",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.85,
        help="Minimum allowed coordination score",
    )
    args = parser.parse_args()

    metrics_path = Path(args.metrics)
    if not metrics_path.exists():
        print(f"coordination gate failed: metrics artifact missing at {metrics_path}")
        return 1

    score = _load_score(metrics_path)
    print(f"coordination_score={score:.6f} threshold={args.threshold:.6f}")
    if score < args.threshold:
        print("coordination gate failed: score below threshold")
        return 1

    print("coordination gate passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
