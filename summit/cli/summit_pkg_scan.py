"""CLI entry point for Unity package scanning."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from summit.pkg.unity_adapter import parse_unity_package, write_artifacts


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scan a Unity package manifest")
    parser.add_argument("manifest", type=Path, help="Path to Unity package.json")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("artifacts"),
        help="Directory where deterministic report artifacts are written",
    )
    return parser


def main() -> int:
    args = _parser().parse_args()
    report = parse_unity_package(args.manifest)
    write_artifacts(report, args.output_dir)
    print(json.dumps({"evidence_id": report["evidence_id"], "output_dir": str(args.output_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
