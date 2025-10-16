"""Statistical utilities for the SCBA harness."""

from __future__ import annotations

import math
import random
from collections.abc import Sequence


def difference_of_means(sample_a: Sequence[float], sample_b: Sequence[float]) -> float:
    return mean(sample_a) - mean(sample_b)


def mean(values: Sequence[float]) -> float:
    return sum(values) / float(len(values))


def variance(values: Sequence[float]) -> float:
    if len(values) < 2:
        return 0.0
    mu = mean(values)
    return sum((x - mu) ** 2 for x in values) / float(len(values) - 1)


def pooled_standard_error(sample_a: Sequence[float], sample_b: Sequence[float]) -> float:
    return math.sqrt(
        variance(sample_a) / max(len(sample_a), 1) + variance(sample_b) / max(len(sample_b), 1)
    )


def welch_t(sample_a: Sequence[float], sample_b: Sequence[float]) -> float:
    se = pooled_standard_error(sample_a, sample_b)
    diff = difference_of_means(sample_a, sample_b)
    if se == 0:
        if diff == 0:
            return 0.0
        return float("inf")
    return diff / se


def welch_degrees_of_freedom(sample_a: Sequence[float], sample_b: Sequence[float]) -> float:
    var_a = variance(sample_a)
    var_b = variance(sample_b)
    n_a = len(sample_a)
    n_b = len(sample_b)
    numerator = (var_a / n_a + var_b / n_b) ** 2
    denominator = ((var_a / n_a) ** 2) / (n_a - 1) + ((var_b / n_b) ** 2) / (n_b - 1)
    if denominator == 0:
        return float("inf")
    return numerator / denominator


def normal_cdf(x: float) -> float:
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def welch_p_value(sample_a: Sequence[float], sample_b: Sequence[float]) -> float:
    t_stat = abs(welch_t(sample_a, sample_b))
    if math.isinf(t_stat):
        return 0.0
    df = welch_degrees_of_freedom(sample_a, sample_b)
    # Approximate the Student-t CDF with the normal distribution when df is large.
    if df > 30:
        return 2 * (1 - normal_cdf(t_stat))
    # For smaller df we fall back to a permutation test.
    return permutation_test(sample_a, sample_b, iterations=2000)


def permutation_test(
    sample_a: Sequence[float], sample_b: Sequence[float], iterations: int = 1000
) -> float:
    combined = list(sample_a) + list(sample_b)
    observed = abs(difference_of_means(sample_a, sample_b))
    count = 0
    rng = random.Random(0)
    for _ in range(iterations):
        shuffled = combined[:]
        rng.shuffle(shuffled)
        new_a = shuffled[: len(sample_a)]
        new_b = shuffled[len(sample_a) :]
        if abs(difference_of_means(new_a, new_b)) >= observed:
            count += 1
    return count / iterations


def effect_size(sample_a: Sequence[float], sample_b: Sequence[float]) -> float:
    return abs(difference_of_means(sample_a, sample_b))
