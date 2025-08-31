"""Entity Resolution pipeline with hybrid matchers."""

from .pipeline import ERPipeline
from .matchers import double_metaphone, jaro_winkler, EmbeddingMatcher

__all__ = [
    "ERPipeline",
    "double_metaphone",
    "jaro_winkler",
    "EmbeddingMatcher",
]
