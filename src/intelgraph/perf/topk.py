import heapq
from collections.abc import Sequence

try:
    # Attempt to import hypothetical native module
    from intelgraph.perf._native import topk_indices as _native_topk_indices  # type: ignore

    _HAS_NATIVE = True
except ImportError:
    _HAS_NATIVE = False


def _python_topk_indices(scores: Sequence[float], k: int) -> list[int]:
    """
    Pure Python implementation of top-k indices.
    Deterministic tie-breaking: lower index wins.
    """
    if k <= 0:
        return []

    n = len(scores)
    if k >= n:
        # If k >= n, return indices sorted by score descending, then index ascending
        indices = list(range(n))
        indices.sort(key=lambda i: (-scores[i], i))
        return indices

    # Use heapq.nlargest
    # We store (score, -index) because heapq.nlargest uses > comparison.
    # Larger tuple means "better".
    # (score, -idx1) > (score, -idx2) implies -idx1 > -idx2 => idx1 < idx2.
    # So for same score, smaller index is preferred.

    items = [(scores[i], -i) for i in range(n)]
    top_k_items = heapq.nlargest(k, items)

    # Extract indices and negate them back
    return [-idx for score, idx in top_k_items]


def topk_indices(scores: Sequence[float], k: int) -> list[int]:
    """
    Return indices of the k largest elements in scores.
    Tie-breaking: lower index wins.
    """
    if _HAS_NATIVE:
        return _native_topk_indices(scores, k)
    return _python_topk_indices(scores, k)
