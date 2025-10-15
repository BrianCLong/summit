#!/usr/bin/env python3
"""Environment-aware synthetic data checks for Python services."""
from __future__ import annotations

import json
import os
from pathlib import Path
import sys
from typing import NoReturn

ENVIRONMENT = os.getenv("TEST_ENVIRONMENT", "dev")
DATA_PATH = Path(
    os.getenv("SYNTHETIC_DATA_PATH", Path(__file__).parent / "data" / "synthetic-test-data.json")
)

THRESHOLDS = {
    "dev": {"confidence": 0.6, "max_anomalies": 3},
    "staging": {"confidence": 0.75, "max_anomalies": 2},
    "prod": {"confidence": 0.9, "max_anomalies": 1},
}


def fail(message: str) -> NoReturn:
    print(f"Python service synthetic test failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_data(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except Exception as exc:  # noqa: BLE001 - surfacing failure context
        fail(f"Unable to load synthetic data from {path}: {exc}")


def main() -> None:
    data = load_data(DATA_PATH)
    samples = [
        sample
        for sample in data.get("pythonService", [])
        if sample.get("environment") == ENVIRONMENT
    ]

    if not samples:
        fail(f"No synthetic sample found for environment '{ENVIRONMENT}'.")

    sample = samples[0]
    thresholds = THRESHOLDS.get(ENVIRONMENT)
    if thresholds is None:
        fail(f"No threshold defined for environment '{ENVIRONMENT}'.")

    confidence = float(sample.get("confidence", 0))
    if confidence < thresholds["confidence"]:
        fail(
            "Confidence score {:.2f} below threshold {:.2f} for environment '{}'".format(
                confidence, thresholds["confidence"], ENVIRONMENT
            )
        )

    anomalies = int(sample.get("anomaliesDetected", -1))
    if anomalies < 0:
        fail("Anomaly count missing from synthetic dataset.")

    if anomalies > thresholds["max_anomalies"]:
        fail(
            "Synthetic anomaly count {} exceeds limit {} for environment '{}'".format(
                anomalies, thresholds["max_anomalies"], ENVIRONMENT
            )
        )

    synthetic_events = int(sample.get("syntheticEvents", 0))
    if synthetic_events <= 0:
        fail("Synthetic events must be a positive integer.")

    if ENVIRONMENT == "prod" and synthetic_events < 10:
        fail("Production synthetic dataset should contain at least 10 events for regression coverage.")

    print(
        "Python service synthetic validation succeeded for {}. Confidence={:.2f}, anomalies={}, events={}.".format(
            ENVIRONMENT, confidence, anomalies, synthetic_events
        )
    )


if __name__ == "__main__":
    main()
