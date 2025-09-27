"""Pareto frontier utilities for accuracy-fairness trade-off visualization."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional

import matplotlib.pyplot as plt
import numpy as np

from .lagrangian import FairnessConstraint, LagrangianFairClassifier
from .metrics import fairness_report


@dataclass
class ParetoPoint:
    tolerance: float
    accuracy: float
    fairness_value: float
    report: dict


class ParetoFrontier:
    """Compute and visualize Pareto frontiers for FCT classifiers."""

    def __init__(
        self,
        constraint: FairnessConstraint,
        tolerances: Iterable[float],
        seed: Optional[int] = 42,
    ) -> None:
        self.constraint = constraint
        self.tolerances = sorted(set(float(t) for t in tolerances))
        self.seed = seed
        if not self.tolerances:
            raise ValueError("At least one tolerance value is required")

    def compute(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        s_train: np.ndarray,
        X_valid: np.ndarray,
        y_valid: np.ndarray,
        s_valid: np.ndarray,
        epochs: int = 500,
    ) -> List[ParetoPoint]:
        results: List[ParetoPoint] = []
        for tol in self.tolerances:
            clf = LagrangianFairClassifier(
                constraint=self.constraint,
                tolerance=tol,
                epochs=epochs,
                seed=self.seed,
            )
            clf.fit(X_train, y_train, s_train)
            proba = clf.predict_proba(X_valid)
            report = fairness_report(y_valid, proba, s_valid)
            results.append(
                ParetoPoint(
                    tolerance=tol,
                    accuracy=report["accuracy"],
                    fairness_value=self._fairness_value(report),
                    report=report,
                )
            )
        results.sort(key=lambda p: p.fairness_value)
        return results

    def plot(self, points: List[ParetoPoint], ax: Optional[plt.Axes] = None) -> plt.Axes:
        if ax is None:
            _, ax = plt.subplots()
        fairness_metric_name = self._fairness_metric_name()
        fairness_values = [p.fairness_value for p in points]
        accuracies = [p.accuracy for p in points]
        labels = [f"tol={p.tolerance:.3f}" for p in points]

        ax.plot(fairness_values, accuracies, marker="o")
        for x, y, label in zip(fairness_values, accuracies, labels):
            ax.annotate(label, (x, y), textcoords="offset points", xytext=(5, 5))
        ax.set_xlabel(fairness_metric_name)
        ax.set_ylabel("Accuracy")
        ax.set_title(f"Pareto frontier ({self.constraint.value})")
        ax.grid(True, linestyle="--", alpha=0.3)
        return ax

    def _fairness_value(self, report: dict) -> float:
        if self.constraint == FairnessConstraint.DEMOGRAPHIC_PARITY:
            return report["demographic_parity_diff"]
        if self.constraint == FairnessConstraint.EQUAL_OPPORTUNITY:
            return report["tpr_gap"]
        return max(report["tpr_gap"], report["fpr_gap"])

    def _fairness_metric_name(self) -> str:
        if self.constraint == FairnessConstraint.DEMOGRAPHIC_PARITY:
            return "Demographic parity difference"
        if self.constraint == FairnessConstraint.EQUAL_OPPORTUNITY:
            return "TPR gap"
        return "Max(TPR gap, FPR gap)"
