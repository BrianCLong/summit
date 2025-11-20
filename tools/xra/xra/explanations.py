"""Model-agnostic explanation utilities for ranking shifts."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Dict, Iterable, List, Tuple

from .models import QueryResult, RankedDocument, RetrievalLog


@dataclass
class Explanation:
    query_id: str
    doc_id: str
    baseline_rank: int
    candidate_rank: int
    rank_shift: int
    shap_contributions: Dict[str, float]
    ablation_effects: Dict[str, float]
    intercept: float
    predicted_score: float


def _solve_linear_system(matrix: List[List[float]], vector: List[float]) -> List[float]:
    """Gaussian elimination with partial pivoting."""

    n = len(vector)
    for i in range(n):
        # Pivot selection
        pivot = i
        max_value = abs(matrix[i][i])
        for r in range(i + 1, n):
            if abs(matrix[r][i]) > max_value:
                max_value = abs(matrix[r][i])
                pivot = r
        if max_value == 0:
            continue
        if pivot != i:
            matrix[i], matrix[pivot] = matrix[pivot], matrix[i]
            vector[i], vector[pivot] = vector[pivot], vector[i]
        pivot_value = matrix[i][i]
        for j in range(i, n):
            matrix[i][j] /= pivot_value
        vector[i] /= pivot_value
        for r in range(i + 1, n):
            factor = matrix[r][i]
            if factor == 0:
                continue
            for c in range(i, n):
                matrix[r][c] -= factor * matrix[i][c]
            vector[r] -= factor * vector[i]
    # Back substitution
    solution = [0.0 for _ in range(n)]
    for i in range(n - 1, -1, -1):
        value = vector[i]
        for j in range(i + 1, n):
            value -= matrix[i][j] * solution[j]
        solution[i] = value
    return solution


def _fit_linear_model(log: RetrievalLog) -> Tuple[List[str], Dict[str, float]]:
    feature_names = sorted(log.feature_names())
    if not feature_names:
        return [], {"__intercept__": 0.0}
    rows: List[List[float]] = []
    targets: List[float] = []
    for query in log.queries:
        for doc in query.results:
            rows.append([1.0] + [doc.features.get(name, 0.0) for name in feature_names])
            targets.append(doc.score)
    cols = len(feature_names) + 1
    xtx = [[0.0 for _ in range(cols)] for _ in range(cols)]
    xty = [0.0 for _ in range(cols)]
    for row, target in zip(rows, targets):
        for i in range(cols):
            xty[i] += row[i] * target
            for j in range(cols):
                xtx[i][j] += row[i] * row[j]
    weights = _solve_linear_system(xtx, xty)
    params = {feature: weight for feature, weight in zip(["__intercept__"] + feature_names, weights)}
    return feature_names, params


def _compute_means(log: RetrievalLog, feature_names: Iterable[str]) -> Dict[str, float]:
    totals = {name: 0.0 for name in feature_names}
    counts = {name: 0 for name in feature_names}
    for query in log.queries:
        for doc in query.results:
            for name in feature_names:
                totals[name] += doc.features.get(name, 0.0)
                counts[name] += 1
    return {name: (totals[name] / counts[name]) if counts[name] else 0.0 for name in feature_names}


def _shap_contributions(
    features: Dict[str, float],
    weights: Dict[str, float],
    means: Dict[str, float],
) -> Dict[str, float]:
    contributions: Dict[str, float] = {}
    for name, value in features.items():
        weight = weights.get(name, 0.0)
        baseline = means.get(name, 0.0)
        contributions[name] = weight * (value - baseline)
    return contributions


def _ablation_effects(
    features: Dict[str, float],
    weights: Dict[str, float],
) -> Dict[str, float]:
    effects: Dict[str, float] = {}
    for name, value in features.items():
        effects[name] = weights.get(name, 0.0) * value
    return effects


def explain_rank_shift(
    baseline: RetrievalLog,
    candidate: RetrievalLog,
    top_n: int = 5,
) -> List[Explanation]:
    """Generate explanations for the largest absolute rank shifts."""

    random.seed(1729)
    feature_names, weights = _fit_linear_model(candidate)
    means = _compute_means(candidate, feature_names)

    baseline_index: Dict[Tuple[str, str], RankedDocument] = {}
    for query in baseline.queries:
        for doc in query.results:
            baseline_index[(query.query_id, doc.doc_id)] = doc

    shifts: List[Tuple[int, str, str, RankedDocument]] = []
    for query in candidate.queries:
        for doc in query.results:
            key = (query.query_id, doc.doc_id)
            if key not in baseline_index:
                continue
            baseline_doc = baseline_index[key]
            shift = baseline_doc.rank - doc.rank
            shifts.append((abs(shift), query.query_id, doc.doc_id, doc))
    shifts.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
    selected = shifts[:top_n]

    explanations: List[Explanation] = []
    for _, query_id, doc_id, doc in selected:
        baseline_doc = baseline_index[(query_id, doc_id)]
        shap_values = _shap_contributions(doc.features, weights, means)
        ablations = _ablation_effects(doc.features, weights)
        intercept = weights.get("__intercept__", 0.0)
        predicted = intercept + sum(weights.get(name, 0.0) * doc.features.get(name, 0.0) for name in feature_names)
        explanations.append(
            Explanation(
                query_id=query_id,
                doc_id=doc_id,
                baseline_rank=baseline_doc.rank,
                candidate_rank=doc.rank,
                rank_shift=baseline_doc.rank - doc.rank,
                shap_contributions=shap_values,
                ablation_effects=ablations,
                intercept=intercept,
                predicted_score=predicted,
            )
        )
    return explanations
