"""Lightweight models bundled with MFUE."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

import numpy as np


@dataclass
class LogisticRegressionModel:
    """A simple binary logistic regression model trained via SGD."""

    n_features: int
    seed: int = 42

    def __post_init__(self) -> None:
        rng = np.random.default_rng(self.seed)
        self.weights = rng.normal(scale=0.1, size=self.n_features)
        self.bias = 0.0

    def copy(self) -> "LogisticRegressionModel":
        clone = LogisticRegressionModel(self.n_features, seed=self.seed)
        clone.weights = self.weights.copy()
        clone.bias = float(self.bias)
        return clone

    # Internal helpers -------------------------------------------------
    @staticmethod
    def _sigmoid(z: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-z))

    def decision_function(self, X: np.ndarray) -> np.ndarray:
        return X @ self.weights + self.bias

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        logits = self.decision_function(X)
        probs = self._sigmoid(logits)
        return np.vstack([1 - probs, probs]).T

    def predict(self, X: np.ndarray, threshold: float = 0.5) -> np.ndarray:
        return (self.predict_proba(X)[:, 1] >= threshold).astype(int)

    # Training ---------------------------------------------------------
    def _compute_gradient(
        self, X: np.ndarray, y: np.ndarray
    ) -> Tuple[np.ndarray, float]:
        probs = self._sigmoid(self.decision_function(X))
        residual = probs - y
        grad_w = X.T @ residual / len(X)
        grad_b = float(residual.mean())
        return grad_w, grad_b

    def fit(
        self,
        X: np.ndarray,
        y: np.ndarray,
        *,
        steps: int = 100,
        learning_rate: float = 0.1,
        batch_size: int | None = None,
        shuffle: bool = True,
    ) -> None:
        if len(X) == 0:
            return
        if batch_size is None:
            batch_size = len(X)
        rng = np.random.default_rng(self.seed)
        indices = np.arange(len(X))
        for _ in range(steps):
            if shuffle:
                rng.shuffle(indices)
            for start in range(0, len(X), batch_size):
                end = min(start + batch_size, len(X))
                batch_idx = indices[start:end]
                grad_w, grad_b = self._compute_gradient(X[batch_idx], y[batch_idx])
                self.weights -= learning_rate * grad_w
                self.bias -= learning_rate * grad_b
