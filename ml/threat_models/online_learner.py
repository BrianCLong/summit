"""
Online learning for evolving threat detection
"""

import numpy as np
from collections import deque
from typing import Dict, Optional
from sklearn.linear_model import SGDClassifier
from sklearn.preprocessing import StandardScaler


class OnlineThreatLearner:
    """Online learning model that adapts to new threats"""

    def __init__(
        self,
        n_features: int,
        window_size: int = 10000,
        learning_rate: str = 'optimal',
        loss: str = 'log_loss'
    ):
        """
        Args:
            n_features: Number of input features
            window_size: Size of sliding window for retraining
            learning_rate: SGD learning rate schedule
            loss: Loss function ('log_loss', 'modified_huber', etc.)
        """
        self.n_features = n_features
        self.window_size = window_size

        self.model = SGDClassifier(
            loss=loss,
            learning_rate=learning_rate,
            random_state=42,
            warm_start=True
        )

        self.scaler = StandardScaler()
        self.data_buffer = deque(maxlen=window_size)
        self.label_buffer = deque(maxlen=window_size)
        self.initialized = False
        self.n_updates = 0

    def partial_fit(self, X: np.ndarray, y: np.ndarray, classes: Optional[np.ndarray] = None):
        """
        Incrementally update the model

        Args:
            X: New training data
            y: New labels
            classes: All possible classes (required for first call)
        """
        # Add to buffer
        for sample, label in zip(X, y):
            self.data_buffer.append(sample)
            self.label_buffer.append(label)

        if not self.initialized:
            if classes is None:
                raise ValueError("classes parameter required for first call")

            # Initialize with first batch
            X_buffer = np.array(self.data_buffer)
            y_buffer = np.array(self.label_buffer)

            self.scaler.fit(X_buffer)
            X_scaled = self.scaler.transform(X_buffer)

            self.model.partial_fit(X_scaled, y_buffer, classes=classes)
            self.initialized = True
        else:
            # Update model
            X_scaled = self.scaler.transform(X)
            self.model.partial_fit(X_scaled, y)

        self.n_updates += 1

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict classes"""
        if not self.initialized:
            raise ValueError("Model not initialized. Call partial_fit first.")

        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict class probabilities"""
        if not self.initialized:
            raise ValueError("Model not initialized. Call partial_fit first.")

        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)

    def get_model_performance(self) -> Dict:
        """Get model statistics"""
        return {
            'n_updates': self.n_updates,
            'buffer_size': len(self.data_buffer),
            'initialized': self.initialized
        }
