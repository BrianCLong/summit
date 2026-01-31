from __future__ import annotations

import random
from typing import Dict, List, Tuple


def cap_degree(edges: list[tuple[str, str]], max_degree: int, seed: int = 0) -> list[tuple[str, str]]:
    # Although seed is provided, this implementation is currently deterministic based on input order.
    # We use random just to initialize if we needed to shuffle, but we don't shuffle to preserve stability.
    # If shuffling is needed for privacy (sampling), it should use the seed.
    # For now, strict first-k approach.

    out: list[tuple[str, str]] = []
    deg: dict[str, int] = {}

    for (u, v) in edges:
        if deg.get(u, 0) >= max_degree:
            continue
        if deg.get(v, 0) >= max_degree:
            continue

        out.append((u, v))
        deg[u] = deg.get(u, 0) + 1
        deg[v] = deg.get(v, 0) + 1

    return out

def gaussian_noise(scale: float, seed: int = 0) -> float:
    # Stub: replace with vetted DP mechanism + accounting in follow-up
    rng = random.Random(seed)
    # Box-Muller
    import math
    u1, u2 = max(rng.random(), 1e-12), rng.random()
    z0 = math.sqrt(-2.0 * math.log(u1)) * math.cos(2 * math.pi * u2)
    return z0 * scale
