"""Scaling-law and response-surface modeling utilities."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, List, Sequence

from .core import Config, Experiment, Metrics


@dataclass
class ScalingFit:
    """Represents a simple power-law fit: metric ≈ a * compute**b."""

    coefficient: float
    exponent: float

    def predict(self, compute: float) -> float:
        return self.coefficient * compute ** self.exponent


@dataclass
class LinearModel:
    """Simple linear regression for response surfaces."""

    weights: List[float]
    intercept: float
    feature_names: Sequence[str]

    def predict(self, features: Sequence[float]) -> float:
        return sum(w * x for w, x in zip(self.weights, features)) + self.intercept


def _safe_log(value: float) -> float:
    return math.log(value + 1e-9)


def fit_power_law(experiments: Iterable[Experiment], metric: str = "training_loss") -> ScalingFit:
    """Fit a power law using log-linear regression on compute (flops) and metric."""

    xs: List[float] = []
    ys: List[float] = []
    for exp in experiments:
        flops = exp.metrics.flops or 0.0
        metric_value = getattr(exp.metrics, metric, None)
        if flops <= 0 or metric_value is None:
            continue
        xs.append(_safe_log(flops))
        ys.append(_safe_log(metric_value))

    if len(xs) < 2:
        raise ValueError("At least two experiments with flops and metric are required")

    # simple least squares for slope and intercept
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denominator = sum((x - mean_x) ** 2 for x in xs)
    slope = numerator / denominator if denominator else 0.0
    intercept = mean_y - slope * mean_x

    coefficient = math.exp(intercept)
    exponent = slope
    return ScalingFit(coefficient=coefficient, exponent=exponent)


def _config_features(config: Config) -> List[float]:
    # Normalize basic configuration knobs for regression
    data_mix_sum = sum(config.data_mix.values()) or 1.0
    return [
        config.parameters,
        config.depth or 0.0,
        config.width or 0.0,
        config.context_length or 0.0,
        1.0 if config.moe else 0.0,
        config.learning_rate or 0.0,
        config.curriculum and 1.0 or 0.0,
        data_mix_sum,
    ]


def fit_linear_response_surface(experiments: Iterable[Experiment], metric: str = "reasoning_score") -> LinearModel:
    """Fit a simple linear regression of metric ~ config features."""

    feature_matrix: List[List[float]] = []
    targets: List[float] = []
    for exp in experiments:
        metric_value = getattr(exp.metrics, metric, None)
        if metric_value is None:
            continue
        feature_matrix.append(_config_features(exp.config))
        targets.append(metric_value)

    if len(feature_matrix) < 2:
        raise ValueError("At least two experiments with the requested metric are required")

    # Closed-form linear regression using normal equations (no regularization).
    # X shape: n x k
    n = len(feature_matrix)
    k = len(feature_matrix[0])

    # Compute X^T X and X^T y with a small ridge term for stability
    xtx = [[0.0 for _ in range(k)] for _ in range(k)]
    xty = [0.0 for _ in range(k)]

    for row, target in zip(feature_matrix, targets):
        for i in range(k):
            xty[i] += row[i] * target
            for j in range(k):
                xtx[i][j] += row[i] * row[j]

    ridge = 1e-3
    for i in range(k):
        xtx[i][i] += ridge

    # Solve xtx * weights = xty using Gaussian elimination
    weights = _solve_linear_system(xtx, xty)

    # Compute intercept as mean residual
    predictions = [sum(w * x for w, x in zip(weights, row)) for row in feature_matrix]
    residuals = [t - p for t, p in zip(targets, predictions)]
    intercept = sum(residuals) / n

    feature_names = [
        "parameters",
        "depth",
        "width",
        "context_length",
        "moe",
        "learning_rate",
        "curriculum",
        "data_mix_total",
    ]
    return LinearModel(weights=weights, intercept=intercept, feature_names=feature_names)


def _solve_linear_system(matrix: List[List[float]], vector: List[float]) -> List[float]:
    """Solve a linear system using Gaussian elimination."""

    n = len(vector)
    # Augment matrix with vector
    aug = [row[:] + [vector[i]] for i, row in enumerate(matrix)]

    for i in range(n):
        # Pivot
        pivot = aug[i][i]
        if abs(pivot) < 1e-12:
            # swap with a lower row that has a non-zero pivot
            for j in range(i + 1, n):
                if abs(aug[j][i]) > 1e-12:
                    aug[i], aug[j] = aug[j], aug[i]
                    pivot = aug[i][i]
                    break
        if abs(pivot) < 1e-12:
            raise ValueError("Singular matrix in regression fit")

        # Normalize row
        for j in range(i, n + 1):
            aug[i][j] /= pivot

        # Eliminate other rows
        for k in range(n):
            if k == i:
                continue
            factor = aug[k][i]
            for j in range(i, n + 1):
                aug[k][j] -= factor * aug[i][j]

    return [aug[i][n] for i in range(n)]
