"""Synthetic benchmark for the PostgreSQL preprocessing pipeline."""

from __future__ import annotations

import json
from statistics import mean
from time import perf_counter
from typing import Dict, Iterable

import dask.dataframe as dd
import numpy as np
import pandas as pd

from ml.app.pipelines import PostgresPreprocessingPipeline


def _synthetic_loader(rows: int, npartitions: int) -> dd.DataFrame:
    rng = np.random.default_rng(seed=42)
    pdf = pd.DataFrame(
        {
            "id": np.arange(rows),
            "tenantId": np.where(rng.random(rows) > 0.5, "t1", "t2"),
            "signal_a": rng.normal(loc=100.0, scale=12.0, size=rows),
            "signal_b": rng.normal(loc=50.0, scale=5.0, size=rows),
            "signal_c": rng.normal(loc=10.0, scale=2.5, size=rows),
        }
    )
    return dd.from_pandas(pdf, npartitions=npartitions)


def run_benchmark(rows: int = 50_000, repeats: int = 3) -> Dict[str, float | Dict[str, float]]:
    timings: list[Dict[str, float]] = []
    anomaly_rates: list[float] = []

    for _ in range(repeats):
        pipeline = PostgresPreprocessingPipeline(
            connection_uri="postgresql://benchmark", data_loader=lambda: _synthetic_loader(rows, npartitions=8)
        )
        start = perf_counter()
        result = pipeline.run()
        # Force computation so timings are comparable
        result.dataframe.persist().compute()
        overall = (perf_counter() - start) * 1000.0
        stage_timings = dict(result.quality_insights["timingsMs"])
        stage_timings["total"] = overall
        timings.append(stage_timings)
        anomaly_rates.append(result.quality_insights["anomalySummary"]["anomalyRate"])

    aggregated: Dict[str, float] = {}
    keys: Iterable[str] = {key for timing in timings for key in timing}
    for key in keys:
        aggregated[key] = mean(timing.get(key, 0.0) for timing in timings)

    return {
        "rows": float(rows),
        "averageStageMs": aggregated,
        "averageAnomalyRate": mean(anomaly_rates) if anomaly_rates else 0.0,
    }


def main() -> None:
    summary = run_benchmark()
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
