"""
Threat Intel Confidence Ensemble Scorer - v3
Ensemble-based confidence scoring with calibration for threat intelligence
"""

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from typing import Dict, List, Tuple
import joblib
import logging
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ThreatIntelSource:
    """Threat intelligence source metadata"""
    source_id: str
    source_name: str
    reliability_score: float  # 0.0 - 1.0
    timeliness_weight: float  # 0.0 - 1.0
    historical_accuracy: float  # 0.0 - 1.0
    specialization: str  # malware, phishing, c2, etc.


@dataclass
class ConfidenceScore:
    """Ensemble confidence score output"""
    raw_score: float  # 0.0 - 1.0
    calibrated_score: float  # 0.0 - 1.0
    confidence_level: str  # low, medium, high, critical
    contributing_sources: List[str]
    ensemble_agreement: float  # 0.0 - 1.0
    uncertainty: float  # 0.0 - 1.0
    timestamp: datetime


class IntelConfidenceEnsemble:
    """
    Ensemble-based threat intelligence confidence scorer

    Features:
    - Multiple base estimators (RF, GB, LR)
    - Calibration via isotonic regression
    - Source reliability weighting
    - Ensemble agreement tracking
    - Uncertainty quantification
    """

    def __init__(self, calibration_method='isotonic'):
        self.calibration_method = calibration_method

        # Base estimators
        self.estimators = {
            'random_forest': RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                min_samples_split=10,
                random_state=42
            ),
            'gradient_boosting': GradientBoostingClassifier(
                n_estimators=100,
                max_depth=5,
                learning_rate=0.1,
                random_state=42
            ),
            'logistic_regression': LogisticRegression(
                C=1.0,
                solver='lbfgs',
                max_iter=1000,
                random_state=42
            )
        }

        # Calibrated estimators
        self.calibrated_estimators = {}

        # Source reliability weights
        self.source_weights = {}

        # Calibration data
        self.calibration_curve = None
        self.brier_score = None

        # Trained flag
        self.is_trained = False

    def train(self, X_train: np.ndarray, y_train: np.ndarray,
              X_cal: np.ndarray, y_cal: np.ndarray,
              source_metadata: Dict[str, ThreatIntelSource]) -> Dict:
        """
        Train ensemble with calibration

        Args:
            X_train: Training features
            y_train: Training labels
            X_cal: Calibration features
            y_cal: Calibration labels
            source_metadata: Source reliability information

        Returns:
            Training metrics
        """
        logger.info("Training ensemble confidence scorer...")

        # Store source weights
        self.source_weights = {
            src.source_id: src.reliability_score * src.historical_accuracy
            for src in source_metadata.values()
        }

        # Train base estimators
        for name, estimator in self.estimators.items():
            logger.info(f"Training {name}...")
            estimator.fit(X_train, y_train)

            # Calibrate estimator
            calibrated = CalibratedClassifierCV(
                estimator,
                method=self.calibration_method,
                cv='prefit'
            )
            calibrated.fit(X_cal, y_cal)

            self.calibrated_estimators[name] = calibrated

        # Evaluate calibration
        metrics = self._evaluate_calibration(X_cal, y_cal)

        self.is_trained = True
        logger.info("Ensemble training complete")

        return metrics

    def predict_confidence(self, features: np.ndarray,
                          sources: List[str],
                          return_uncertainty: bool = True) -> ConfidenceScore:
        """
        Predict confidence score with ensemble

        Args:
            features: Input features
            sources: Contributing source IDs
            return_uncertainty: Whether to compute uncertainty

        Returns:
            ConfidenceScore with calibrated prediction
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Call train() first.")

        # Get predictions from all estimators
        predictions = []
        for name, estimator in self.calibrated_estimators.items():
            pred_proba = estimator.predict_proba(features.reshape(1, -1))[0, 1]
            predictions.append(pred_proba)

        # Weight by source reliability
        source_weight = np.mean([
            self.source_weights.get(src, 0.5) for src in sources
        ])

        # Ensemble average
        raw_score = np.mean(predictions)

        # Apply source weighting
        calibrated_score = raw_score * source_weight

        # Ensemble agreement (std deviation)
        agreement = 1.0 - np.std(predictions)

        # Uncertainty quantification
        uncertainty = 0.0
        if return_uncertainty:
            uncertainty = self._compute_uncertainty(predictions, source_weight)

        # Determine confidence level
        confidence_level = self._classify_confidence(calibrated_score, agreement)

        return ConfidenceScore(
            raw_score=float(raw_score),
            calibrated_score=float(calibrated_score),
            confidence_level=confidence_level,
            contributing_sources=sources,
            ensemble_agreement=float(agreement),
            uncertainty=float(uncertainty),
            timestamp=datetime.utcnow()
        )

    def _compute_uncertainty(self, predictions: List[float],
                           source_weight: float) -> float:
        """Compute epistemic uncertainty using ensemble disagreement"""
        # Epistemic uncertainty from ensemble disagreement
        epistemic = np.std(predictions)

        # Aleatoric uncertainty from source reliability
        aleatoric = 1.0 - source_weight

        # Total uncertainty
        total_uncertainty = np.sqrt(epistemic**2 + aleatoric**2)

        return min(total_uncertainty, 1.0)

    def _classify_confidence(self, score: float, agreement: float) -> str:
        """Classify confidence level based on score and ensemble agreement"""
        # High agreement, high score
        if score >= 0.8 and agreement >= 0.8:
            return 'critical'
        elif score >= 0.6 and agreement >= 0.7:
            return 'high'
        elif score >= 0.4 and agreement >= 0.6:
            return 'medium'
        else:
            return 'low'

    def _evaluate_calibration(self, X_cal: np.ndarray,
                              y_cal: np.ndarray) -> Dict:
        """Evaluate calibration quality"""
        metrics = {}

        for name, estimator in self.calibrated_estimators.items():
            # Get calibrated predictions
            y_pred_proba = estimator.predict_proba(X_cal)[:, 1]

            # Brier score (lower is better, 0-1 range)
            brier = brier_score_loss(y_cal, y_pred_proba)

            # AUC-ROC
            auc = roc_auc_score(y_cal, y_pred_proba)

            metrics[name] = {
                'brier_score': float(brier),
                'auc_roc': float(auc),
                'calibrated': True
            }

        # Average ensemble metrics
        metrics['ensemble'] = {
            'avg_brier_score': np.mean([m['brier_score'] for m in metrics.values() if isinstance(m, dict)]),
            'avg_auc_roc': np.mean([m['auc_roc'] for m in metrics.values() if isinstance(m, dict)])
        }

        self.brier_score = metrics['ensemble']['avg_brier_score']

        return metrics

    def save(self, path: str):
        """Save trained model"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")

        model_data = {
            'calibrated_estimators': self.calibrated_estimators,
            'source_weights': self.source_weights,
            'calibration_method': self.calibration_method,
            'brier_score': self.brier_score,
            'is_trained': self.is_trained
        }

        joblib.dump(model_data, path)
        logger.info(f"Model saved to {path}")

    def load(self, path: str):
        """Load trained model"""
        model_data = joblib.load(path)

        self.calibrated_estimators = model_data['calibrated_estimators']
        self.source_weights = model_data['source_weights']
        self.calibration_method = model_data['calibration_method']
        self.brier_score = model_data['brier_score']
        self.is_trained = model_data['is_trained']

        logger.info(f"Model loaded from {path}")


