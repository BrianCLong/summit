#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from benchmarks.der2.runner import run_der2


def main() -> None:
    parser = argparse.ArgumentParser(description="Run DeR2-style benchmark evaluation")
    parser.add_argument("--bench-id", default="der2_smoke", help="Benchmark identifier")
    parser.add_argument("--model", default="dummy", help="Model name")
    parser.add_argument(
        "--frozen_library_dir",
        required=True,
        help="Path to frozen library directory (documents.jsonl)",
    )
    parser.add_argument("--tasks", required=True, help="Path to tasks.jsonl")
    parser.add_argument("--concepts", required=True, help="Path to concepts.jsonl")
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Directory to write artifacts (default: artifacts/<bench-id>)",
    )
    parser.add_argument(
        "--regimes",
        default="instruction_only,concepts,related_only,full_set",
        help="Comma-separated list of regimes",
    )
    parser.add_argument("--distractor-count", type=int, default=2)
    parser.add_argument(
        "--validation-mode",
        action="store_true",
        help="Enable leakage validation gate",
    )

    args = parser.parse_args()

    output_dir = Path(args.output_dir) if args.output_dir else Path("artifacts") / args.bench_id
    regimes = [regime.strip() for regime in args.regimes.split(",") if regime.strip()]

    run_der2(
        bench_id=args.bench_id,
        frozen_library_dir=args.frozen_library_dir,
        tasks_path=args.tasks,
        concepts_path=args.concepts,
        output_dir=output_dir,
        model_name=args.model,
        regimes=regimes,
        distractor_count=args.distractor_count,
        deterministic=True,
        validation_mode=args.validation_mode,
    )


if __name__ == "__main__":
    main()
