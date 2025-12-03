"""Deterministic embedding utilities for CSSM."""
from __future__ import annotations

import hashlib
import math
from typing import Iterable, List


def _tokenize(text: str) -> List[str]:
    return [token for token in text.lower().replace("_", " ").split() if token]


def deterministic_embedding(text: str, dimensions: int = 32) -> List[float]:
    """Create a deterministic pseudo-embedding based on hashing tokens."""
    vector = [0.0] * dimensions
    tokens = _tokenize(text)
    if not tokens:
        return vector
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for idx in range(dimensions):
            byte = digest[idx]
            vector[idx] += ((byte / 255.0) - 0.5)
    # Normalize by token count for stability.
    token_count = float(len(tokens))
    return [value / token_count for value in vector]


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    dot = 0.0
    left_norm = 0.0
    right_norm = 0.0
    for l, r in zip(left, right):
        dot += l * r
        left_norm += l * l
        right_norm += r * r
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(-1.0, min(1.0, dot / math.sqrt(left_norm * right_norm)))
