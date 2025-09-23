"""Primitive matchers used in the ER pipeline."""

from collections.abc import Iterable

import jellyfish
from doublemetaphone import doublemetaphone as _dm
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def double_metaphone(name: str) -> str:
    """Return the primary Double Metaphone code for ``name``."""
    return _dm(name or "")[0]


def jaro_winkler(a: str, b: str) -> float:
    """Jaro-Winkler similarity between two strings."""
    return jellyfish.jaro_winkler_similarity(a or "", b or "")


class EmbeddingMatcher:
    """Simple character n-gram embedding matcher."""

    def __init__(self) -> None:
        self._vectorizer = TfidfVectorizer(analyzer="char", ngram_range=(2, 3))
        self._embeddings = None

    def fit(self, texts: Iterable[str]) -> None:
        self._embeddings = self._vectorizer.fit_transform(list(texts))

    def similarity(self, idx_a: int, idx_b: int) -> float:
        if self._embeddings is None:
            raise ValueError("EmbeddingMatcher not fitted")
        emb_a = self._embeddings[idx_a]
        emb_b = self._embeddings[idx_b]
        return float(cosine_similarity(emb_a, emb_b)[0][0])
