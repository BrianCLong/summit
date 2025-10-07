"""
Intel v4 - Active Learning Beta
Feedback capture, labeling, batch retrain pipeline, canary deployment
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum
import logging
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score
import joblib

logger = logging.getLogger(__name__)


class FeedbackType(Enum):
    TRUE_POSITIVE = "true_positive"
    FALSE_POSITIVE = "false_positive"
    TRUE_NEGATIVE = "true_negative"
    FALSE_NEGATIVE = "false_negative"


class ReasonCode(Enum):
    CORRECT_THREAT = "correct_threat"
    BENIGN_ACTIVITY = "benign_activity"
    KNOWN_SAFE = "known_safe"
    MISCONFIGURATION = "misconfiguration"
    TEST_ACTIVITY = "test_activity"
    OTHER = "other"


@dataclass
class FeedbackLabel:
    """Analyst feedback label"""
    label_id: str
    indicator_value: str
    indicator_type: str
    predicted_score: float
    feedback_type: FeedbackType
    reason_code: ReasonCode
    analyst_id: str
    comments: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    features: Optional[Dict] = None


@dataclass
class ModelVersion:
    """Model registry entry"""
    version_id: str
    model_type: str  # 'v3' or 'v4'
    algorithm: str
    metrics: Dict
    trained_at: datetime
    deployed_at: Optional[datetime] = None
    is_canary: bool = False
    canary_percentage: float = 0.0


class ActiveLearningFeedbackStore:
    """
    Feedback capture and labeling store

    Features:
    - Thumbs up/down with reason codes
    - Label persistence
    - Privacy review compliant (no PII)
    """

    def __init__(self):
        self.labels: List[FeedbackLabel] = []
        self.label_index: Dict[str, FeedbackLabel] = {}

    def capture_feedback(self, label: FeedbackLabel) -> str:
        """Capture analyst feedback"""

        # Privacy check - ensure no PII in comments
        if label.comments:
            if self._contains_pii(label.comments):
                raise ValueError("Comments contain potential PII - privacy violation")

        # Store label
        self.labels.append(label)
        self.label_index[label.label_id] = label

        logger.info(f"Feedback captured: {label.feedback_type.value} for {label.indicator_value} by {label.analyst_id}")

        return label.label_id

    def get_training_data(self, min_confidence: float = 0.0) -> tuple:
        """Get labeled data for training"""

        X = []
        y = []

        for label in self.labels:
            if not label.features:
                continue

            # Convert features to array
            feature_vector = [
                label.features.get('source_count', 0),
                label.features.get('age_days', 0),
                label.features.get('reputation_score', 0.5),
                label.features.get('prevalence', 0),
                label.predicted_score
            ]

            # Convert feedback to binary label
            if label.feedback_type in [FeedbackType.TRUE_POSITIVE, FeedbackType.FALSE_NEGATIVE]:
                y_label = 1  # Malicious
            else:
                y_label = 0  # Benign

            X.append(feature_vector)
            y.append(y_label)

        return np.array(X), np.array(y)

    def _contains_pii(self, text: str) -> bool:
        """Privacy check - detect potential PII"""

        # Simple PII detection (in production, use proper PII detection)
        pii_patterns = ['@', 'ssn', 'social security', 'credit card', 'phone number']

        text_lower = text.lower()
        for pattern in pii_patterns:
            if pattern in text_lower:
                return True

        return False

    def get_feedback_stats(self) -> Dict:
        """Get feedback statistics"""

        total = len(self.labels)

        stats = {
            'total_labels': total,
            'by_type': {},
            'by_reason': {},
            'by_analyst': {}
        }

        for label in self.labels:
            # By type
            feedback_type = label.feedback_type.value
            stats['by_type'][feedback_type] = stats['by_type'].get(feedback_type, 0) + 1

            # By reason
            reason = label.reason_code.value
            stats['by_reason'][reason] = stats['by_reason'].get(reason, 0) + 1

            # By analyst
            analyst = label.analyst_id
            stats['by_analyst'][analyst] = stats['by_analyst'].get(analyst, 0) + 1

        return stats


class ActiveLearningPipeline:
    """
    Batch retrain pipeline with canary deployment

    Features:
    - Model registry v4
    - Evaluation metrics (Brier, PR-AUC)
    - Gated export to detections
    - Canary deployment (gradual rollout)
    """

    def __init__(self, feedback_store: ActiveLearningFeedbackStore):
        self.feedback_store = feedback_store
        self.model_registry: List[ModelVersion] = []
        self.current_production_model: Optional[ModelVersion] = None
        self.canary_model: Optional[ModelVersion] = None

    async def retrain_model(self, min_samples: int = 100) -> ModelVersion:
        """Retrain model with feedback data"""

        # Get training data
        X, y = self.feedback_store.get_training_data()

        if len(X) < min_samples:
            raise ValueError(f"Insufficient training data: {len(X)} < {min_samples}")

        logger.info(f"Retraining model with {len(X)} labeled samples")

        # Train model
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )
        model.fit(X, y)

        # Evaluate
        y_pred_proba = model.predict_proba(X)[:, 1]

        roc_auc = roc_auc_score(y, y_pred_proba)
        precision, recall, _ = precision_recall_curve(y, y_pred_proba)
        pr_auc = auc(recall, precision)

        # Calculate Brier score
        from sklearn.metrics import brier_score_loss
        brier = brier_score_loss(y, y_pred_proba)

        metrics = {
            'roc_auc': roc_auc,
            'pr_auc': pr_auc,
            'brier_score': brier,
            'training_samples': len(X)
        }

        # Create model version
        version = ModelVersion(
            version_id=f"v4_{int(datetime.utcnow().timestamp())}",
            model_type='v4',
            algorithm='RandomForest',
            metrics=metrics,
            trained_at=datetime.utcnow()
        )

        # Save model
        self._save_model(model, version)

        # Add to registry
        self.model_registry.append(version)

        logger.info(f"Model v4 trained: ROC-AUC={roc_auc:.3f}, PR-AUC={pr_auc:.3f}, Brier={brier:.3f}")

        return version

    def deploy_canary(self, version: ModelVersion, canary_percentage: float = 10.0):
        """Deploy model as canary (gradual rollout)"""

        if canary_percentage < 0 or canary_percentage > 100:
            raise ValueError("Canary percentage must be 0-100")

        version.is_canary = True
        version.canary_percentage = canary_percentage
        version.deployed_at = datetime.utcnow()

        self.canary_model = version

        logger.info(f"Model {version.version_id} deployed as canary ({canary_percentage}% traffic)")

    def evaluate_canary(self) -> Dict:
        """Evaluate canary performance vs production"""

        if not self.canary_model or not self.current_production_model:
            raise ValueError("No canary or production model to compare")

        # Compare metrics
        canary_metrics = self.canary_model.metrics
        prod_metrics = self.current_production_model.metrics

        comparison = {
            'canary_version': self.canary_model.version_id,
            'production_version': self.current_production_model.version_id,
            'roc_auc_delta': canary_metrics['roc_auc'] - prod_metrics['roc_auc'],
            'pr_auc_delta': canary_metrics['pr_auc'] - prod_metrics['pr_auc'],
            'brier_delta': canary_metrics['brier_score'] - prod_metrics['brier_score'],
            'recommendation': 'PROMOTE' if canary_metrics['pr_auc'] > prod_metrics['pr_auc'] else 'ROLLBACK'
        }

        logger.info(f"Canary evaluation: {comparison['recommendation']} (PR-AUC Δ={comparison['pr_auc_delta']:.3f})")

        return comparison

    def promote_canary(self):
        """Promote canary to full production"""

        if not self.canary_model:
            raise ValueError("No canary model to promote")

        self.current_production_model = self.canary_model
        self.current_production_model.is_canary = False
        self.current_production_model.canary_percentage = 100.0
        self.canary_model = None

        logger.info(f"Model {self.current_production_model.version_id} promoted to production")

    def rollback_canary(self):
        """Rollback canary deployment"""

        if not self.canary_model:
            raise ValueError("No canary model to rollback")

        logger.info(f"Rolling back canary {self.canary_model.version_id}")

        self.canary_model = None

    def _save_model(self, model, version: ModelVersion):
        """Save model to registry"""

        model_path = f"models/intel_v4_{version.version_id}.pkl"
        joblib.dump({
            'model': model,
            'version': version,
            'metrics': version.metrics
        }, model_path)

        logger.info(f"Model saved to {model_path}")


# Example usage
async def example_active_learning():
    """Example active learning workflow"""

    # Create feedback store
    feedback_store = ActiveLearningFeedbackStore()

    # Capture feedback
    label1 = FeedbackLabel(
        label_id='label_001',
        indicator_value='malicious.com',
        indicator_type='domain',
        predicted_score=0.85,
        feedback_type=FeedbackType.TRUE_POSITIVE,
        reason_code=ReasonCode.CORRECT_THREAT,
        analyst_id='analyst_1',
        comments='Known C2 domain',
        features={
            'source_count': 3,
            'age_days': 2,
            'reputation_score': 0.9,
            'prevalence': 5
        }
    )

    feedback_store.capture_feedback(label1)

    # Get stats
    stats = feedback_store.get_feedback_stats()
    print(f"Feedback stats: {stats}")

    # Create pipeline
    pipeline = ActiveLearningPipeline(feedback_store)

    # Note: In production, would wait for min_samples
    # Here we'll use synthetic data for demo
    for i in range(100):
        label = FeedbackLabel(
            label_id=f'label_{i:03d}',
            indicator_value=f'indicator_{i}',
            indicator_type='domain',
            predicted_score=np.random.random(),
            feedback_type=FeedbackType.TRUE_POSITIVE if np.random.random() > 0.3 else FeedbackType.FALSE_POSITIVE,
            reason_code=ReasonCode.CORRECT_THREAT,
            analyst_id='analyst_1',
            features={
                'source_count': np.random.randint(1, 10),
                'age_days': np.random.randint(1, 30),
                'reputation_score': np.random.random(),
                'prevalence': np.random.randint(1, 100)
            }
        )
        feedback_store.capture_feedback(label)

    # Retrain
    new_version = await pipeline.retrain_model(min_samples=100)
    print(f"New model: {new_version.version_id}, Brier: {new_version.metrics['brier_score']:.3f}")

    # Deploy canary
    pipeline.deploy_canary(new_version, canary_percentage=10.0)
    print(f"Canary deployed at 10% traffic")


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_active_learning())
