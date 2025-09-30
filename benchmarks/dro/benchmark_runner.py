"""Replayable benchmark for the Data Residency Optimizer."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

from dro.diff import PlanDiffer
from dro.io import load_spec_from_file
from dro.optimizer import DataResidencyOptimizer
from dro.signing import PlanSigner

BASELINE_OBJECTIVE = 21.635
TOLERANCE = 0.01  # 1%


@dataclass
class BenchmarkResult:
    objective_cost: float
    plan: Dict[str, Any]
    diff_from_baseline: Dict[str, Any]


def run_benchmark() -> BenchmarkResult:
    root = Path(__file__).resolve().parent
    spec = load_spec_from_file(root / "sample_spec.json")
    optimizer = DataResidencyOptimizer()
    result = optimizer.solve(spec)
    signer = PlanSigner(secret=spec.signing_secret)
    plan = signer.sign(result)

    baseline_plan_path = root / "baseline_plan.json"
    baseline_plan = json.loads(baseline_plan_path.read_text(encoding="utf-8"))
    diff = PlanDiffer().diff(baseline_plan, plan)

    relative_error = abs(result.objective_cost - BASELINE_OBJECTIVE) / BASELINE_OBJECTIVE
    if relative_error > TOLERANCE:
        raise AssertionError(
            f"Objective {result.objective_cost:.6f} deviates more than {TOLERANCE:.0%}"
            f" from baseline {BASELINE_OBJECTIVE:.6f}"
        )

    return BenchmarkResult(
        objective_cost=result.objective_cost,
        plan=plan,
        diff_from_baseline=diff,
    )


def main() -> None:  # pragma: no cover
    result = run_benchmark()
    print(json.dumps(
        {
            "objective_cost": round(result.objective_cost, 6),
            "plan_id": result.plan["plan_id"],
            "diff": result.diff_from_baseline,
        },
        indent=2,
        sort_keys=True,
    ))


if __name__ == "__main__":  # pragma: no cover
    main()
