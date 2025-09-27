"""Privacy metric calculations for categorical data."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

from .report import (
    KMappViolation,
    LDiversityViolation,
    PrivacyEvaluationReport,
    TClosenessViolation,
    QuasiIdentifier,
)


Row = Mapping[str, Any]


def _normalise_rows(rows: Iterable[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    return [dict(row) for row in rows]


def build_population_map(rows: Iterable[Row], qi_columns: Sequence[str]) -> Dict[QuasiIdentifier, int]:
    """Build a frequency map over quasi identifier combinations."""

    population_counts: Dict[QuasiIdentifier, int] = Counter()
    for row in rows:
        key = tuple(row[column] for column in qi_columns)
        population_counts[key] += 1
    return dict(population_counts)


def _group_by_qi(rows: Iterable[Row], qi_columns: Sequence[str]) -> Dict[QuasiIdentifier, List[Dict[str, Any]]]:
    grouped: Dict[QuasiIdentifier, List[Dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = tuple(row[column] for column in qi_columns)
        grouped[key].append(dict(row))
    return grouped


def _distribution(values: Iterable[Any]) -> Dict[Any, float]:
    total = 0
    counts: Dict[Any, int] = Counter()
    for value in values:
        counts[value] += 1
        total += 1
    if total == 0:
        return {}
    return {value: count / float(total) for value, count in counts.items()}


def _total_variation_distance(p: Mapping[Any, float], q: Mapping[Any, float]) -> float:
    support = set(p) | set(q)
    distance = 0.0
    for value in support:
        distance += abs(p.get(value, 0.0) - q.get(value, 0.0))
    return 0.5 * distance


def _hellinger_distance(p: Mapping[Any, float], q: Mapping[Any, float]) -> float:
    from math import sqrt

    support = set(p) | set(q)
    accum = 0.0
    for value in support:
        accum += (sqrt(p.get(value, 0.0)) - sqrt(q.get(value, 0.0))) ** 2
    return (accum / 2.0) ** 0.5


_DISTANCE_METRICS = {
    "total_variation": _total_variation_distance,
    "hellinger": _hellinger_distance,
}


def evaluate_privacy(
    rows: Iterable[Row],
    *,
    quasi_identifier_columns: Sequence[str],
    sensitive_columns: Sequence[str],
    k_map_threshold: int | None = None,
    population_map: Mapping[QuasiIdentifier, int] | None = None,
    l_diversity_threshold: int | None = None,
    t_closeness_threshold: float | None = None,
    t_closeness_metrics: Sequence[str] | None = None,
) -> PrivacyEvaluationReport:
    """Evaluate privacy guarantees and return a structured report."""

    records = _normalise_rows(rows)
    grouped = _group_by_qi(records, quasi_identifier_columns)
    population_map = (
        dict(population_map)
        if population_map is not None
        else build_population_map(records, quasi_identifier_columns)
    )

    k_map_violations: List[KMappViolation] = []
    if k_map_threshold is not None and k_map_threshold > 0:
        for key, sample_rows in grouped.items():
            population_count = population_map.get(key, len(sample_rows))
            if population_count < k_map_threshold:
                violation = KMappViolation(
                    quasi_identifier=key,
                    sample_count=len(sample_rows),
                    population_count=population_count,
                    risk=1.0 / max(population_count, 1),
                )
                k_map_violations.append(violation)
        k_map_violations.sort(key=lambda violation: violation.quasi_identifier)

    l_diversity_violations: List[LDiversityViolation] = []
    if l_diversity_threshold is not None and l_diversity_threshold > 0:
        for key, sample_rows in grouped.items():
            for sensitive in sensitive_columns:
                values = {row.get(sensitive) for row in sample_rows}
                if len(values) < l_diversity_threshold:
                    violation = LDiversityViolation(
                        quasi_identifier=key,
                        sensitive_attribute=sensitive,
                        distinct_sensitive_values=len(values),
                    )
                    l_diversity_violations.append(violation)
        l_diversity_violations.sort(
            key=lambda violation: (violation.quasi_identifier, violation.sensitive_attribute)
        )

    t_closeness_violations: List[TClosenessViolation] = []
    if (
        t_closeness_threshold is not None
        and t_closeness_threshold > 0
        and sensitive_columns
    ):
        metrics = list(t_closeness_metrics or _DISTANCE_METRICS.keys())
        global_distributions = {
            column: _distribution(row[column] for row in records)
            for column in sensitive_columns
        }
        for key, sample_rows in grouped.items():
            for sensitive in sensitive_columns:
                class_distribution = _distribution(row[sensitive] for row in sample_rows)
                global_distribution = global_distributions[sensitive]
                for metric in metrics:
                    distance_fn = _DISTANCE_METRICS.get(metric)
                    if distance_fn is None:
                        raise ValueError(f"Unsupported distance metric: {metric}")
                    distance = distance_fn(class_distribution, global_distribution)
                    if distance > t_closeness_threshold:
                        violation = TClosenessViolation(
                            quasi_identifier=key,
                            sensitive_attribute=sensitive,
                            metric=metric,
                            distance=distance,
                        )
                        t_closeness_violations.append(violation)
        t_closeness_violations.sort(
            key=lambda violation: (
                violation.quasi_identifier,
                violation.sensitive_attribute,
                violation.metric,
            )
        )

    return PrivacyEvaluationReport(
        quasi_identifier_columns=list(quasi_identifier_columns),
        sensitive_columns=list(sensitive_columns),
        k_map_threshold=k_map_threshold,
        l_diversity_threshold=l_diversity_threshold,
        t_closeness_threshold=t_closeness_threshold,
        t_closeness_metrics=list(t_closeness_metrics or _DISTANCE_METRICS.keys()),
        k_map_violations=k_map_violations,
        l_diversity_violations=l_diversity_violations,
        t_closeness_violations=t_closeness_violations,
    )


__all__ = [
    "evaluate_privacy",
    "build_population_map",
]
