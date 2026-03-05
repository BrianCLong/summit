#!/usr/bin/env python3
import json
from pathlib import Path

BENCH = {
    "artifact_size_limit_kb": 200,
    "max_steps": 40,
    "planning_validation_ms_budget": 250,
    "patch_generation_ms_budget": 2000,
}


def main() -> int:
    out = Path("artifacts/bench.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(BENCH, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
