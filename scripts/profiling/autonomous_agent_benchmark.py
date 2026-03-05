from __future__ import annotations

import json
from pathlib import Path

BUDGETS_MS = {
    "planning_generation": 200,
    "patch_generation": 500,
    "evaluation_loop": 2000,
}


def benchmark(output_path: Path) -> None:
    report = {
        "budgets_ms": BUDGETS_MS,
        "artifact_size_kb_limit": 100,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    benchmark(Path("artifacts/autonomous_agent_benchmark.json"))
