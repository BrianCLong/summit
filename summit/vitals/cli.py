from __future__ import annotations

import argparse
import os
from pathlib import Path

from evaluation.vitals.generate_report import EvalConfig, run_evaluation


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="summit vitals")
    sub = parser.add_subparsers(dest="cmd", required=True)
    eval_parser = sub.add_parser("eval")
    eval_parser.add_argument("--schema", default="evaluation/vitals/schema.yaml")
    eval_parser.add_argument("--corpus", default="evaluation/vitals/benchmark_corpus.jsonl")
    eval_parser.add_argument("--fixtures", default="evaluation/vitals/provider_fixtures.json")
    eval_parser.add_argument("--out-dir", default="artifacts/llm-vitals")
    eval_parser.add_argument("--baseline", default="evaluation/vitals/baseline_metrics.json")
    eval_parser.add_argument("--max-regression", type=float, default=0.05)
    eval_parser.add_argument("--model", action="append", default=[])
    eval_parser.add_argument("--expected-corpus-sha", default=None)
    eval_parser.add_argument("--force", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.cmd == "eval":
        enabled = os.getenv("VITALS_EVAL_ENABLED", "false").strip().lower() == "true"
        if not enabled and not args.force:
            print("Vitals evaluation is disabled (VITALS_EVAL_ENABLED=false).")
            return 0

        baseline_path = Path(args.baseline)
        if not baseline_path.exists():
            baseline_path = None

        result = run_evaluation(
            EvalConfig(
                schema_path=Path(args.schema),
                corpus_path=Path(args.corpus),
                fixtures_path=Path(args.fixtures),
                out_dir=Path(args.out_dir),
                baseline_path=baseline_path,
                selected_models=args.model,
                max_regression=args.max_regression,
                expected_corpus_sha=args.expected_corpus_sha,
            )
        )
        print(f"report={result['report_path']}")
        print(f"metrics={result['metrics_path']}")
        print(f"stamp={result['stamp_path']}")
        return 1 if result["status"] != "passed" else 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
