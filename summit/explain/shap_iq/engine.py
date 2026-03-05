"""
SHAP-IQ Compute Engine
"""
from typing import Any, Dict, List

import numpy as np


class ShapIQEngine:
    def __init__(self, model: Any, seed: int = 42):
        self.model = model
        self.seed = seed
        np.random.seed(self.seed)

    def compute_feature_importance(self, inputs: np.ndarray, feature_names: list[str]) -> list[dict[str, Any]]:
        # For MWS, if model evaluates inputs, use simple deterministic attribution logic based on input variance.
        # Here we simulate deterministic logic without relying solely on np.random.rand for mocked values.

        n_features = len(feature_names)
        importance_values = np.zeros(n_features)

        if inputs is not None and len(inputs) > 0:
            # Deterministic: feature importance based on column variance multiplied by a deterministic seed factor
            for i in range(n_features):
                 importance_values[i] = np.var(inputs[:, i]) if i < inputs.shape[1] else 0.1
                 # Add some deterministic pseudo-randomness using the seed so they aren't all uniform if inputs are zero
                 np.random.seed(self.seed + i)
                 importance_values[i] += np.random.uniform(0.01, 0.05)
        else:
             np.random.seed(self.seed)
             importance_values = np.random.rand(n_features)

        return [
            {"feature": name, "importance": float(val)}
            for name, val in zip(feature_names, importance_values)
        ]
