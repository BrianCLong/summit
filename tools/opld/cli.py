"""Command line interface for the Output PII Leak Delta Guard (OPLD)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


try:
    from .analysis import compare_paths
    from .detectors import DetectorPipeline
except ImportError:  # pragma: no cover - fallback for direct script execution
    import sys
    from pathlib import Path as _Path

    sys.path.append(str(_Path(__file__).resolve().parent.parent))
    from opld.analysis import compare_paths  # type: ignore
    from opld.detectors import DetectorPipeline  # type: ignore


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Compare model runs for PII leakage deltas")
    parser.add_argument("--baseline", required=True, help="Path to the baseline run log")
    parser.add_argument("--candidate", required=True, help="Path to the candidate run log")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.1,
        help="Leak delta score threshold for failing the CI gate (default: 0.1)",
    )
    parser.add_argument("--output", help="Optional path to write the JSON report")
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty print the JSON report to stdout",
    )
    parser.add_argument(
        "--no-ci-exit",
        action="store_true",
        help="Do not exit with non-zero status on CI gate failure",
    )
    return parser


def run_cli(args: argparse.Namespace) -> int:
    baseline = Path(args.baseline)
    candidate = Path(args.candidate)
    pipeline = DetectorPipeline()
    report = compare_paths(baseline, candidate, threshold=args.threshold, pipeline=pipeline)
    report_dict: dict[str, Any] = {
        **report.to_dict(),
        "metadata": {
            **report.metadata,
            "threshold": args.threshold,
        },
    }

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json.dumps(report_dict, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    serialized = json.dumps(report_dict, indent=2 if args.pretty else None, sort_keys=True)
    print(serialized)

    if report.summary["ci_gate"] == "fail" and not args.no_ci_exit:
        return 1
    return 0


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    raise SystemExit(run_cli(args))


if __name__ == "__main__":
    main()
