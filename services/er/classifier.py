"""Pairwise classifier using scikit-learn for entity resolution."""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from typing import Iterable, Sequence

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

from .features import FeatureEngineer
from .models import Entity, FeatureAttribution

ROOT = pathlib.Path(__file__).resolve().parent
TRAINING_DATA = ROOT / "data" / "training_pairs.json"


@dataclass
class LabeledPair:
    entity_a: Entity
    entity_b: Entity
    label: int


def load_training_pairs() -> list[LabeledPair]:
    data = json.loads(TRAINING_DATA.read_text())
    pairs: list[LabeledPair] = []
    for row in data:
        pairs.append(
            LabeledPair(
                entity_a=Entity(**row["entity_a"]),
                entity_b=Entity(**row["entity_b"]),
                label=int(row["label"]),
            )
        )
    return pairs


class PairwiseClassifier:
    def __init__(self, feature_names: Sequence[str], model_version: str = "v1") -> None:
        self.feature_names = list(feature_names)
        self.model = LogisticRegression(random_state=42, solver="liblinear")
        self.model_version = model_version

    def _vectorize(self, features: dict[str, float]) -> np.ndarray:
        return np.array([features.get(name, 0.0) for name in self.feature_names], dtype=float)

    def fit(self, dataset: Iterable[LabeledPair], feature_engineer: FeatureEngineer) -> None:
        vectors: list[np.ndarray] = []
        labels: list[int] = []
        for row in dataset:
            features = feature_engineer.compute(row.entity_a, row.entity_b)
            vectors.append(self._vectorize(features))
            labels.append(row.label)
        X = np.vstack(vectors)
        y = np.array(labels)
        self.model.fit(X, y)

    def predict_proba(self, features: dict[str, float]) -> float:
        vector = self._vectorize(features)
        proba = self.model.predict_proba(vector.reshape(1, -1))[0][1]
        return float(proba)

    def explain(self, features: dict[str, float], top_k: int = 3) -> tuple[list[FeatureAttribution], dict[str, float]]:
        weights = {feature: float(weight) for feature, weight in zip(self.feature_names, self.model.coef_[0])}
        attributions: list[FeatureAttribution] = []
        for feature, value in features.items():
            weight = weights.get(feature, 0.0)
            contribution = weight * value
            attributions.append(
                FeatureAttribution(
                    feature=feature,
                    value=float(value),
                    weight=weight,
                    contribution=float(contribution),
                )
            )
        attributions.sort(key=lambda item: abs(item.contribution), reverse=True)
        return attributions[:top_k], weights

    def roc_auc(self, dataset: Iterable[LabeledPair], feature_engineer: FeatureEngineer) -> float:
        vectors: list[np.ndarray] = []
        labels: list[int] = []
        for row in dataset:
            features = feature_engineer.compute(row.entity_a, row.entity_b)
            vectors.append(self._vectorize(features))
            labels.append(row.label)
        X = np.vstack(vectors)
        y = np.array(labels)
        probabilities = self.model.predict_proba(X)[:, 1]
        return float(roc_auc_score(y, probabilities))
