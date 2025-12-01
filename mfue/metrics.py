"""Metric utilities used by MFUE."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import math
import numpy as np


def accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute classification accuracy."""

    if len(y_true) == 0:
        return 0.0
    return float((y_true == y_pred).mean())


def log_loss(y_true: np.ndarray, y_prob: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    """Per-sample binary log loss."""

    y_prob = np.clip(y_prob, eps, 1 - eps)
    return -(y_true * np.log(y_prob) + (1 - y_true) * np.log(1 - y_prob))


def membership_inference_auc(
    member_confidences: Iterable[float],
    non_member_confidences: Iterable[float],
) -> float:
    """Compute the AUC of a threshold attack using prediction confidences."""

    member_confidences = np.asarray(list(member_confidences), dtype=float)
    non_member_confidences = np.asarray(list(non_member_confidences), dtype=float)
    scores = np.concatenate([member_confidences, non_member_confidences])
    labels = np.concatenate([np.ones_like(member_confidences), np.zeros_like(non_member_confidences)])
    if len(scores) == 0:
        return 0.5
    order = np.argsort(scores)
    ranks = np.empty_like(order)
    ranks[order] = np.arange(len(scores))
    sum_ranks_positive = ranks[labels == 1].sum()
    n_pos = float((labels == 1).sum())
    n_neg = float((labels == 0).sum())
    if n_pos == 0 or n_neg == 0:
        return 0.5
    auc = (sum_ranks_positive - n_pos * (n_pos - 1) / 2.0) / (n_pos * n_neg)
    return float(auc)


def bootstrap_p_value(
    differences: np.ndarray,
    *,
    rng: np.random.Generator | None = None,
    samples: int | None = None,
) -> float:
    """Approximate a one-sided p-value that ``mean(differences) > 0``."""

    if len(differences) == 0:
        return 1.0
    mean = float(differences.mean())
    if np.isclose(mean, 0.0):
        return 1.0
    std = float(differences.std(ddof=1))
    if np.isclose(std, 0.0):
        return 0.0 if mean > 0 else 1.0
    z_score = mean / (std / np.sqrt(len(differences)))
    # Convert to one-sided p-value using the complementary error function.
    p_value = 0.5 * (1 - math.erf(z_score / math.sqrt(2)))
    return max(min(p_value, 1.0), 0.0)


@dataclass
class EvaluationResult:
    """Structured output from MFUEvaluator."""

    pre_forget_accuracy: float
    post_forget_accuracy: float
    forget_accuracy_drop: float
    forget_significance_p: float
    pre_membership_auc: float
    post_membership_auc: float
    membership_auc_drop: float
    pre_holdout_accuracy: float
    post_holdout_accuracy: float
    holdout_accuracy_delta: float
    seeds: list[int]

    def residual_risk_band(self) -> str:
        """Assign a residual risk band based on membership inference AUC."""

        auc = self.post_membership_auc
        if auc <= 0.55:
            return "low"
        if auc <= 0.65:
            return "medium"
        return "high"
