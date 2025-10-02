"""Command line interface for the Feature Lineage Impact Analyzer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from .analysis import analyze_change
from .ingest import load_lineage
from .playbook import execute_playbook


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="flia", description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    analyze_parser = subparsers.add_parser("analyze", help="Run blast-radius analysis")
    analyze_parser.add_argument("change_id", help="Identifier for the changed feature or dataset")
    analyze_parser.add_argument("--model-registry", type=Path, required=True)
    analyze_parser.add_argument("--feature-catalog", type=Path, required=True)
    analyze_parser.add_argument("--pipeline-dag", type=Path, required=True)
    analyze_parser.add_argument("--output", type=Path, help="Optional file to write JSON report")
    analyze_parser.add_argument(
        "--run-playbook",
        action="store_true",
        help="Execute the generated playbook with bundled fixture handlers",
    )

    return parser


def _run_analyze(args: argparse.Namespace) -> int:
    graph = load_lineage(
        model_registry=args.model_registry,
        feature_catalog=args.feature_catalog,
        pipeline_dag=args.pipeline_dag,
    )
    report = analyze_change(graph, change_id=args.change_id)
    payload: dict[str, Any] = report.to_dict()

    if args.run_playbook:
        payload["playbook_results"] = execute_playbook(payload["playbook"])

    text = json.dumps(payload, indent=2, sort_keys=False)
    if args.output:
        args.output.write_text(text + "\n", encoding="utf-8")
    else:
        print(text)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "analyze":
        return _run_analyze(args)

    parser.error(f"Unsupported command: {args.command}")
    return 2


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
