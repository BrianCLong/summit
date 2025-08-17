from __future__ import annotations

from typing import Dict, List, Any

import numpy as np
import stumpy
import hdbscan


def combine_summaries_and_forecasts(
    summaries: Dict[str, Dict[str, Any]],
    forecasts: Dict[str, List[float]],
) -> Dict[str, List[float]]:
    """Merge summarization timelines with forecasted values."""
    combined: Dict[str, List[float]] = {}
    for event_id, meta in summaries.items():
        timeline = list(meta.get("timeline", []))
        forecast = list(forecasts.get(event_id, []))
        combined[event_id] = timeline + forecast
    return combined


def cluster_event_timelines(
    time_series: Dict[str, List[float]],
    window_size: int | None = None,
    min_cluster_size: int = 2,
) -> Dict[int, List[str]]:
    """Cluster event time series by trend similarity using STUMPY and HDBSCAN."""
    if not time_series:
        return {}

    names = list(time_series.keys())
    series = [np.asarray(time_series[n], dtype=float) for n in names]

    length = min(len(s) for s in series)
    series = [s[:length] for s in series]

    m = window_size or max(2, length // 2)
    features = [stumpy.stump(s, m)[:, 0] for s in series]
    X = np.vstack(features)

    clusterer = hdbscan.HDBSCAN(metric="euclidean", min_cluster_size=min_cluster_size)
    labels = clusterer.fit_predict(X)

    clusters: Dict[int, List[str]] = {}
    for label, name in zip(labels, names):
        clusters.setdefault(int(label), []).append(name)
    return clusters
