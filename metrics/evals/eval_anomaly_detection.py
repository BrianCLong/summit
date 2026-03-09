from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import random

from gmr_math import mad, median


@dataclass
class EvalResult:
    precision: float
    recall: float
    thresholds: dict
    detections: List[int]
    anomalies: List[int]


def generate_series(seed: int, length: int) -> List[float]:
    rng = random.Random(seed)
    base = 2.0
    return [base + rng.uniform(-0.05, 0.05) for _ in range(length)]


def inject_anomalies(series: List[float]) -> Tuple[List[float], List[int]]:
    anomalies = []
    mutated = list(series)
    anomaly_points = {
        "ingestion_drop": [120, 360, 600],
        "loader_drop": [200, 440, 680],
        "schema_drift_spike": [280, 520, 760],
    }

    for idx in anomaly_points["ingestion_drop"]:
        if idx < len(mutated):
            mutated[idx] = mutated[idx] * 0.2
            anomalies.append(idx)

    for idx in anomaly_points["loader_drop"]:
        if idx < len(mutated):
            mutated[idx] = mutated[idx] * 0.1
            anomalies.append(idx)

    for idx in anomaly_points["schema_drift_spike"]:
        if idx < len(mutated):
            mutated[idx] = mutated[idx] * 4.0
            anomalies.append(idx)

    return mutated, sorted(set(anomalies))


def detect(series: List[float], window: int, multiplier: float) -> List[int]:
    detections = []
    for idx in range(window, len(series)):
        baseline = series[idx - window : idx]
        med = median(baseline)
        dispersion = mad(baseline)
        if dispersion == 0:
            continue
        if abs(series[idx] - med) > multiplier * dispersion:
            detections.append(idx)
    return detections


def score(detections: List[int], anomalies: List[int], warmup: int) -> EvalResult:
    detection_set = set(detections)
    anomaly_set = {idx for idx in anomalies if idx >= warmup}
    true_positive = len(detection_set & anomaly_set)
    false_positive = len(detection_set - anomaly_set)
    false_negative = len(anomaly_set - detection_set)

    precision = true_positive / (true_positive + false_positive) if (true_positive + false_positive) else 0.0
    recall = true_positive / (true_positive + false_negative) if (true_positive + false_negative) else 0.0

    return EvalResult(
        precision=precision,
        recall=recall,
        thresholds={"window": warmup, "multiplier": 3.0},
        detections=sorted(detection_set),
        anomalies=sorted(anomaly_set),
    )


def main() -> None:
    length = 24 * 40
    base_series = generate_series(seed=1337, length=length)
    series, anomalies = inject_anomalies(base_series)
    window = 24 * 7
    multiplier = 3.0
    detections = detect(series, window=window, multiplier=multiplier)
    result = score(detections, anomalies, warmup=window)

    evidence_dir = Path("metrics/evidence/eval_anomaly_detection")
    evidence_dir.mkdir(parents=True, exist_ok=True)
    metrics_payload = {
        "precision": result.precision,
        "recall": result.recall,
        "anomalies": result.anomalies,
        "detections": result.detections,
        "settings": {"window": window, "multiplier": multiplier, "seed": 1337},
        "series_length": length,
        "anomaly_types": ["ingestion_drop", "loader_drop", "schema_drift_spike"],
    }
    (evidence_dir / "metrics.json").write_text(json.dumps(metrics_payload, sort_keys=True, indent=2))

    if result.precision < 0.95 or result.recall < 0.9:
        raise SystemExit("Precision/recall thresholds not met")


if __name__ == "__main__":
    main()
