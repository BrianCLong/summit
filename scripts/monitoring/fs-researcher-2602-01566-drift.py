from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load_metrics(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="FS-Researcher drift detector")
    parser.add_argument("--runs-dir", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    runs_dir = Path(args.runs_dir)
    metrics_files = sorted(runs_dir.rglob("metrics.json"))
    if len(metrics_files) < 2:
        raise SystemExit("Need at least two metrics.json files to compare.")

    baseline = _load_metrics(metrics_files[0])
    latest = _load_metrics(metrics_files[-1])

    drift = {
        "baseline": metrics_files[0].as_posix(),
        "latest": metrics_files[-1].as_posix(),
        "delta": {
            "facts_total": latest.get("facts_total", 0) - baseline.get("facts_total", 0),
            "facts_cited": latest.get("facts_cited", 0) - baseline.get("facts_cited", 0),
            "citation_coverage": latest.get("citation_coverage", 0.0)
            - baseline.get("citation_coverage", 0.0),
        },
        "regression": latest.get("citation_coverage", 0.0)
        < baseline.get("citation_coverage", 0.0),
    }

    Path(args.out).write_text(
        json.dumps(drift, sort_keys=True, separators=(",", ":")),
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
