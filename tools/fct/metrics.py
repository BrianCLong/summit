"""Fairness metric utilities for the Fairness-Constrained Trainer (FCT)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Tuple

import numpy as np


EPS = 1e-9


@dataclass(frozen=True)
class GroupMetrics:
    """Confusion-matrix style metrics for a single sensitive group."""

    positives: int
    negatives: int
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int

    @property
    def tpr(self) -> float:
        """True positive rate (recall)."""

        if self.positives == 0:
            return 0.0
        return self.true_positives / max(self.positives, EPS)

    @property
    def fpr(self) -> float:
        """False positive rate."""

        if self.negatives == 0:
            return 0.0
        return self.false_positives / max(self.negatives, EPS)

    @property
    def positive_rate(self) -> float:
        """Overall rate of predicted positives."""

        total = self.positives + self.negatives
        if total == 0:
            return 0.0
        predicted_positive = self.true_positives + self.false_positives
        return predicted_positive / max(total, EPS)


def _validate_inputs(y_true: Iterable[int], y_prob: Iterable[float], sensitive: Iterable[int]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    y_true_arr = np.asarray(y_true)
    y_prob_arr = np.asarray(y_prob)
    sensitive_arr = np.asarray(sensitive)

    if y_true_arr.shape != y_prob_arr.shape or y_true_arr.shape != sensitive_arr.shape:
        raise ValueError("y_true, y_prob, and sensitive must have the same shape")

    if y_true_arr.ndim != 1:
        raise ValueError("y_true, y_prob, and sensitive must be 1-D arrays")

    return y_true_arr, y_prob_arr, sensitive_arr


def confusion_by_group(
    y_true: Iterable[int],
    y_prob: Iterable[float],
    sensitive: Iterable[int],
    threshold: float = 0.5,
) -> Dict[int, GroupMetrics]:
    """Compute confusion-matrix counts for each sensitive group."""

    y_true_arr, y_prob_arr, sensitive_arr = _validate_inputs(y_true, y_prob, sensitive)
    y_pred = (y_prob_arr >= threshold).astype(int)

    metrics: Dict[int, GroupMetrics] = {}
    for group in np.unique(sensitive_arr):
        mask = sensitive_arr == group
        y_true_group = y_true_arr[mask]
        y_pred_group = y_pred[mask]

        positives = int(np.sum(y_true_group))
        negatives = int(y_true_group.size - positives)
        true_positives = int(np.sum((y_true_group == 1) & (y_pred_group == 1)))
        false_positives = int(np.sum((y_true_group == 0) & (y_pred_group == 1)))
        true_negatives = int(np.sum((y_true_group == 0) & (y_pred_group == 0)))
        false_negatives = int(np.sum((y_true_group == 1) & (y_pred_group == 0)))

        metrics[int(group)] = GroupMetrics(
            positives=positives,
            negatives=negatives,
            true_positives=true_positives,
            false_positives=false_positives,
            true_negatives=true_negatives,
            false_negatives=false_negatives,
        )

    return metrics


def demographic_parity_difference(
    y_true: Iterable[int],
    y_prob: Iterable[float],
    sensitive: Iterable[int],
    threshold: float = 0.5,
) -> float:
    """Return the absolute demographic parity difference across groups."""

    metrics = confusion_by_group(y_true, y_prob, sensitive, threshold)
    positive_rates = [group_metrics.positive_rate for group_metrics in metrics.values()]
    if not positive_rates:
        return 0.0
    return float(np.max(positive_rates) - np.min(positive_rates))


def true_positive_rate_gap(
    y_true: Iterable[int],
    y_prob: Iterable[float],
    sensitive: Iterable[int],
    threshold: float = 0.5,
) -> float:
    """Return the absolute difference in true positive rates across groups."""

    metrics = confusion_by_group(y_true, y_prob, sensitive, threshold)
    tprs = [group_metrics.tpr for group_metrics in metrics.values()]
    if not tprs:
        return 0.0
    return float(np.max(tprs) - np.min(tprs))


def false_positive_rate_gap(
    y_true: Iterable[int],
    y_prob: Iterable[float],
    sensitive: Iterable[int],
    threshold: float = 0.5,
) -> float:
    """Return the absolute difference in false positive rates across groups."""

    metrics = confusion_by_group(y_true, y_prob, sensitive, threshold)
    fprs = [group_metrics.fpr for group_metrics in metrics.values()]
    if not fprs:
        return 0.0
    return float(np.max(fprs) - np.min(fprs))


def accuracy(
    y_true: Iterable[int],
    y_prob: Iterable[float],
    threshold: float = 0.5,
) -> float:
    """Compute the overall accuracy from probabilistic predictions."""

    y_true_arr = np.asarray(y_true)
    y_prob_arr = np.asarray(y_prob)
    y_pred = (y_prob_arr >= threshold).astype(int)
    if y_true_arr.size == 0:
        return 0.0
    return float(np.mean(y_pred == y_true_arr))


def fairness_report(
    y_true: Iterable[int],
    y_prob: Iterable[float],
    sensitive: Iterable[int],
    threshold: float = 0.5,
) -> Dict[str, float]:
    """Generate a summary of fairness and utility metrics."""

    report = {
        "accuracy": accuracy(y_true, y_prob, threshold),
        "demographic_parity_diff": demographic_parity_difference(y_true, y_prob, sensitive, threshold),
        "tpr_gap": true_positive_rate_gap(y_true, y_prob, sensitive, threshold),
        "fpr_gap": false_positive_rate_gap(y_true, y_prob, sensitive, threshold),
    }

    return report
