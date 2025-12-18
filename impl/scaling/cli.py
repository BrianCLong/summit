"""Command-line entry point for scaling & AutoML routines."""
from __future__ import annotations

import argparse
from pathlib import Path
from typing import List

from .ingest import ingest
from .modeling import fit_linear_response_surface, fit_power_law
from .planner import plan


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scaling & AutoML orchestrator demo")
    parser.add_argument("--experiments", type=Path, required=True, help="Path to JSONL experiments file")
    parser.add_argument(
        "--schema",
        type=Path,
        default=Path("impl/scaling/schemas/experiment.schema.json"),
        help="Path to experiment schema",
    )
    parser.add_argument(
        "--objective", type=str, default="reasoning_score", help="Metric to optimize (e.g., reasoning_score, training_loss)"
    )
    parser.add_argument("--max-params", type=float, default=None, help="Max parameter count constraint")
    parser.add_argument("--max-context", type=int, default=None, help="Max context length constraint")
    return parser


def main(argv: List[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    experiments = ingest(args.experiments, args.schema)
    scaling_fit = fit_power_law(experiments, metric="training_loss")
    response_surface = fit_linear_response_surface(experiments, metric=args.objective)

    base_configs = [exp.config for exp in experiments]
    constraints = {k: v for k, v in {"max_params": args.max_params, "max_context": args.max_context}.items() if v}

    recommendation = plan(
        base_configs=base_configs,
        scaling_fit=scaling_fit,
        response_surface=response_surface,
        objective=args.objective,
        constraints=constraints,
    )

    print("Recommended configuration:")
    print(recommendation)


if __name__ == "__main__":
    main()
