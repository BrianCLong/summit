from typing import List

import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin


class TextMetadataExtractor(BaseEstimator, TransformerMixin):
    """
    Extracts structured metadata features from text inputs.
    Features: char_length, word_count, avg_word_length, uppercase_ratio, digit_ratio
    """
    def __init__(self):
        pass

    def fit(self, X, y=None):
        return self

    def transform(self, X: list[str]):
        features = []
        for text in X:
            if not text:
                features.append([0.0, 0.0, 0.0, 0.0, 0.0])
                continue

            char_length = len(text)
            words = text.split()
            word_count = len(words)

            avg_word_length = 0.0
            if word_count > 0:
                avg_word_length = sum(len(w) for w in words) / word_count

            uppercase_ratio = sum(1 for c in text if c.isupper()) / char_length
            digit_ratio = sum(1 for c in text if c.isdigit()) / char_length

            features.append([
                float(char_length),
                float(word_count),
                float(avg_word_length),
                float(uppercase_ratio),
                float(digit_ratio)
            ])

        return np.array(features)
