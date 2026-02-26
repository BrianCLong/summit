"""Profile runtime and memory envelope for the Income Engine."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
import tracemalloc
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipelines.income_engine import run_income_engine


def main() -> None:
    spec = {
        "model_type": "digital_product",
        "setup_cost": 500,
        "monthly_operating_cost": 100,
        "monthly_traffic": 1000,
        "conversion_rate": 0.02,
        "price": 49,
        "churn_rate": 0.05,
        "evidence_links": ["https://example.org/evidence/digital-product-baseline"],
    }

    os.environ["SUMMIT_ENABLE_INCOME_ENGINE"] = "1"

    tracemalloc.start()
    started = time.perf_counter()
    with tempfile.TemporaryDirectory() as tmpdir:
        run_income_engine(spec, Path(tmpdir))
    elapsed_ms = (time.perf_counter() - started) * 1000
    _, peak_bytes = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    metrics = {
        "runtime_ms": round(elapsed_ms, 3),
        "peak_memory_mb": round(peak_bytes / 1024 / 1024, 6),
        "runtime_budget_ms": 2000,
        "memory_budget_mb": 150,
    }
    Path("performance_metrics.json").write_text(
        json.dumps(metrics, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
