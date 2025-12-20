"""Cohort slicing helpers."""

from __future__ import annotations

from typing import Mapping

from .aggregates import CohortKey, SecureAggregatedMetrics


def slice_metrics(
    metrics: Mapping[CohortKey, SecureAggregatedMetrics],
    filters: Mapping[str, str],
):
    selected = {}
    for cohort, metric in metrics.items():
        cohort_dict = dict(cohort)
        if all(cohort_dict.get(key) == value for key, value in filters.items()):
            selected[cohort] = metric
    return selected

