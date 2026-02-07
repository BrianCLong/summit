#!/usr/bin/env python3
import json
import os
import pathlib

def collect_suite_stats(suites_root: pathlib.Path) -> dict:
    suite_files = []
    if suites_root.exists():
        for path in suites_root.rglob("*"):
            if path.is_file():
                suite_files.append(path)

    total_bytes = sum(path.stat().st_size for path in suite_files)
    return {
        "suite_file_count": len(suite_files),
        "suite_total_bytes": total_bytes,
    }


def main() -> None:
    root = pathlib.Path.cwd()
    suites_root = root / "suites" / "holdout"
    stats = collect_suite_stats(suites_root)

    metrics = {
        "bench": "scenario_suite",
        "budget_p95_ms": 60000,
        "observed_p95_ms": float(os.getenv("SCENARIO_SUITE_P95_MS", "0")),
        "suite_stats": stats,
    }

    out_dir = root / "artifacts" / "bench"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "metrics.json"
    with out_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2, sort_keys=True)
        handle.write("\n")

    if metrics["observed_p95_ms"] > metrics["budget_p95_ms"]:
        raise SystemExit("Scenario suite p95 exceeds budget")


if __name__ == "__main__":
    main()
