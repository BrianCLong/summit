"""Post-processing threshold adjustment to enforce fairness constraints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Tuple

import numpy as np

from .lagrangian import FairnessConstraint
from .metrics import accuracy, demographic_parity_difference, false_positive_rate_gap, true_positive_rate_gap


@dataclass
class ThresholdAdjusterResult:
    thresholds: Dict[int, float]
    report: Dict[str, float]


class ThresholdAdjuster:
    """Adjust group-specific thresholds to satisfy fairness constraints."""

    def __init__(
        self,
        constraint: FairnessConstraint,
        tolerance: float = 0.02,
        grid_size: int = 101,
    ) -> None:
        if grid_size < 2:
            raise ValueError("grid_size must be at least 2")
        self.constraint = constraint
        self.tolerance = tolerance
        self.grid = np.linspace(0, 1, grid_size)
        self._thresholds: Dict[int, float] = {}
        self._last_report: Dict[str, float] = {}

    @property
    def thresholds(self) -> Dict[int, float]:
        return dict(self._thresholds)

    @property
    def report(self) -> Dict[str, float]:
        return dict(self._last_report)

    def fit(
        self,
        y_true: Iterable[int],
        y_prob: Iterable[float],
        sensitive: Iterable[int],
    ) -> ThresholdAdjusterResult:
        y_true_arr = np.asarray(y_true, dtype=int)
        y_prob_arr = np.asarray(y_prob, dtype=float)
        s_arr = np.asarray(sensitive, dtype=int)

        if y_true_arr.shape != y_prob_arr.shape or y_true_arr.shape != s_arr.shape:
            raise ValueError("All inputs must have matching shapes")

        thresholds, best_report = self._search_thresholds(y_true_arr, y_prob_arr, s_arr)
        self._thresholds = thresholds
        self._last_report = best_report
        return ThresholdAdjusterResult(thresholds=thresholds, report=best_report)

    def transform(self, y_prob: Iterable[float], sensitive: Iterable[int]) -> np.ndarray:
        if not self._thresholds:
            raise RuntimeError("ThresholdAdjuster has not been fitted")
        y_prob_arr = np.asarray(y_prob, dtype=float)
        s_arr = np.asarray(sensitive, dtype=int)
        if y_prob_arr.shape != s_arr.shape:
            raise ValueError("y_prob and sensitive must have matching shapes")

        unique = np.unique(s_arr)
        outputs = np.zeros_like(y_prob_arr, dtype=int)
        for group in unique:
            threshold = self._thresholds.get(int(group), 0.5)
            mask = s_arr == group
            outputs[mask] = (y_prob_arr[mask] >= threshold).astype(int)
        return outputs

    def _search_thresholds(
        self, y_true: np.ndarray, y_prob: np.ndarray, sensitive: np.ndarray
    ) -> Tuple[Dict[int, float], Dict[str, float]]:
        unique = np.unique(sensitive)
        if unique.size != 2:
            raise ValueError("Only binary sensitive attributes are supported")

        best_thresholds: Dict[int, float] = {}
        best_report: Dict[str, float] = {"accuracy": -np.inf}

        for thr_a in self.grid:
            for thr_b in self.grid:
                thresholds = {int(unique[0]): float(thr_a), int(unique[1]): float(thr_b)}
                preds = np.where(sensitive == unique[0], y_prob >= thr_a, y_prob >= thr_b).astype(int)
                report = {
                    "accuracy": accuracy(y_true, preds, threshold=0.5),
                    "demographic_parity_diff": demographic_parity_difference(y_true, preds, sensitive),
                    "tpr_gap": true_positive_rate_gap(y_true, preds, sensitive),
                    "fpr_gap": false_positive_rate_gap(y_true, preds, sensitive),
                }

                if self._within_constraint(report) and report["accuracy"] > best_report["accuracy"]:
                    best_thresholds = thresholds
                    best_report = report

        if not best_thresholds:
            # fallback: choose thresholds minimizing violation magnitude
            min_violation = np.inf
            for thr_a in self.grid:
                for thr_b in self.grid:
                    thresholds = {int(unique[0]): float(thr_a), int(unique[1]): float(thr_b)}
                    preds = np.where(sensitive == unique[0], y_prob >= thr_a, y_prob >= thr_b).astype(int)
                    report = {
                        "accuracy": accuracy(y_true, preds, threshold=0.5),
                        "demographic_parity_diff": demographic_parity_difference(y_true, preds, sensitive),
                        "tpr_gap": true_positive_rate_gap(y_true, preds, sensitive),
                        "fpr_gap": false_positive_rate_gap(y_true, preds, sensitive),
                    }
                    violation = self._violation_amount(report)
                    if violation < min_violation or (
                        np.isclose(violation, min_violation) and report["accuracy"] > best_report["accuracy"]
                    ):
                        min_violation = violation
                        best_thresholds = thresholds
                        best_report = report

        return best_thresholds, best_report

    def _within_constraint(self, report: Dict[str, float]) -> bool:
        if self.constraint == FairnessConstraint.DEMOGRAPHIC_PARITY:
            return report["demographic_parity_diff"] <= self.tolerance
        if self.constraint == FairnessConstraint.EQUAL_OPPORTUNITY:
            return report["tpr_gap"] <= self.tolerance
        return max(report["tpr_gap"], report["fpr_gap"]) <= self.tolerance

    def _violation_amount(self, report: Dict[str, float]) -> float:
        if self.constraint == FairnessConstraint.DEMOGRAPHIC_PARITY:
            return report["demographic_parity_diff"]
        if self.constraint == FairnessConstraint.EQUAL_OPPORTUNITY:
            return report["tpr_gap"]
        return max(report["tpr_gap"], report["fpr_gap"])
