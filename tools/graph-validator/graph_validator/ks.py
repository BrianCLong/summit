import math
from typing import List, Tuple
from .sketch import LogBinSketch

def ks_distance(sketch1: LogBinSketch, sketch2: LogBinSketch) -> float:
    """
    Computes the Kolmogorov-Smirnov distance between two sketches.
    D = sup |F1(x) - F2(x)|
    """
    cdf1 = sketch1.get_cdf()
    cdf2 = sketch2.get_cdf()

    if not cdf1 and not cdf2:
        return 0.0
    if not cdf1 or not cdf2:
        return 1.0

    # Merge all evaluation points
    points = set()
    for v, _ in cdf1:
        points.add(v)
    for v, _ in cdf2:
        points.add(v)

    sorted_points = sorted(list(points))

    max_diff = 0.0

    # Pointers to current CDF values
    p1 = 0.0
    p2 = 0.0

    idx1 = 0
    idx2 = 0

    for x in sorted_points:
        # Update p1 if x matches a point in cdf1 (or we passed it)
        # Since cdf values are upper bounds of bins, we step when x >= bin_upper_bound
        # Wait, the CDF is a step function.
        # The value jumps at the observation points.
        # Since we use bin upper bounds as the x coordinates, the CDF value is valid for x.

        while idx1 < len(cdf1) and cdf1[idx1][0] <= x:
            p1 = cdf1[idx1][1]
            idx1 += 1

        while idx2 < len(cdf2) and cdf2[idx2][0] <= x:
            p2 = cdf2[idx2][1]
            idx2 += 1

        diff = abs(p1 - p2)
        if diff > max_diff:
            max_diff = diff

    return max_diff

def ks_p_value_approx(d: float, n1: int, n2: int) -> float:
    """
    Asymptotic p-value approximation for KS test.
    Note: strictly valid for continuous distributions, used here as heuristic.
    """
    if n1 == 0 or n2 == 0:
        return 1.0

    m = (n1 * n2) / (n1 + n2)
    lambda_val = (m ** 0.5) * d

    # Kolmogorov distribution approximation
    # P(K > lambda) = 2 * sum((-1)^(k-1) * exp(-2*k^2*lambda^2))
    # We use the first few terms

    p = 0.0
    for k in range(1, 20):
        term = 2 * ((-1) ** (k - 1)) * math.exp(-2 * (k ** 2) * (lambda_val ** 2))
        p += term

    return min(max(p, 0.0), 1.0)