def example_usage():
    """Example usage of ensemble scorer"""

    # Mock source metadata
    sources = {
        'virustotal': ThreatIntelSource(
            source_id='virustotal',
            source_name='VirusTotal',
            reliability_score=0.95,
            timeliness_weight=0.9,
            historical_accuracy=0.92,
            specialization='malware'
        ),
        'abuseipdb': ThreatIntelSource(
            source_id='abuseipdb',
            source_name='AbuseIPDB',
            reliability_score=0.85,
            timeliness_weight=0.95,
            historical_accuracy=0.88,
            specialization='c2'
        ),
        'otx': ThreatIntelSource(
            source_id='otx',
            source_name='AlienVault OTX',
            reliability_score=0.8,
            timeliness_weight=0.85,
            historical_accuracy=0.83,
            specialization='general'
        )
    }

    # Generate synthetic training data
    np.random.seed(42)
    n_train = 1000
    n_cal = 200
    n_features = 10

    X_train = np.random.randn(n_train, n_features)
    y_train = (np.sum(X_train, axis=1) > 0).astype(int)

    X_cal = np.random.randn(n_cal, n_features)
    y_cal = (np.sum(X_cal, axis=1) > 0).astype(int)

    # Train ensemble
    ensemble = IntelConfidenceEnsemble(calibration_method='isotonic')
    metrics = ensemble.train(X_train, y_train, X_cal, y_cal, sources)

    print("Training Metrics:")
    print(f"  Ensemble Brier Score: {metrics['ensemble']['avg_brier_score']:.4f}")
    print(f"  Ensemble AUC-ROC: {metrics['ensemble']['avg_auc_roc']:.4f}")

    # Predict on new sample
    X_new = np.random.randn(n_features)
    contributing_sources = ['virustotal', 'abuseipdb']

    confidence = ensemble.predict_confidence(X_new, contributing_sources)

    print("\nPrediction:")
    print(f"  Raw Score: {confidence.raw_score:.3f}")
    print(f"  Calibrated Score: {confidence.calibrated_score:.3f}")
    print(f"  Confidence Level: {confidence.confidence_level}")
    print(f"  Ensemble Agreement: {confidence.ensemble_agreement:.3f}")
    print(f"  Uncertainty: {confidence.uncertainty:.3f}")
    print(f"  Contributing Sources: {', '.join(confidence.contributing_sources)}")


if __name__ == "__main__":
    example_usage()
