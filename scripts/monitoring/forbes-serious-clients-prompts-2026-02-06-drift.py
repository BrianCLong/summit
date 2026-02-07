import argparse
import json
from pathlib import Path
from typing import Dict, List


def load_json(path: Path) -> Dict:
    return json.loads(path.read_text(encoding="utf-8"))


def summarize(metrics: List[Dict]) -> Dict[str, float]:
    total = len(metrics)
    if total == 0:
        return {
            "avg_score": 0.0,
            "availability_rate": 0.0,
            "transformation_rate": 0.0,
        }

    avg_score = sum(item["serious_client_score"] for item in metrics) / total
    availability_rate = (
        sum(1 for item in metrics if item["availability_signal_count"] > 0) / total
    )
    transformation_rate = (
        sum(1 for item in metrics if item["transformation_first_present"]) / total
    )

    return {
        "avg_score": round(avg_score, 2),
        "availability_rate": round(availability_rate, 4),
        "transformation_rate": round(transformation_rate, 4),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Drift detection for serious client tone pack.")
    parser.add_argument(
        "--metrics",
        default="artifacts/serious_client_tone/metrics.json",
        help="Path to metrics.json",
    )
    parser.add_argument(
        "--baseline",
        default="scripts/monitoring/fixtures/serious-client-tone-baseline.json",
        help="Baseline summary JSON",
    )
    parser.add_argument(
        "--out-dir",
        default="artifacts/serious-client-tone-drift",
        help="Output directory for drift trend",
    )
    parser.add_argument("--score-delta", type=float, default=10.0)
    parser.add_argument("--rate-delta", type=float, default=0.2)
    args = parser.parse_args()

    metrics_path = Path(args.metrics)
    if not metrics_path.exists():
        print("metrics.json not found; skipping drift detection.")
        return 0

    metrics_bundle = load_json(metrics_path)
    current = summarize(metrics_bundle.get("metrics", []))

    baseline_path = Path(args.baseline)
    baseline = None
    if baseline_path.exists():
        baseline = load_json(baseline_path)

    drift_detected = False
    deltas = {}
    if baseline:
        deltas = {
            "avg_score": round(current["avg_score"] - baseline["avg_score"], 2),
            "availability_rate": round(
                current["availability_rate"] - baseline["availability_rate"], 4
            ),
            "transformation_rate": round(
                current["transformation_rate"] - baseline["transformation_rate"], 4
            ),
        }
        drift_detected = (
            abs(deltas["avg_score"]) > args.score_delta
            or abs(deltas["availability_rate"]) > args.rate_delta
            or abs(deltas["transformation_rate"]) > args.rate_delta
        )

    trend = {
        "baseline_present": bool(baseline),
        "current": current,
        "baseline": baseline,
        "deltas": deltas,
        "drift_detected": drift_detected,
    }

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "trend.json"
    out_path.write_text(json.dumps(trend, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
