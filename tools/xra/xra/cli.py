"""Command-line interface for the Explainable Ranking Auditor."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

from .explanations import explain_rank_shift
from .metrics import MetricSummary, compute_bias_metrics
from .report import generate_markdown_report
from .replay import load_retrieval_log


def _serialise_metric_summary(summary: MetricSummary) -> Dict[str, Any]:
    return {"average": summary.average, "by_query": summary.by_query}


def _serialise_metrics(metrics: dict) -> Dict[str, Any]:
    output = {
        "k_values": metrics["k_values"],
        "baseline": {
            "exposure": metrics["baseline"]["exposure"],
            "fairness": {k: _serialise_metric_summary(v) for k, v in metrics["baseline"]["fairness"].items()},
            "coverage": {k: _serialise_metric_summary(v) for k, v in metrics["baseline"]["coverage"].items()},
        },
        "candidate": {
            "exposure": metrics["candidate"]["exposure"],
            "fairness": {k: _serialise_metric_summary(v) for k, v in metrics["candidate"]["fairness"].items()},
            "coverage": {k: _serialise_metric_summary(v) for k, v in metrics["candidate"]["coverage"].items()},
        },
        "alerts": metrics["alerts"],
    }
    return output


def _serialise_explanations(explanations: Iterable[Any]) -> list[dict[str, Any]]:
    serialised: list[dict[str, Any]] = []
    for item in explanations:
        if is_dataclass(item):
            serialised.append(asdict(item))
        else:
            serialised.append(dict(item))
    return serialised


def run_audit(args: argparse.Namespace) -> dict:
    baseline = load_retrieval_log(args.baseline)
    candidate = load_retrieval_log(args.candidate)

    metrics = compute_bias_metrics(baseline, candidate, k_values=args.k)
    explanations = explain_rank_shift(baseline, candidate, top_n=args.top_n)

    summary = {
        "baseline_version": baseline.version,
        "candidate_version": candidate.version,
        "metrics": _serialise_metrics(metrics),
        "explanations": _serialise_explanations(explanations),
    }

    if args.report:
        generate_markdown_report(
            baseline.version,
            candidate.version,
            metrics,
            explanations,
            metrics["alerts"],
            output_path=args.report,
        )
    if args.output:
        Path(args.output).write_text(json.dumps(summary, indent=2), encoding="utf8")
    if args.dashboard_data:
        dashboard_payload = {
            "summary": summary,
            "alerts": metrics["alerts"],
        }
        Path(args.dashboard_data).write_text(json.dumps(dashboard_payload, indent=2), encoding="utf8")
    return summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Explainable Ranking Auditor")
    subparsers = parser.add_subparsers(dest="command")

    audit = subparsers.add_parser("audit", help="Run an end-to-end audit")
    audit.add_argument("baseline", help="Path to the baseline retrieval log")
    audit.add_argument("candidate", help="Path to the candidate retrieval log")
    audit.add_argument(
        "-k",
        "--k",
        type=int,
        nargs="+",
        default=[3, 5, 10],
        help="Cutoffs for fairness@k and coverage@k",
    )
    audit.add_argument("--top-n", type=int, default=5, help="Number of rank shifts to explain")
    audit.add_argument("--report", help="Path to write the Markdown audit report")
    audit.add_argument("--output", help="Path to write the JSON summary")
    audit.add_argument("--dashboard-data", help="Path to write dashboard JSON payload")
    audit.set_defaults(func=run_audit)

    return parser


def main(argv: list[str] | None = None) -> dict:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "func"):
        parser.print_help()
        raise SystemExit(1)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    main()
