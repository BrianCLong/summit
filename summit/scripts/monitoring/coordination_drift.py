#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect weekly coordination score drift")
    parser.add_argument("--trend", default="coordination_trend.json")
    parser.add_argument("--threshold", type=float, default=0.05)
    args = parser.parse_args()

    trend_path = Path(args.trend)
    values = json.loads(trend_path.read_text(encoding="utf-8")) if trend_path.exists() else []
    if len(values) < 2:
        print("coordination drift check skipped: insufficient history")
        return 0

    if values[-2] - values[-1] > args.threshold:
        print("coordination drift alert: downward trend exceeded threshold")
        return 1

    print("coordination drift stable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
