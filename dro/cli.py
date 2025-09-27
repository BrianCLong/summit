"""Command-line interface for the Data Residency Optimizer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .diff import PlanDiffer
from .io import load_spec_from_file
from .optimizer import DataResidencyOptimizer
from .signing import PlanSigner


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Data Residency Optimizer")
    parser.add_argument("spec", type=Path, help="Path to the optimization spec JSON file")
    parser.add_argument(
        "--previous-plan",
        type=Path,
        help="Optional previous signed plan for diffing",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Write signed plan JSON to this path (defaults to stdout)",
    )
    return parser.parse_args()
def main() -> None:
    args = parse_args()
    spec = load_spec_from_file(args.spec)

    optimizer = DataResidencyOptimizer()
    result = optimizer.solve(spec)
    signer = PlanSigner(secret=spec.signing_secret)
    plan = signer.sign(result)

    output = json.dumps(plan, indent=2, sort_keys=True)
    if args.output:
        args.output.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)

    if args.previous_plan:
        previous = json.loads(args.previous_plan.read_text(encoding="utf-8"))
        diff = PlanDiffer().diff(previous, plan)
        print(json.dumps(diff, indent=2, sort_keys=True))


if __name__ == "__main__":  # pragma: no cover
    main()
