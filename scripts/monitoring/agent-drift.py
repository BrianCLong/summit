#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load_score(path: Path) -> float:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if "evaluation_score" in payload:
        return float(payload["evaluation_score"])
    metrics = payload.get("metrics", {})
    if "evaluation_score" in metrics:
        return float(metrics["evaluation_score"])
    raise ValueError(f"evaluation_score not found in {path}")


def _write_report(path: Path, report: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect weekly drift in agent-eval score.")
    parser.add_argument("--baseline", default="artifacts/agent-eval/baseline_metrics.json")
    parser.add_argument("--current", default="artifacts/agent-eval/metrics.json")
    parser.add_argument("--threshold", type=float, default=0.1)
    parser.add_argument("--out", default="artifacts/agent-eval/metrics_trend.json")
    args = parser.parse_args()

    baseline_path = Path(args.baseline)
    current_path = Path(args.current)
    out_path = Path(args.out)

    if not baseline_path.exists() or not current_path.exists():
        _write_report(
            out_path,
            {
                "status": "skipped",
                "reason": "missing_baseline_or_current_metrics",
                "baseline_path": str(baseline_path),
                "current_path": str(current_path),
                "threshold": args.threshold,
            },
        )
        return 0

    baseline_score = _load_score(baseline_path)
    current_score = _load_score(current_path)
    drift = abs(current_score - baseline_score)
    status = "alert" if drift > args.threshold else "ok"

    report = {
        "status": status,
        "threshold": args.threshold,
        "baseline_score": baseline_score,
        "current_score": current_score,
        "drift": drift,
    }
    _write_report(out_path, report)
    return 1 if status == "alert" else 0


if __name__ == "__main__":
    raise SystemExit(main())

