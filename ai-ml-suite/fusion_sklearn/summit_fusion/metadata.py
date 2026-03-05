from typing import Any

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class TextMetadataExtractor(BaseEstimator, TransformerMixin):
    """
    Extracts basic text metadata features as per the ML Mastery article:
    char_length, word_count, avg_word_length, uppercase_ratio, digit_ratio.
    Expects input X to be an iterable of strings.
    Returns a numpy array of shape (n_samples, 5).
    """
    def fit(self, X: Any, y: Any = None) -> "TextMetadataExtractor":
        return self

    def transform(self, X: Any, y: Any = None) -> np.ndarray:
        features = []
        for text in X:
            if not isinstance(text, str):
                text = str(text) if text is not None else ""

            char_length = len(text)
            words = text.split()
            word_count = len(words)
            avg_word_length = sum(len(w) for w in words) / word_count if word_count > 0 else 0.0

            uppercases = sum(1 for c in text if c.isupper())
            uppercase_ratio = uppercases / char_length if char_length > 0 else 0.0

            digits = sum(1 for c in text if c.isdigit())
            digit_ratio = digits / char_length if char_length > 0 else 0.0

            features.append([
                char_length,
                word_count,
                avg_word_length,
                uppercase_ratio,
                digit_ratio
            ])

        return np.array(features, dtype=float)

def get_metadata_pipeline() -> Pipeline:
    """Returns a scikit-learn pipeline for metadata extraction and scaling."""
    return Pipeline([
        ('extract', TextMetadataExtractor()),
        ('scale', StandardScaler())
    ])
