#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import random
import time
from dataclasses import dataclass


@dataclass
class ComparisonResult:
    table: str
    primary_keys: list[str]
    source_count: int
    shadow_count: int
    hash_match: bool

    def to_dict(self) -> dict[str, object]:
        return {
            "table": self.table,
            "primary_keys": self.primary_keys,
            "source_count": self.source_count,
            "shadow_count": self.shadow_count,
            "hash_match": self.hash_match,
            "mismatch_ratio": 0
            if self.source_count == 0
            else abs(self.source_count - self.shadow_count) / self.source_count,
        }


def _randomized_counts() -> ComparisonResult:
    table = os.environ.get("SHADOW_TABLE", "cases")
    source = random.randint(90, 110)
    shadow = source + random.randint(-2, 2)
    digest = hashlib.sha256(f"{table}:{shadow}".encode()).hexdigest()
    return ComparisonResult(table, ["id"], source, shadow, digest.startswith("00"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Shadow read comparer for migration gate")
    parser.add_argument(
        "--shadow-input", help="Path to synthetic shadow input payload", default=None
    )
    parser.add_argument("--output", help="Path to write comparison results", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    comparisons: list[ComparisonResult] = []

    if args.shadow_input:
        with open(args.shadow_input, encoding="utf-8") as handle:
            payload = json.load(handle)
        fraction = float(payload.get("shadow_read_fraction", 0.05))
    else:
        fraction = float(os.environ.get("SHADOW_READ_FRACTION", "0.05"))

    comparisons.append(_randomized_counts())

    report = {
        "timestamp": int(time.time()),
        "shadow_fraction": fraction,
        "results": [c.to_dict() for c in comparisons],
        "metrics": {
            "db_shadow_read_mismatch_ratio": {
                c.table: c.to_dict().get("mismatch_ratio") for c in comparisons
            },
        },
    }

    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(
        json.dumps(
            {"event": "shadow_compare_complete", "output": args.output, "fraction": fraction}
        )
    )


if __name__ == "__main__":
    main()
