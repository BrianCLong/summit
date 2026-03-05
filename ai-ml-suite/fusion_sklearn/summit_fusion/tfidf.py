from typing import Any

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline


class DynamicTruncatedSVD(BaseEstimator, TransformerMixin):
    """
    Wraps TruncatedSVD to dynamically adjust n_components based on input shape.
    Useful for tests with small vocabularies where SVD would otherwise fail.
    """
    def __init__(self, n_components=300, random_state=42):
        self.n_components = n_components
        self.random_state = random_state
        self.svd = None
        self._is_fitted = False

    def fit(self, X, y=None):
        n_features = X.shape[1]
        actual_components = min(self.n_components, n_features - 1)
        # SVD needs n_components < n_features usually, but n_features might be very small in tests
        if actual_components < 1:
            self.svd = None # Too few features to do SVD safely, we'll just return X or an identity
        else:
            self.svd = TruncatedSVD(n_components=actual_components, random_state=self.random_state)
            self.svd.fit(X, y)

        self._is_fitted = True
        return self

    def transform(self, X, y=None):
        if not getattr(self, "_is_fitted", False):
            raise ValueError("DynamicTruncatedSVD instance is not fitted yet.")

        if self.svd is None:
            return X.toarray() if hasattr(X, "toarray") else np.array(X)
        return self.svd.transform(X)

    def __sklearn_is_fitted__(self):
        return getattr(self, "_is_fitted", False)

def get_tfidf_svd_pipeline(max_features: int = 5000, n_components: int = 300, random_state: int = 42) -> Pipeline:
    """
    Returns a TF-IDF + TruncatedSVD pipeline for dimensionality reduction
    as described in the ML Mastery article.
    """
    return Pipeline([
        ('tfidf', TfidfVectorizer(max_features=max_features)),
        ('svd', DynamicTruncatedSVD(n_components=n_components, random_state=random_state))
    ])
