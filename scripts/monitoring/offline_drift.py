#!/usr/bin/env python3
"""Offline drift monitor: compare current output hash with expected hash."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys


def hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--expected-hash", required=True)
    parser.add_argument("--current-output", required=True)
    parser.add_argument("--out", default="drift_report.json")
    args = parser.parse_args()

    current_hash = hash_text(args.current_output)
    drift_detected = current_hash != args.expected_hash

    report = {
        "expected_hash": args.expected_hash,
        "current_hash": current_hash,
        "drift_detected": drift_detected,
    }

    out_path = pathlib.Path(args.out)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    if drift_detected:
        print(f"[offline_drift] FAIL: drift detected ({out_path})")
        sys.exit(1)

    print(f"[offline_drift] OK: no drift ({out_path})")


if __name__ == "__main__":
    main()
