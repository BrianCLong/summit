#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from evaluation.vitals.generate_report import EvalConfig, run_evaluation


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run deterministic LLM vitals evaluation")
    parser.add_argument("--schema", default="evaluation/vitals/schema.yaml")
    parser.add_argument("--corpus", default="evaluation/vitals/benchmark_corpus.jsonl")
    parser.add_argument("--fixtures", default="evaluation/vitals/provider_fixtures.json")
    parser.add_argument("--out-dir", default="artifacts/llm-vitals")
    parser.add_argument("--baseline", default="evaluation/vitals/baseline_metrics.json")
    parser.add_argument("--max-regression", type=float, default=0.05)
    parser.add_argument("--model", action="append", default=[], help="Model key selector, e.g. openai:gpt-4o-mini")
    parser.add_argument("--expected-corpus-sha", default=None)
    parser.add_argument("--force", action="store_true", help="Run even when VITALS_EVAL_ENABLED is false")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

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

    if result["status"] != "passed":
        print("Vitals evaluation failed due to regressions or budget violations.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
