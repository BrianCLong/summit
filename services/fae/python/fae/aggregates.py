"""Secure aggregation utilities for FAE."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Tuple

CohortKey = Tuple[Tuple[str, str], ...]
Path = Tuple[str, ...]


def _normalize_cohort(cohort: Optional[Mapping[str, str]]) -> CohortKey:
    if not cohort:
        return ()
    return tuple(sorted((str(k), str(v)) for k, v in cohort.items()))


@dataclass
class CupedAggregate:
    """Aggregated statistics required for CUPED uplift."""

    n: int = 0
    sum_y: float = 0.0
    sum_y2: float = 0.0
    sum_x: float = 0.0
    sum_x2: float = 0.0
    sum_xy: float = 0.0

    def add(self, y: float, x: float) -> None:
        self.n += 1
        self.sum_y += y
        self.sum_y2 += y * y
        self.sum_x += x
        self.sum_x2 += x * x
        self.sum_xy += x * y

    def merge(self, other: "CupedAggregate") -> None:
        self.n += other.n
        self.sum_y += other.sum_y
        self.sum_y2 += other.sum_y2
        self.sum_x += other.sum_x
        self.sum_x2 += other.sum_x2
        self.sum_xy += other.sum_xy

    @property
    def mean_y(self) -> float:
        return self.sum_y / self.n if self.n else 0.0

    @property
    def mean_x(self) -> float:
        return self.sum_x / self.n if self.n else 0.0


@dataclass
class SecureAggregatedMetrics:
    """Securely aggregated metrics for a cohort."""

    cohort: CohortKey
    control: CupedAggregate = field(default_factory=CupedAggregate)
    treatment: CupedAggregate = field(default_factory=CupedAggregate)
    path_conversions: MutableMapping[Path, float] = field(default_factory=dict)
    metadata: MutableMapping[str, Any] = field(default_factory=dict)

    def copy(self) -> "SecureAggregatedMetrics":
        clone = SecureAggregatedMetrics(cohort=self.cohort)
        clone.control = CupedAggregate(
            self.control.n,
            self.control.sum_y,
            self.control.sum_y2,
            self.control.sum_x,
            self.control.sum_x2,
            self.control.sum_xy,
        )
        clone.treatment = CupedAggregate(
            self.treatment.n,
            self.treatment.sum_y,
            self.treatment.sum_y2,
            self.treatment.sum_x,
            self.treatment.sum_x2,
            self.treatment.sum_xy,
        )
        clone.path_conversions = dict(self.path_conversions)
        clone.metadata = dict(self.metadata)
        return clone


class SecureAggregator:
    """Creates secure aggregates from raw event data."""

    def __init__(self, metrics: Mapping[CohortKey, SecureAggregatedMetrics]):
        self._metrics = dict(metrics)

    @property
    def metrics(self) -> Mapping[CohortKey, SecureAggregatedMetrics]:
        return self._metrics

    @classmethod
    def from_events(
        cls,
        events: Iterable[Mapping[str, Any]],
        cohort_keys: Optional[Iterable[str]] = None,
    ) -> "SecureAggregator":
        metrics: Dict[CohortKey, SecureAggregatedMetrics] = {}
        keys: Optional[List[str]] = list(cohort_keys) if cohort_keys else None

        for event in events:
            cohort_data = event.get("cohort", {})
            cohort = (
                _normalize_cohort({k: cohort_data.get(k, "undefined") for k in keys})
                if keys
                else _normalize_cohort(cohort_data)
            )
            record = metrics.setdefault(cohort, SecureAggregatedMetrics(cohort))

            group = str(event.get("group", "control")).lower()
            y = float(event.get("outcome", 0.0))
            x = float(event.get("covariate", 0.0))
            if group == "treatment":
                record.treatment.add(y, x)
            else:
                record.control.add(y, x)

            path = tuple(event.get("path", ()))
            if path:
                record.path_conversions[path] = record.path_conversions.get(path, 0.0) + float(
                    event.get("conversions", 1.0)
                )

        return cls(metrics)

    def combine(self, other: "SecureAggregator") -> "SecureAggregator":
        merged: Dict[CohortKey, SecureAggregatedMetrics] = {
            key: metric.copy() for key, metric in self._metrics.items()
        }
        for cohort, metric in other.metrics.items():
            target = merged.setdefault(cohort, SecureAggregatedMetrics(cohort)).copy()
            target.control.merge(metric.control)
            target.treatment.merge(metric.treatment)
            for path, value in metric.path_conversions.items():
                target.path_conversions[path] = target.path_conversions.get(path, 0.0) + value
            merged[cohort] = target
        return SecureAggregator(merged)

