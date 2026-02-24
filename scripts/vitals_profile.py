#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Emit deterministic vitals profile summary")
    parser.add_argument("--metrics", default="artifacts/llm-vitals/metrics.json")
    parser.add_argument("--out", default="artifacts/llm-vitals/profile.json")
    args = parser.parse_args(argv)

    metrics = json.loads(Path(args.metrics).read_text(encoding="utf-8"))
    budgets = metrics.get("budgets", {})
    payload = {
        "runtime_sec": budgets.get("estimated_runtime_sec"),
        "runtime_budget_sec": budgets.get("runtime_budget_sec"),
        "memory_budget_mb": budgets.get("memory_budget_mb"),
        "cost_usd": budgets.get("estimated_cost_usd"),
        "cost_budget_usd": budgets.get("cost_budget_usd"),
        "violations": budgets.get("violations", []),
        "status": "failed" if budgets.get("violations") else "passed",
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(str(out_path))
    return 1 if payload["status"] == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
