"""Command line interface for PDIL."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict

from .adapters import EchoAdapter, ModelAdapter, TemplateAdapter
from .models import GoldenSet
from .replay import PromptDiffRunner, load_golden_set


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Prompt Diff Impact Lab")
    parser.add_argument("golden_set", type=Path, help="Path to the golden set JSON file")
    parser.add_argument("baseline", type=str, help="Baseline prompt version key")
    parser.add_argument("candidate", type=str, help="Candidate prompt version key")
    parser.add_argument("--seed", type=int, default=0, help="Base seed for deterministic replays")
    parser.add_argument("--adapter", type=str, default="echo", choices=["echo", "template"], help="Adapter to use")
    parser.add_argument("--template-map", type=Path, help="Optional template mapping JSON")
    parser.add_argument("--shuffle", action="store_true", help="Shuffle case order before replay")
    parser.add_argument("--output", type=Path, help="Write replay report JSON to this path")
    return parser


def _adapter_from_args(args: argparse.Namespace) -> Dict[str, ModelAdapter]:
    if args.adapter == "echo":
        return {args.baseline: EchoAdapter(), args.candidate: EchoAdapter()}
    if args.adapter == "template":
        template_map = {}
        if args.template_map:
            template_map = json.loads(args.template_map.read_text())
        adapter = TemplateAdapter(template_map)
        return {args.baseline: adapter, args.candidate: adapter}
    raise ValueError(f"Unsupported adapter: {args.adapter}")


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    golden_set: GoldenSet = load_golden_set(args.golden_set)
    adapters = _adapter_from_args(args)
    runner = PromptDiffRunner(golden_set, adapters)
    report = runner.run(args.baseline, args.candidate, seed=args.seed, shuffle=args.shuffle)
    serialized = serialize_report(report)
    if args.output:
        args.output.write_text(json.dumps(serialized, indent=2))
    else:
        print(json.dumps(serialized, indent=2))
    return 0


def serialize_report(report) -> dict:
    return {
        "seed": report.seed,
        "assessment": {
            "total_risk": report.assessment.total_risk,
            "coverage_delta": report.assessment.coverage_delta,
            "taxonomy_counts": report.assessment.taxonomy_counts,
            "regressions": [outcome.case.case_id for outcome in report.assessment.regressions],
        },
        "outcomes": [
            {
                "case_id": outcome.case.case_id,
                "baseline": {
                    "passed": outcome.baseline.passed,
                    "taxonomy": outcome.baseline.taxonomy,
                    "severity": outcome.baseline.severity,
                },
                "candidate": {
                    "passed": outcome.candidate.passed,
                    "taxonomy": outcome.candidate.taxonomy,
                    "severity": outcome.candidate.severity,
                },
                "coverage_delta": outcome.coverage_delta,
                "business_impact": outcome.case.business_impact,
            }
            for outcome in report.outcomes
        ],
    }


if __name__ == "__main__":
    raise SystemExit(main())
