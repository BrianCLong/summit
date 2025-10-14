#!/usr/bin/env python3
"""CLI entrypoint for executing the zero-touch compliance engine."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    # Allow execution via ``python compliance_runner.py``
    sys.path.append(str(Path(__file__).resolve().parents[2]))
    from ops.compliance_zero_touch.engine import ComplianceOrchestrator
else:
    from .engine import ComplianceOrchestrator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run zero-touch compliance automation")
    parser.add_argument(
        "--workspace",
        type=Path,
        default=Path(__file__).resolve().parent / "workspace",
        help="Path to the workspace containing configs/policies/test suites.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "artifacts",
        help="Directory to write compliance audit logs and evidence.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    orchestrator = ComplianceOrchestrator(args.workspace, args.output)
    report_path = orchestrator.run()
    print(f"Compliance audit report generated at {report_path}")


if __name__ == "__main__":
    main()
