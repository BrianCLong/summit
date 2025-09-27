"""CLI entry point for ICO planner."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

from ico_planner import Planner, PlannerConfig


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inference Cost Optimizer planner")
    parser.add_argument("request", type=Path, help="Path to planning request JSON")
    parser.add_argument(
        "--namespace",
        default="default",
        help="Kubernetes namespace for generated HPAs (default: %(default)s)",
    )
    parser.add_argument(
        "--target-utilization",
        type=float,
        default=0.65,
        help="Target replica utilization",
    )
    parser.add_argument(
        "--scale-buffer",
        type=float,
        default=1.2,
        help="Max replica buffer multiplier",
    )
    parser.add_argument("--min-replicas", type=int, default=1, help="Minimum replica floor")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    config = PlannerConfig(
        target_utilization=args.target_utilization,
        scale_buffer=args.scale_buffer,
        min_replicas_floor=args.min_replicas,
        namespace=args.namespace,
    )
    request = Planner.load_request(args.request)
    planner = Planner(config)
    result = planner.plan(request)
    print(result.to_json())
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())

