"""Compare decay kernels and weights for freshness re-ranking."""

from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timezone
from itertools import product
from pathlib import Path

import numpy as np

from ..decay import DecayKernel
from ..evaluation import evaluate_dataset, load_dataset
from ..freshness import FreshnessConfig


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", required=True, help="Path to QA dataset JSON")
    parser.add_argument(
        "--as-of",
        type=str,
        required=True,
        help="ISO timestamp used as the evaluation reference",
    )
    parser.add_argument(
        "--weights",
        type=float,
        nargs="*",
        default=[1.0, 0.75, 0.5],
        help="Freshness weights to evaluate",
    )
    parser.add_argument(
        "--default-half-life-hours",
        type=float,
        default=72.0,
        help="Fallback half-life in hours",
    )
    parser.add_argument(
        "--source-half-life",
        action="append",
        default=[],
        metavar="SOURCE=HOURS",
        help="Override half-life for a given source",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=7,
        help="Deterministic seed for reproducibility",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional path to save the ablation results as JSON",
    )
    return parser.parse_args()


def _parse_source_overrides(overrides: list[str]) -> dict[str, float]:
    mapping: dict[str, float] = {}
    for item in overrides:
        if "=" not in item:
            raise ValueError(f"Invalid override format: {item}")
        source, hours = item.split("=", 1)
        mapping[source] = float(hours)
    return mapping


def main() -> None:
    args = parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)

    dataset = load_dataset(args.dataset)
    overrides = _parse_source_overrides(args.source_half_life)
    as_of = datetime.fromisoformat(args.as_of.replace("Z", "+00:00")).astimezone(timezone.utc)

    results = []
    for kernel, weight in product(DecayKernel, args.weights):
        config = FreshnessConfig(
            default_half_life_hours=args.default_half_life_hours,
            source_half_lives=overrides,
            kernel=kernel,
        )
        result = evaluate_dataset(
            dataset=dataset,
            config=config,
            as_of=as_of,
            freshness_weight=weight,
        )
        results.append({
            "kernel": kernel.value,
            "weight": weight,
            "baseline_accuracy": result.baseline_accuracy,
            "reranked_accuracy": result.reranked_accuracy,
            "gain": result.reranked_accuracy - result.baseline_accuracy,
        })

    payload = {
        "as_of": as_of.isoformat(),
        "results": results,
    }
    output = args.output
    if output:
        output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    else:
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
