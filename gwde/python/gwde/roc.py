"""ROC tooling for GW-DE detection quality analysis."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass


@dataclass
class RocPoint:
    threshold: float
    tpr: float
    fpr: float


def generate_roc(
    scores: Sequence[float], labels: Sequence[int], *, steps: int = 101
) -> list[RocPoint]:
    if len(scores) != len(labels):
        raise ValueError("Scores and labels length mismatch")
    if not scores:
        return []
    thresholds = [
        min(scores) + i * (max(scores) - min(scores)) / max(steps - 1, 1) for i in range(steps)
    ]
    roc: list[RocPoint] = []
    for threshold in thresholds:
        tp = fp = tn = fn = 0
        for score, label in zip(scores, labels):
            prediction = score >= threshold
            if prediction and label == 1:
                tp += 1
            elif prediction and label == 0:
                fp += 1
            elif not prediction and label == 0:
                tn += 1
            else:
                fn += 1
        tpr = tp / (tp + fn) if (tp + fn) else 0.0
        fpr = fp / (fp + tn) if (fp + tn) else 0.0
        roc.append(RocPoint(threshold=threshold, tpr=tpr, fpr=fpr))
    return roc


def auc(points: Iterable[RocPoint]) -> float:
    pts = sorted(points, key=lambda item: item.fpr)
    area = 0.0
    for left, right in zip(pts[:-1], pts[1:]):
        width = right.fpr - left.fpr
        height = (left.tpr + right.tpr) / 2.0
        area += width * height
    return area


__all__ = ["RocPoint", "auc", "generate_roc"]
