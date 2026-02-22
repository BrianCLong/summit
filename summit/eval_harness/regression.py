from __future__ import annotations
import json
from pathlib import Path

def compare_metrics(current_path: Path, baseline_path: Path) -> dict[str, float]:
    curr = json.loads(current_path.read_text())["metrics"]
    base = json.loads(baseline_path.read_text())["metrics"]

    deltas = {}
    for key in curr:
        if key in base and isinstance(curr[key], (int, float)) and isinstance(base[key], (int, float)):
            deltas[key] = curr[key] - base[key]

    return deltas

def check_regression(deltas: dict[str, float], thresholds: dict[str, float]) -> list[str]:
    failures = []
    for key, delta in deltas.items():
        # Example: accuracy drop > 0.05 is bad
        # latency increase > 50ms is bad
        if key == "accuracy" and delta < -thresholds.get("accuracy_drop_max", 0.05):
            failures.append(f"Accuracy dropped by {-delta}")
        if key == "p95_latency_ms" and delta > thresholds.get("latency_increase_max", 50.0):
            failures.append(f"Latency increased by {delta}")

    return failures
