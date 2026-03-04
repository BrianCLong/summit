import os
from typing import Any, List

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin


class DummyEmbeddingTransformer(BaseEstimator, TransformerMixin):
    """
    A deterministic dummy embedding transformer that produces fixed-size
    random vectors based on the hash of the text length.
    Safe for CI and avoids network calls.
    """
    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim

    def fit(self, X: Any, y: Any = None) -> "DummyEmbeddingTransformer":
        return self

    def transform(self, X: Any, y: Any = None) -> np.ndarray:
        embeddings = []
        for text in X:
            if not isinstance(text, str):
                text = str(text) if text is not None else ""

            # Deterministic pseudo-random generation based on text length
            # Use fixed seed per text length for determinism
            seed = len(text) % 10000
            rng = np.random.RandomState(seed)
            emb = rng.randn(self.embedding_dim)
            # L2 normalize
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            embeddings.append(emb)

        return np.array(embeddings, dtype=float)

class EmbeddingTransformer(BaseEstimator, TransformerMixin):
    """
    Transformer that uses sentence-transformers to generate dense embeddings.
    Fails safely in CI if the backend or network is disabled.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._model = None

    def fit(self, X: Any, y: Any = None) -> "EmbeddingTransformer":
        return self

    def transform(self, X: Any, y: Any = None) -> np.ndarray:
        if self._model is None:
            # Check network budget policy
            allow_network = os.environ.get("SUMMIT_FUSION_ALLOW_NETWORK", "0") == "1"
            if not allow_network:
                raise RuntimeError(
                    "Network download blocked by SUMMIT_FUSION_ALLOW_NETWORK policy. "
                    "Set to '1' to allow downloading the SentenceTransformer model."
                )

            try:
                from sentence_transformers import SentenceTransformer
            except ImportError:
                raise ImportError(
                    "sentence-transformers is not installed. "
                    "Install with `pip install summit-fusion-sklearn[embeddings]`."
                )

            self._model = SentenceTransformer(self.model_name)

        return self._model.encode(X, convert_to_numpy=True)
