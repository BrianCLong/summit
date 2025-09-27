"""Fairness and coverage metrics for ranked retrieval results."""

from __future__ import annotations

import math
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence

from .models import QueryResult, RetrievalLog


@dataclass
class MetricSummary:
    """Container for a metric value with per-query detail."""

    average: float
    by_query: Dict[str, float]


def _exposure(rank: int) -> float:
    # Logarithmic discount used in ranking metrics.
    return 1.0 / math.log2(rank + 1.5)


def exposure_disparity(log: RetrievalLog, k: int | None = None) -> Dict[str, float]:
    """Compute average discounted exposure for each group."""

    exposures: Dict[str, float] = defaultdict(float)
    total_queries = max(len(log.queries), 1)
    for query in log.queries:
        for doc in query.results:
            if k is not None and doc.rank > k:
                continue
            exposures[doc.group] += _exposure(doc.rank)
    for group in exposures:
        exposures[group] /= total_queries
    if not exposures:
        return {"max_gap": 0.0, "ratio": 1.0, "per_group": {}}
    max_exp = max(exposures.values())
    min_exp = min(exposures.values())
    ratio = max_exp / (min_exp + 1e-9)
    return {
        "max_gap": max_exp - min_exp,
        "ratio": ratio,
        "per_group": dict(sorted(exposures.items())),
    }


def fairness_at_k(log: RetrievalLog, k: int) -> MetricSummary:
    """Measure statistical parity of protected groups within top-k results."""

    global_counter: Counter[str] = Counter()
    for query in log.queries:
        for doc in query.results:
            global_counter[doc.group] += 1
    total_global = sum(global_counter.values()) or 1
    expected = {group: count / total_global for group, count in global_counter.items()}

    random.seed(42 + k)
    by_query: Dict[str, float] = {}
    scores: List[float] = []
    for query in log.queries:
        top_k = [doc for doc in query.results if doc.rank <= k]
        if not top_k:
            continue
        counter: Counter[str] = Counter(doc.group for doc in top_k)
        total = sum(counter.values()) or 1
        # Fill in missing groups with zero counts for consistent comparisons.
        observed = {group: counter.get(group, 0) / total for group in expected}
        # Jensen-Shannon-like parity score.
        divergence = 0.0
        for group, expected_share in expected.items():
            observed_share = observed.get(group, 0.0)
            divergence += abs(observed_share - expected_share)
        parity = 1.0 - divergence / 2.0
        # Add a small deterministic noise to break ties for reproducibility.
        parity = max(0.0, min(1.0, parity))
        by_query[query.query_id] = parity
        scores.append(parity)
    average = sum(scores) / len(scores) if scores else 1.0
    return MetricSummary(average=average, by_query=by_query)


def coverage_at_k(log: RetrievalLog, k: int) -> MetricSummary:
    """Compute the fraction of groups represented within top-k results."""

    groups = set(log.all_groups())
    by_query: Dict[str, float] = {}
    coverage_scores: List[float] = []
    for query in log.queries:
        present = {doc.group for doc in query.results if doc.rank <= k}
        if not groups:
            score = 1.0
        else:
            score = len(present) / len(groups)
        by_query[query.query_id] = score
        coverage_scores.append(score)
    average = sum(coverage_scores) / len(coverage_scores) if coverage_scores else 1.0
    return MetricSummary(average=average, by_query=by_query)


def compute_bias_metrics(
    baseline: RetrievalLog,
    candidate: RetrievalLog,
    k_values: Sequence[int] = (3, 5, 10),
) -> Dict[str, object]:
    """Compute coverage and fairness metrics for two retrieval logs."""

    random.seed(42)
    k_values = sorted({int(k) for k in k_values})

    base_metrics = {
        "exposure": exposure_disparity(baseline),
        "fairness": {k: fairness_at_k(baseline, k) for k in k_values},
        "coverage": {k: coverage_at_k(baseline, k) for k in k_values},
    }
    cand_metrics = {
        "exposure": exposure_disparity(candidate),
        "fairness": {k: fairness_at_k(candidate, k) for k in k_values},
        "coverage": {k: coverage_at_k(candidate, k) for k in k_values},
    }

    alerts: List[Dict[str, object]] = []

    base_ratio = base_metrics["exposure"]["ratio"] if base_metrics["exposure"] else 1.0
    cand_ratio = cand_metrics["exposure"]["ratio"] if cand_metrics["exposure"] else 1.0
    if cand_ratio - base_ratio > 0.15:
        alerts.append(
            {
                "type": "exposure",
                "severity": "high" if cand_ratio > base_ratio * 1.25 else "medium",
                "message": "Exposure disparity increased in candidate system",
                "baseline_ratio": round(base_ratio, 3),
                "candidate_ratio": round(cand_ratio, 3),
            }
        )

    for k in k_values:
        base_fair = base_metrics["fairness"][k].average
        cand_fair = cand_metrics["fairness"][k].average
        if cand_fair + 0.05 < base_fair:
            alerts.append(
                {
                    "type": "fairness@k",
                    "k": k,
                    "severity": "high" if base_fair - cand_fair > 0.15 else "medium",
                    "message": f"Fairness@{k} dropped by {base_fair - cand_fair:.3f}",
                    "baseline": round(base_fair, 3),
                    "candidate": round(cand_fair, 3),
                }
            )
        base_cov = base_metrics["coverage"][k].average
        cand_cov = cand_metrics["coverage"][k].average
        if cand_cov + 0.1 < base_cov:
            alerts.append(
                {
                    "type": "coverage@k",
                    "k": k,
                    "severity": "medium" if base_cov - cand_cov > 0.2 else "low",
                    "message": f"Coverage@{k} dropped by {base_cov - cand_cov:.3f}",
                    "baseline": round(base_cov, 3),
                    "candidate": round(cand_cov, 3),
                }
            )

    return {
        "baseline": base_metrics,
        "candidate": cand_metrics,
        "k_values": k_values,
        "alerts": alerts,
    }
