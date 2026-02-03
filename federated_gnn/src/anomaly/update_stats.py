import math


def compute_norm(update: list[float]) -> float:
    return math.sqrt(sum(x*x for x in update))

def compute_cosine_similarity(v1: list[float], v2: list[float]) -> float:
    dot = sum(a*b for a, b in zip(v1, v2))
    norm1 = compute_norm(v1)
    norm2 = compute_norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)

def compute_stats(update: list[float], history_avg: list[float] = None) -> dict:
    stats = {
        "l2_norm": compute_norm(update),
        "max_val": max(update) if update else 0.0,
        "min_val": min(update) if update else 0.0
    }
    if history_avg:
        # drift = 1 - similarity (0 means identical direction)
        stats["cosine_drift"] = 1.0 - compute_cosine_similarity(update, history_avg)
    return stats
