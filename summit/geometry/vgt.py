import math
from typing import Sequence, List

def euclidean_dist_sq(p1: Sequence[float], p2: Sequence[float]) -> float:
    return sum((a - b) ** 2 for a, b in zip(p1, p2))

def compute_local_dimensions(
    points: Sequence[Sequence[float]],
    k1: int = 4,
    k2: int = 8
) -> List[float]:
    """
    Computes local dimension for each point using k1, k2 nearest neighbors.
    Formula: d = log(k2/k1) / log(r2/r1)
    Using squared distances: d = 2 * log(k2/k1) / log(r2^2 / r1^2)
    """
    dims = []
    n = len(points)
    if n <= k2:
        return [0.0] * n

    for i in range(n):
        dists = []
        for j in range(n):
            if i == j: continue
            dists.append(euclidean_dist_sq(points[i], points[j]))
        dists.sort()

        r1_sq = dists[k1 - 1]
        r2_sq = dists[k2 - 1]

        if r1_sq <= 1e-9 or r2_sq <= 1e-9 or r1_sq == r2_sq:
            dims.append(0.0)
        else:
            dim = 2.0 * math.log(k2 / k1) / math.log(r2_sq / r1_sq)
            dims.append(dim)

    return dims
