"""
Advanced Deduplication System for IntelGraph
Cross-batch deduplication with MinHash/LSH and idempotent loading
"""

from .minhash_dedup import MinHashDeduplicator, LSHIndex
from .idempotent_loader import IdempotentLoader, MergeStrategy
from .similarity import SimilarityCalculator, EntityMatcher

__all__ = [
    'MinHashDeduplicator',
    'LSHIndex', 
    'IdempotentLoader',
    'MergeStrategy',
    'SimilarityCalculator',
    'EntityMatcher'
]