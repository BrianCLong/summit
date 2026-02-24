#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def drift_ratio(baseline: float, current: float, direction: str) -> float:
    if baseline == 0.0:
        return 0.0
    if direction == "higher_is_better":
        return max(0.0, (baseline - current) / baseline)
    if direction == "lower_is_better":
        return max(0.0, (current - baseline) / baseline)
    raise ValueError(f"Unsupported direction {direction}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Detect LLM vitals drift")
    parser.add_argument("--baseline", default="evaluation/vitals/baseline_metrics.json")
    parser.add_argument("--current", default="artifacts/llm-vitals/metrics.json")
    parser.add_argument("--out", default="artifacts/llm-vitals/drift_report.json")
    parser.add_argument("--metric-delta-threshold", type=float, default=0.05)
    parser.add_argument("--cost-delta-threshold", type=float, default=0.10)
    parser.add_argument("--safety-drop-threshold", type=float, default=0.03)
    args = parser.parse_args(argv)

    baseline = load_json(Path(args.baseline))
    current = load_json(Path(args.current))

    schema = current["schema"]
    baseline_models = {item["model_key"]: item for item in baseline["providers"]}
    current_models = {item["model_key"]: item for item in current["providers"]}

    drifts: list[dict[str, object]] = []
    for model_key, current_entry in sorted(current_models.items()):
        baseline_entry = baseline_models.get(model_key)
        if not baseline_entry:
            continue
        for metric_name, metric_spec in sorted(schema.items()):
            base_value = float(baseline_entry["vitals"][metric_name])
            curr_value = float(current_entry["vitals"][metric_name])
            direction = str(metric_spec["direction"])
            ratio = drift_ratio(base_value, curr_value, direction)

            threshold = args.metric_delta_threshold
            if metric_name == "cost_per_1k_tokens":
                threshold = args.cost_delta_threshold
            elif metric_name == "safety_score":
                threshold = args.safety_drop_threshold

            if ratio > threshold:
                drifts.append(
                    {
                        "model_key": model_key,
                        "metric": metric_name,
                        "baseline": base_value,
                        "current": curr_value,
                        "drift_ratio": round(ratio, 6),
                        "threshold": threshold,
                    }
                )

    payload = {
        "status": "drift_detected" if drifts else "stable",
        "drifts": drifts,
        "thresholds": {
            "metric_delta_threshold": args.metric_delta_threshold,
            "cost_delta_threshold": args.cost_delta_threshold,
            "safety_drop_threshold": args.safety_drop_threshold,
        },
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(str(out_path))
    return 1 if drifts else 0


if __name__ == "__main__":
    raise SystemExit(main())
