"""
Advanced Deduplication System for IntelGraph
Cross-batch deduplication with MinHash/LSH and idempotent loading
"""

from .idempotent_loader import IdempotentLoader, MergeStrategy
from .minhash_dedup import LSHIndex, MinHashDeduplicator
from .similarity import EntityMatcher, SimilarityCalculator

__all__ = [
    "MinHashDeduplicator",
    "LSHIndex",
    "IdempotentLoader",
    "MergeStrategy",
    "SimilarityCalculator",
    "EntityMatcher",
]
