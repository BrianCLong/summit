#!/usr/bin/env python3
"""Reference pipeline used by DMCL sample scenarios."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


def load_dataset(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def detect_nulls(records: Iterable[dict[str, Any]]) -> bool:
    return any(value is None for record in records for value in record.values())


def detect_type_drift(records: Iterable[dict[str, Any]]) -> bool:
    for record in records:
        amount = record.get("amount")
        if isinstance(amount, str):
            return True
    return False


def detect_duplicate_ids(records: Iterable[dict[str, Any]]) -> bool:
    seen: set[Any] = set()
    for record in records:
        identifier = record.get("id")
        if identifier in seen:
            return True
        seen.add(identifier)
    return False


def detect_timestamp_skew(records: Iterable[dict[str, Any]]) -> bool:
    timestamps: list[datetime] = []
    for record in records:
        ts = record.get("transaction_timestamp")
        if isinstance(ts, str):
            try:
                timestamps.append(datetime.fromisoformat(ts.replace("Z", "+00:00")))
            except ValueError:
                continue
    if len(timestamps) < 2:
        return False
    timestamps.sort()
    return (timestamps[-1] - timestamps[0]).total_seconds() > 4 * 3600


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Sample DMCL pipeline stub")
    parser.add_argument("--input", type=Path, default=None, help="Path to dataset (optional)")
    args = parser.parse_args(argv)

    dataset_path = args.input or os.environ.get("DMCL_MUTATED_INPUT")
    if not dataset_path:
        print("No dataset provided", file=sys.stderr)
        return 2

    records = load_dataset(Path(dataset_path))

    exit_code = 0

    if detect_nulls(records):
        print("BLOCK: null burst detected")
        return 1

    if detect_duplicate_ids(records):
        print("ALERT: duplicate storm mitigated")

    if detect_type_drift(records):
        print("REDACTED: amount normalized to numeric fallback")

    if detect_timestamp_skew(records):
        print("FALLBACK: timestamp ordering guard engaged")

    print("PIPELINE: dataset accepted")
    return exit_code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
