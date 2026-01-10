"""Entity Resolution pipeline with hybrid matchers."""

from .matchers import EmbeddingMatcher, double_metaphone, jaro_winkler
from .pipeline import ERPipeline

__all__ = [
    "ERPipeline",
    "EmbeddingMatcher",
    "double_metaphone",
    "jaro_winkler",
]
