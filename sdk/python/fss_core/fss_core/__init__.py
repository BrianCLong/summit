"""Freshness & Staleness Scorer core API."""

from .decay import DecayKernel, get_decay_function
from .freshness import FreshnessScorer, FreshnessConfig, ContentRecord, ScoredCandidate
from .evaluation import evaluate_dataset, EvaluationResult

__all__ = [
    "DecayKernel",
    "get_decay_function",
    "FreshnessScorer",
    "FreshnessConfig",
    "ContentRecord",
    "ScoredCandidate",
    "evaluate_dataset",
    "EvaluationResult",
]
