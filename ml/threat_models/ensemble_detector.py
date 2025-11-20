"""
Ensemble threat detector combining multiple models
"""

import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class EnsembleConfig:
    aggregation_method: str = 'voting'  # 'voting', 'averaging', 'weighted'
    weights: Optional[List[float]] = None
    threshold: float = 0.5


class EnsembleDetector:
    """Ensemble detector combining multiple threat detection models"""

    def __init__(self, models: List, config: EnsembleConfig):
        """
        Args:
            models: List of trained models (must have predict_proba or predict_anomaly_score)
            config: Ensemble configuration
        """
        self.models = models
        self.config = config

        if config.weights is None:
            self.config.weights = [1.0 / len(models)] * len(models)
        elif len(config.weights) != len(models):
            raise ValueError("Number of weights must match number of models")

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict probabilities using ensemble"""
        all_probas = []

        for model in self.models:
            if hasattr(model, 'predict_proba'):
                probas = model.predict_proba(X)
            elif hasattr(model, 'predict_anomaly_score'):
                scores = model.predict_anomaly_score(X)
                probas = np.column_stack([1 - scores, scores])
            else:
                raise ValueError(f"Model {type(model)} doesn't support probability prediction")

            all_probas.append(probas)

        if self.config.aggregation_method == 'averaging':
            return np.mean(all_probas, axis=0)
        elif self.config.aggregation_method == 'weighted':
            weighted_probas = [p * w for p, w in zip(all_probas, self.config.weights)]
            return np.sum(weighted_probas, axis=0)
        else:
            raise ValueError(f"Unknown aggregation method: {self.config.aggregation_method}")

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict classes using ensemble"""
        if self.config.aggregation_method == 'voting':
            # Hard voting
            all_predictions = []
            for model in self.models:
                predictions = model.predict(X)
                all_predictions.append(predictions)

            all_predictions = np.array(all_predictions)
            # Return majority vote
            return np.apply_along_axis(
                lambda x: np.bincount(x).argmax(),
                axis=0,
                arr=all_predictions
            )
        else:
            # Soft voting
            probas = self.predict_proba(X)
            return np.argmax(probas, axis=1)
