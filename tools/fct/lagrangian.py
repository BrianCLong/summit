"""In-processing training with fairness-aware Lagrangian penalties."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np

from .metrics import EPS, fairness_report


class FairnessConstraint(str, Enum):
    """Supported fairness notions for training."""

    DEMOGRAPHIC_PARITY = "demographic_parity"
    EQUAL_OPPORTUNITY = "equal_opportunity"
    EQUALIZED_ODDS = "equalized_odds"


@dataclass
class TrainingHistory:
    """Stores per-epoch metrics for reproducibility and diagnostics."""

    losses: List[float]
    reports: List[Dict[str, float]]


class LagrangianFairClassifier:
    """Binary classifier trained with fairness-aware Lagrangian penalties."""

    def __init__(
        self,
        constraint: FairnessConstraint = FairnessConstraint.DEMOGRAPHIC_PARITY,
        tolerance: float = 0.02,
        learning_rate: float = 0.1,
        lagrangian_rate: float = 0.1,
        epochs: int = 500,
        seed: Optional[int] = 42,
    ) -> None:
        self.constraint = constraint
        self.tolerance = tolerance
        self.learning_rate = learning_rate
        self.lagrangian_rate = lagrangian_rate
        self.epochs = epochs
        self.seed = seed
        self._weights: Optional[np.ndarray] = None
        self._history: Optional[TrainingHistory] = None

    @property
    def history(self) -> Optional[TrainingHistory]:
        return self._history

    def _initialize_weights(self, n_features: int) -> None:
        rng = np.random.default_rng(self.seed)
        self._weights = rng.normal(scale=0.01, size=(n_features + 1,))

    @staticmethod
    def _augment_features(X: np.ndarray) -> np.ndarray:
        ones = np.ones((X.shape[0], 1))
        return np.hstack([ones, X])

    @staticmethod
    def _sigmoid(z: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-z))

    def fit(
        self,
        X: Iterable[Iterable[float]],
        y: Iterable[int],
        sensitive: Iterable[int],
    ) -> "LagrangianFairClassifier":
        X_arr = np.asarray(X, dtype=float)
        y_arr = np.asarray(y, dtype=int)
        s_arr = np.asarray(sensitive, dtype=int)

        if X_arr.ndim != 2:
            raise ValueError("X must be a 2D array-like object")
        if y_arr.ndim != 1 or s_arr.ndim != 1:
            raise ValueError("y and sensitive must be 1D arrays")
        if X_arr.shape[0] != y_arr.shape[0] or y_arr.shape[0] != s_arr.shape[0]:
            raise ValueError("X, y, and sensitive must have matching row counts")

        self._initialize_weights(X_arr.shape[1])
        weights = self._weights
        assert weights is not None

        X_aug = self._augment_features(X_arr)
        lagrange = np.zeros(self._lagrange_dim())
        losses: List[float] = []
        reports: List[Dict[str, float]] = []

        for _ in range(self.epochs):
            logits = X_aug @ weights
            preds = self._sigmoid(logits)
            loss, grad = self._loss_and_grad(X_aug, y_arr, s_arr, preds, lagrange)
            weights = weights - self.learning_rate * grad
            violation = self._constraint_violation(y_arr, preds, s_arr)
            lagrange = np.maximum(0.0, lagrange + self.lagrangian_rate * violation)

            losses.append(loss)
            reports.append(fairness_report(y_arr, preds, s_arr))

        self._weights = weights
        self._history = TrainingHistory(losses=losses, reports=reports)
        return self

    def predict_proba(self, X: Iterable[Iterable[float]]) -> np.ndarray:
        if self._weights is None:
            raise RuntimeError("Model has not been fitted")
        X_arr = np.asarray(X, dtype=float)
        if X_arr.ndim != 2:
            raise ValueError("X must be a 2D array-like object")
        X_aug = self._augment_features(X_arr)
        logits = X_aug @ self._weights
        return self._sigmoid(logits)

    def predict(self, X: Iterable[Iterable[float]], threshold: float = 0.5) -> np.ndarray:
        return (self.predict_proba(X) >= threshold).astype(int)

    def _lagrange_dim(self) -> int:
        if self.constraint == FairnessConstraint.EQUALIZED_ODDS:
            return 2
        return 1

    def _group_masks(self, sensitive: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        unique = np.unique(sensitive)
        if unique.size != 2:
            raise ValueError("Only binary sensitive attributes are supported")
        return sensitive == unique[0], sensitive == unique[1]

    def _loss_and_grad(
        self,
        X_aug: np.ndarray,
        y: np.ndarray,
        sensitive: np.ndarray,
        preds: np.ndarray,
        lagrange: np.ndarray,
    ) -> Tuple[float, np.ndarray]:
        n = y.size
        error = preds - y
        grad_loss = X_aug.T @ error / max(n, 1)
        logistic_loss = -np.mean(
            y * np.log(preds + EPS) + (1 - y) * np.log(1 - preds + EPS)
        )

        violation = self._constraint_violation(y, preds, sensitive)
        fairness_grad = self._constraint_gradient(X_aug, y, preds, sensitive)
        loss = logistic_loss + float(np.dot(lagrange, violation))
        grad = grad_loss + fairness_grad @ lagrange
        return loss, grad

    def _constraint_violation(
        self, y: np.ndarray, preds: np.ndarray, sensitive: np.ndarray
    ) -> np.ndarray:
        group_a, group_b = self._group_masks(sensitive)

        if self.constraint == FairnessConstraint.DEMOGRAPHIC_PARITY:
            rate_a = np.mean(preds[group_a])
            rate_b = np.mean(preds[group_b])
            gap = rate_a - rate_b
            return np.array([max(0.0, abs(gap) - self.tolerance) * np.sign(gap)])

        if self.constraint == FairnessConstraint.EQUAL_OPPORTUNITY:
            positives = y == 1
            rate_a = np.mean(preds[group_a & positives]) if np.any(group_a & positives) else 0.0
            rate_b = np.mean(preds[group_b & positives]) if np.any(group_b & positives) else 0.0
            gap = rate_a - rate_b
            return np.array([max(0.0, abs(gap) - self.tolerance) * np.sign(gap)])

        positives = y == 1
        negatives = y == 0
        tpr_a = (
            np.mean(preds[group_a & positives]) if np.any(group_a & positives) else 0.0
        )
        tpr_b = (
            np.mean(preds[group_b & positives]) if np.any(group_b & positives) else 0.0
        )
        fpr_a = (
            np.mean(preds[group_a & negatives]) if np.any(group_a & negatives) else 0.0
        )
        fpr_b = (
            np.mean(preds[group_b & negatives]) if np.any(group_b & negatives) else 0.0
        )
        tpr_gap = tpr_a - tpr_b
        fpr_gap = fpr_a - fpr_b
        return np.array(
            [
                max(0.0, abs(tpr_gap) - self.tolerance) * np.sign(tpr_gap),
                max(0.0, abs(fpr_gap) - self.tolerance) * np.sign(fpr_gap),
            ]
        )

    def _constraint_gradient(
        self,
        X_aug: np.ndarray,
        y: np.ndarray,
        preds: np.ndarray,
        sensitive: np.ndarray,
    ) -> np.ndarray:
        group_a, group_b = self._group_masks(sensitive)
        grad = []

        def _rate_grad(mask: np.ndarray) -> np.ndarray:
            masked_X = X_aug[mask]
            masked_preds = preds[mask]
            if masked_X.size == 0:
                return np.zeros(X_aug.shape[1])
            weights = masked_preds * (1 - masked_preds)
            return masked_X.T @ weights / max(masked_X.shape[0], 1)

        if self.constraint == FairnessConstraint.DEMOGRAPHIC_PARITY:
            grad_gap = _rate_grad(group_a) - _rate_grad(group_b)
            return np.array([grad_gap])

        if self.constraint == FairnessConstraint.EQUAL_OPPORTUNITY:
            positives = y == 1
            grad_gap = _rate_grad(group_a & positives) - _rate_grad(group_b & positives)
            return np.array([grad_gap])

        positives = y == 1
        negatives = y == 0
        grad_tpr = _rate_grad(group_a & positives) - _rate_grad(group_b & positives)
        grad_fpr = _rate_grad(group_a & negatives) - _rate_grad(group_b & negatives)
        return np.array([grad_tpr, grad_fpr])
