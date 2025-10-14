"""Command line helper for diffing slice versions."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .registry import SliceRegistry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Diff slice versions stored in the registry")
    parser.add_argument("name", help="Slice name")
    parser.add_argument("baseline", help="Baseline version identifier")
    parser.add_argument("candidate", help="Candidate version identifier")
    parser.add_argument(
        "--store",
        type=Path,
        default=Path(__file__).resolve().parent / "store",
        help="Path to the slice registry store directory",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine readable JSON output")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    registry = SliceRegistry(args.store)
    diff_result = registry.diff(args.name, args.baseline, args.candidate)
    if args.json:
        print(json.dumps(diff_result, indent=2, sort_keys=True))
    else:
        print(f"Diff for slice '{args.name}': {args.baseline} -> {args.candidate}")
        print(f"  Added ({len(diff_result['added'])}): {', '.join(diff_result['added']) or '∅'}")
        print(f"  Removed ({len(diff_result['removed'])}): {', '.join(diff_result['removed']) or '∅'}")
        print(f"  Unchanged ({len(diff_result['unchanged'])}): {len(diff_result['unchanged'])}")


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
