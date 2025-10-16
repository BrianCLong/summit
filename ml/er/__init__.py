"""Entity Resolution pipeline with hybrid matchers."""

from .matchers import EmbeddingMatcher, double_metaphone, jaro_winkler
from .pipeline import ERPipeline

__all__ = [
    "ERPipeline",
    "double_metaphone",
    "jaro_winkler",
    "EmbeddingMatcher",
]
