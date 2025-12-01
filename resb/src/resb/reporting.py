"""Reporting utilities for RESB."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support
from sklearn.model_selection import train_test_split


@dataclass(frozen=True)
class FidelityReport:
    """Describes how closely synthetic data matches the source distribution."""

    class_balance: Dict[str, float]
    numeric_drift: Dict[str, float]
    categorical_overlap: Dict[str, float]


@dataclass(frozen=True)
class UtilityReport:
    """Captures the predictive uplift delivered by the boost set."""

    rare_class_recall: float
    precision: float
    recall_gain: float
    meets_precision_target: bool


def build_fidelity_report(original: pd.DataFrame, synthetic: pd.DataFrame, target: str) -> FidelityReport:
    """Compute summary statistics describing fidelity."""

    class_balance = (
        pd.concat([original[target], synthetic[target]])
        .value_counts(normalize=True)
        .to_dict()
    )

    numeric_columns = original.select_dtypes(include=["number"]).columns
    numeric_drift: Dict[str, float] = {}
    for column in numeric_columns:
        orig = original[column]
        synth = synthetic[column]
        if orig.std(ddof=0) == 0:
            numeric_drift[column] = float(abs(orig.mean() - synth.mean()))
        else:
            numeric_drift[column] = float(abs(orig.mean() - synth.mean()) / (orig.std(ddof=0) + 1e-9))

    categorical_columns = [c for c in original.columns if c not in numeric_columns and c != target]
    categorical_overlap: Dict[str, float] = {}
    for column in categorical_columns:
        orig_counts = original[column].value_counts(normalize=True)
        synth_counts = synthetic[column].value_counts(normalize=True)
        overlap = 0.0
        for label in set(orig_counts.index).union(synth_counts.index):
            overlap += min(orig_counts.get(label, 0.0), synth_counts.get(label, 0.0))
        categorical_overlap[column] = float(overlap)

    return FidelityReport(
        class_balance=class_balance,
        numeric_drift=numeric_drift,
        categorical_overlap=categorical_overlap,
    )


def build_utility_report(
    original: pd.DataFrame,
    augmented: pd.DataFrame,
    target_column: str,
    minority_value: object,
    precision_target: float,
    seed: int,
) -> UtilityReport:
    """Train baseline vs boosted models and summarise uplift."""

    features = [c for c in original.columns if c != target_column]
    X_orig = _prepare_features(original[features])
    y_orig = (original[target_column] == minority_value).astype(int)

    X_aug = _prepare_features(augmented[features])
    y_aug = (augmented[target_column] == minority_value).astype(int)

    metrics_baseline = _train_and_score(X_orig, y_orig, seed)
    metrics_augmented = _train_and_score(X_aug, y_aug, seed)

    recall_gain = float(metrics_augmented[1] - metrics_baseline[1])
    return UtilityReport(
        rare_class_recall=float(metrics_augmented[1]),
        precision=float(metrics_augmented[0]),
        recall_gain=recall_gain,
        meets_precision_target=bool(metrics_augmented[0] >= precision_target),
    )


def _prepare_features(df: pd.DataFrame) -> np.ndarray:
    encoded = pd.get_dummies(df, drop_first=False)
    return encoded.to_numpy(dtype=float)


def _train_and_score(X: np.ndarray, y: np.ndarray, seed: int) -> Tuple[float, float]:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, stratify=y, random_state=seed
    )
    model = LogisticRegression(max_iter=500, solver="lbfgs", random_state=seed)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    precision, recall, *_ = precision_recall_fscore_support(y_test, y_pred, average="binary")
    return float(precision), float(recall)
