"""Micro benchmark for entity resolution latency."""

from __future__ import annotations

import csv
import time
from pathlib import Path

from .pipeline import ERPipeline


def run_bench() -> float:
    data_path = Path(__file__).resolve().parents[2] / "tests" / "data" / "er_eval.csv"
    records = {}
    pairs = []
    with data_path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            records[row["id1"]] = row["name1"]
            records[row["id2"]] = row["name2"]
            pairs.append((row["id1"], row["id2"], int(row["label"])))
    pipeline = ERPipeline()
    pipeline.fit(records)
    pipeline.calibrate_threshold(pairs)
    start = time.perf_counter()
    for _ in range(100):
        pipeline.resolve()
    duration = (time.perf_counter() - start) / 100
    return duration / len(records)


def main() -> None:
    latency = run_bench() * 1000
    print(f"avg_latency_ms={latency:.2f}")


if __name__ == "__main__":
    main()
