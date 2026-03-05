"""Profile the income engine and emit performance_metrics.json."""

import json
import time
import tracemalloc
from pathlib import Path

from pipelines.income_engine.engine import FEATURE_FLAG, run_income_engine


def main() -> int:
    tmp_dir = Path(".tmp/income-engine-profile")
    tmp_dir.mkdir(parents=True, exist_ok=True)
    spec = {
        "model_type": "digital_product",
        "setup_cost": 500,
        "monthly_traffic": 1000,
        "conversion_rate": 0.02,
        "price": 49,
        "churn_rate": 0.05,
        "monthly_operating_cost": 120,
        "automation_share": 0.8,
        "manual_hours_per_month": 4,
        "evidence_links": ["https://example.com/source"],
    }

    tracemalloc.start()
    started = time.perf_counter()
    run_income_engine(
        spec,
        output_dir=tmp_dir,
        schema_path=Path("pipelines/income_engine/income_model.schema.json"),
        feature_flags={FEATURE_FLAG: True},
        run_date="20260226",
    )
    duration = time.perf_counter() - started
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    payload = {
        "runtime_seconds": round(duration, 6),
        "peak_memory_mb": round(peak / (1024 * 1024), 6),
        "ci_budget_seconds": 30,
        "runtime_budget_seconds": 2,
        "memory_budget_mb": 150,
        "status": "pass" if duration < 2 and peak < 150 * 1024 * 1024 else "fail",
    }
    Path("performance_metrics.json").write_text(
        json.dumps(payload, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
