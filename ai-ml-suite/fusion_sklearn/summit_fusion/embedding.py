import os
from typing import List

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin


class EmbeddingTransformer(BaseEstimator, TransformerMixin):
    """
    Scikit-learn compatible transformer for text embeddings.
    Backends:
      - 'dummy': Returns zero-vectors. Default for CI safety.
      - 'sentence-transformers': Uses actual local model. Requires opt-in.
    """
    def __init__(self, backend='dummy', model_name='all-MiniLM-L6-v2', embedding_dim=384):
        self.backend = backend
        self.model_name = model_name
        self.embedding_dim = embedding_dim
        self._model = None

    def fit(self, X, y=None):
        if self.backend == 'sentence-transformers':
            if os.environ.get("SUMMIT_FUSION_ALLOW_NETWORK", "0") != "1":
                raise RuntimeError(
                    "Network access disabled by default. "
                    "Set SUMMIT_FUSION_ALLOW_NETWORK=1 to download embeddings."
                )
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError:
                raise ImportError("sentence-transformers not installed.")

            self._model = SentenceTransformer(self.model_name)
        return self

    def transform(self, X: list[str]):
        if self.backend == 'dummy':
            return np.zeros((len(X), self.embedding_dim))
        elif self.backend == 'sentence-transformers':
            if self._model is None:
                raise RuntimeError("Transformer was not fitted.")
            return self._model.encode(X, show_progress_bar=False)
        else:
            raise ValueError(f"Unknown backend: {self.backend}")
