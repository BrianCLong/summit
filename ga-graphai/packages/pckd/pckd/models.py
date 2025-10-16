"""Simple logistic models used for distillation fixtures."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np


@dataclass
class LogisticModel:
    """Base logistic regression style model."""

    weights: np.ndarray
    bias: float

    def predict_logits(self, features: np.ndarray) -> np.ndarray:
        return features @ self.weights + self.bias

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        logits = self.predict_logits(features)
        return 1.0 / (1.0 + np.exp(-logits))

    def predict(self, features: np.ndarray) -> np.ndarray:
        return (self.predict_proba(features) >= 0.5).astype(np.int32)

    def parameter_dict(self) -> dict:
        return {"weights": self.weights.tolist(), "bias": float(self.bias)}


class LogisticTeacher(LogisticModel):
    """Teacher with fixed parameters."""

    @classmethod
    def from_weights(cls, weights: Iterable[float], bias: float) -> LogisticTeacher:
        return cls(weights=np.asarray(list(weights), dtype=np.float64), bias=float(bias))


class LogisticStudent(LogisticModel):
    """Student model with gradient updates."""

    @classmethod
    def initialize(cls, n_features: int, seed: int | None = None) -> LogisticStudent:
        rng = np.random.default_rng(seed)
        weights = rng.normal(scale=0.1, size=n_features)
        bias = float(rng.normal(scale=0.1))
        return cls(weights=weights, bias=bias)

    def train_step(
        self,
        features: np.ndarray,
        targets: np.ndarray,
        learning_rate: float,
    ) -> tuple[float, float]:
        probs = self.predict_proba(features)
        gradient = probs - targets
        grad_w = features.T @ gradient / features.shape[0]
        grad_b = float(np.mean(gradient))
        self.weights -= learning_rate * grad_w
        self.bias -= learning_rate * grad_b
        return float(np.linalg.norm(grad_w)), abs(grad_b)
