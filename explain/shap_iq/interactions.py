"""Pairwise interaction utilities for deterministic SHAP-IQ style outputs."""

from __future__ import annotations

from typing import Iterable


def pairwise_interaction_matrix(contributions: list[list[float]]) -> list[list[float]]:
    """Compute a symmetric interaction matrix from per-row per-feature contributions."""
    if not contributions:
        return []

    feature_count = len(contributions[0])
    n = len(contributions)
    matrix = [[0.0 for _ in range(feature_count)] for _ in range(feature_count)]

    for row in contributions:
        if len(row) != feature_count:
            raise ValueError("all contribution rows must have equal feature length")
        for i in range(feature_count):
            for j in range(i, feature_count):
                matrix[i][j] += row[i] * row[j]

    for i in range(feature_count):
        for j in range(i, feature_count):
            value = matrix[i][j] / n
            matrix[i][j] = value
            matrix[j][i] = value

    return matrix


def interaction_strength_mean(matrix: list[list[float]]) -> float:
    if not matrix:
        return 0.0
    total = 0.0
    count = 0
    size = len(matrix)
    for i in range(size):
        for j in range(size):
            if i != j:
                total += abs(matrix[i][j])
                count += 1
    return total / count if count else 0.0


def assert_symmetric(matrix: Iterable[Iterable[float]], tolerance: float = 1e-12) -> None:
    matrix_rows = [list(row) for row in matrix]
    for i, row in enumerate(matrix_rows):
        for j, value in enumerate(row):
            if abs(value - matrix_rows[j][i]) > tolerance:
                raise ValueError(f"interaction matrix is not symmetric at ({i}, {j})")
