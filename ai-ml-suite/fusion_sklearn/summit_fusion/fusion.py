from typing import Any, Optional
from sklearn.pipeline import FeatureUnion
from sklearn.base import BaseEstimator, TransformerMixin
import numpy as np

from .tfidf import get_tfidf_svd_pipeline
from .metadata import get_metadata_pipeline
from .embedding import DummyEmbeddingTransformer, EmbeddingTransformer

class IdentitySelector(BaseEstimator, TransformerMixin):
    """Simple identity transformer to pass X through unchanged."""
    def fit(self, X: Any, y: Any = None) -> "IdentitySelector":
        return self

    def transform(self, X: Any, y: Any = None) -> Any:
        # Some sklearn column transformers pass Series/DataFrame columns,
        # we want a list of strings usually
        if hasattr(X, "tolist"):
            return X.tolist()
        return X

def build_fusion_pipeline(use_dummy_embeddings: bool = True) -> FeatureUnion:
    """
    Builds the FeatureUnion that fuses TF-IDF, Embeddings, and Metadata.
    Expects input X to be a 1D array/series/list of text strings.
    """

    embedding_transformer = DummyEmbeddingTransformer() if use_dummy_embeddings else EmbeddingTransformer()

    return FeatureUnion([
        ('tfidf', get_tfidf_svd_pipeline()),
        ('embedding', embedding_transformer),
        ('metadata', get_metadata_pipeline())
    ])
