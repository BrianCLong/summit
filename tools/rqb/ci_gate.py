"""CI regression gate for the Redaction Quality Benchmark."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable

MetricDict = Dict[str, float]


def _load_scorecard(path: Path) -> Dict[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _assert_thresholds(
    baseline: Dict[str, object],
    candidate: Dict[str, object],
    metrics: Iterable[str],
    max_drop: float,
) -> None:
    baseline_summary: MetricDict = baseline["summary"]  # type: ignore[assignment]
    candidate_summary: MetricDict = candidate["summary"]  # type: ignore[assignment]
    for metric in metrics:
        baseline_value = float(baseline_summary.get(metric, 0.0))
        candidate_value = float(candidate_summary.get(metric, 0.0))
        drop = baseline_value - candidate_value
        if drop > max_drop + 1e-9:
            raise SystemExit(
                f"Metric '{metric}' regressed by {drop:.4f} (baseline={baseline_value:.4f}, "
                f"candidate={candidate_value:.4f}, threshold={max_drop:.4f})"
            )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="CI gate for RQB scorecards")
    parser.add_argument("baseline", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--max-drop", type=float, default=0.01, help="Allowed drop before failing")
    parser.add_argument(
        "--metrics",
        nargs="+",
        default=["precision", "recall", "f1"],
        help="Metrics to compare",
    )
    args = parser.parse_args(argv)

    baseline = _load_scorecard(args.baseline)
    candidate = _load_scorecard(args.candidate)
    _assert_thresholds(baseline, candidate, args.metrics, args.max_drop)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
