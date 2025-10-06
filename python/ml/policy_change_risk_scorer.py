"""
Policy Change-Risk Scoring Engine - v1.0
Calculates risk score (0-100) for policy changes based on blast radius, privilege, and historical incidents
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime
from enum import Enum
import logging
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger(__name__)


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class PolicyChange:
    """Policy change representation"""
    change_id: str
    policy_id: str
    diff: Dict
    author_id: str
    timestamp: datetime
    affected_resources: Set[str] = field(default_factory=set)
    affected_users: Set[str] = field(default_factory=set)
    privilege_changes: List[Dict] = field(default_factory=list)


@dataclass
class RiskScore:
    """Risk score output"""
    change_id: str
    raw_score: float  # 0-100
    risk_level: RiskLevel
    blast_radius_score: float
    privilege_score: float
    incident_history_score: float
    factors: Dict[str, float]
    recommendations: List[str]
    requires_approval: bool


class PolicyChangeRiskScorer:
    """
    Change-risk scoring engine for policy changes

    Features:
    - Blast radius calculation (affected resources/users)
    - Privilege escalation detection
    - Historical incident correlation
    - AUC ≥0.80 target
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.scaler = StandardScaler()
        self.model: Optional[RandomForestClassifier] = None

        # Load model if path provided
        if model_path:
            self.load_model(model_path)
        else:
            # Initialize default model
            self.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                class_weight='balanced'
            )

        # Risk thresholds
        self.thresholds = {
            'low': 25,
            'medium': 50,
            'high': 75,
            'critical': 90
        }

        # Weights for risk factors
        self.factor_weights = {
            'blast_radius': 0.40,
            'privilege_escalation': 0.35,
            'incident_history': 0.25
        }

    def score_change(self, change: PolicyChange,
                     historical_incidents: List[Dict]) -> RiskScore:
        """
        Calculate risk score for policy change

        Args:
            change: Policy change to score
            historical_incidents: Past incidents related to policy changes

        Returns:
            Risk score with breakdown
        """

        # Calculate individual risk factors
        blast_radius_score = self._calculate_blast_radius(change)
        privilege_score = self._calculate_privilege_risk(change)
        incident_score = self._calculate_incident_correlation(change, historical_incidents)

        # Weighted raw score
        raw_score = (
            blast_radius_score * self.factor_weights['blast_radius'] +
            privilege_score * self.factor_weights['privilege_escalation'] +
            incident_score * self.factor_weights['incident_history']
        )

        # Determine risk level
        risk_level = self._determine_risk_level(raw_score)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            blast_radius_score,
            privilege_score,
            incident_score
        )

        # Approval requirement
        requires_approval = raw_score >= self.thresholds['medium']

        factors = {
            'blast_radius': blast_radius_score,
            'privilege_escalation': privilege_score,
            'incident_history': incident_score,
            'affected_resources': len(change.affected_resources),
            'affected_users': len(change.affected_users),
            'privilege_changes': len(change.privilege_changes)
        }

        return RiskScore(
            change_id=change.change_id,
            raw_score=raw_score,
            risk_level=risk_level,
            blast_radius_score=blast_radius_score,
            privilege_score=privilege_score,
            incident_history_score=incident_score,
            factors=factors,
            recommendations=recommendations,
            requires_approval=requires_approval
        )

    def _calculate_blast_radius(self, change: PolicyChange) -> float:
        """Calculate blast radius score (0-100)"""

        # Count affected entities
        resource_count = len(change.affected_resources)
        user_count = len(change.affected_users)

        # Normalize to 0-100 scale
        # Thresholds: 1-10 resources = low, 10-100 = medium, >100 = high
        resource_score = min(resource_count / 100.0, 1.0) * 100

        # Thresholds: 1-5 users = low, 5-50 = medium, >50 = high
        user_score = min(user_count / 50.0, 1.0) * 100

        # Combined blast radius (70% resources, 30% users)
        blast_score = (resource_score * 0.7) + (user_score * 0.3)

        logger.debug(f"Blast radius: {resource_count} resources, {user_count} users → {blast_score:.1f}")

        return blast_score

    def _calculate_privilege_risk(self, change: PolicyChange) -> float:
        """Calculate privilege escalation risk (0-100)"""

        if not change.privilege_changes:
            return 0.0

        risk_scores = []

        for priv_change in change.privilege_changes:
            action = priv_change.get('action', 'unknown')
            privilege = priv_change.get('privilege', '')
            scope = priv_change.get('scope', 'limited')

            # Base score by action
            action_scores = {
                'add': 50,
                'escalate': 80,
                'remove': 10,
                'modify': 40
            }
            base_score = action_scores.get(action, 30)

            # Multiply by privilege sensitivity
            privilege_multipliers = {
                'admin': 2.0,
                'write': 1.5,
                'delete': 1.8,
                'execute': 1.6,
                'read': 1.0
            }
            multiplier = 1.0
            for key, mult in privilege_multipliers.items():
                if key in privilege.lower():
                    multiplier = max(multiplier, mult)

            # Multiply by scope
            scope_multipliers = {
                'global': 2.0,
                'tenant': 1.5,
                'resource': 1.2,
                'limited': 1.0
            }
            scope_mult = scope_multipliers.get(scope, 1.0)

            priv_score = min(base_score * multiplier * scope_mult, 100.0)
            risk_scores.append(priv_score)

        # Return max score (most risky change)
        max_score = max(risk_scores) if risk_scores else 0.0

        logger.debug(f"Privilege risk: {len(change.privilege_changes)} changes → {max_score:.1f}")

        return max_score

    def _calculate_incident_correlation(self, change: PolicyChange,
                                       historical_incidents: List[Dict]) -> float:
        """Calculate correlation with past incidents (0-100)"""

        if not historical_incidents:
            return 0.0

        # Find incidents related to this policy
        related_incidents = [
            inc for inc in historical_incidents
            if inc.get('policy_id') == change.policy_id
        ]

        if not related_incidents:
            return 0.0

        # Score based on recency and severity
        scores = []
        now = datetime.utcnow()

        for incident in related_incidents:
            incident_time = incident.get('timestamp', now)
            severity = incident.get('severity', 'low')

            # Recency score (exponential decay, 90 days)
            days_ago = (now - incident_time).days
            recency_score = np.exp(-days_ago / 90.0) * 100

            # Severity multiplier
            severity_multipliers = {
                'critical': 2.0,
                'high': 1.5,
                'medium': 1.0,
                'low': 0.5
            }
            severity_mult = severity_multipliers.get(severity, 1.0)

            score = recency_score * severity_mult
            scores.append(score)

        # Average incident score
        avg_score = np.mean(scores) if scores else 0.0
        final_score = min(avg_score, 100.0)

        logger.debug(f"Incident correlation: {len(related_incidents)} incidents → {final_score:.1f}")

        return final_score

    def _determine_risk_level(self, raw_score: float) -> RiskLevel:
        """Determine risk level from raw score"""

        if raw_score >= self.thresholds['critical']:
            return RiskLevel.CRITICAL
        elif raw_score >= self.thresholds['high']:
            return RiskLevel.HIGH
        elif raw_score >= self.thresholds['medium']:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW

    def _generate_recommendations(self, blast_score: float,
                                 priv_score: float,
                                 incident_score: float) -> List[str]:
        """Generate recommendations based on risk factors"""

        recommendations = []

        if blast_score >= 70:
            recommendations.append("High blast radius detected. Consider phased rollout.")

        if priv_score >= 70:
            recommendations.append("Significant privilege changes. Require security review.")

        if incident_score >= 50:
            recommendations.append("Similar changes caused past incidents. Review incident reports.")

        if blast_score >= 50 and priv_score >= 50:
            recommendations.append("Both blast radius and privilege risk are high. Require approval from 2+ reviewers.")

        if incident_score >= 70:
            recommendations.append("High incident correlation. Consider rolling back this change type.")

        if not recommendations:
            recommendations.append("Low risk change. Standard review process applies.")

        return recommendations

    def train_model(self, X_train: np.ndarray, y_train: np.ndarray) -> Dict:
        """
        Train change-risk prediction model

        Args:
            X_train: Feature matrix (blast_radius, priv_score, incident_score, ...)
            y_train: Binary labels (0=no incident, 1=incident)

        Returns:
            Training metrics including AUC
        """

        # Scale features
        X_scaled = self.scaler.fit_transform(X_train)

        # Train model
        self.model.fit(X_scaled, y_train)

        # Evaluate
        from sklearn.metrics import roc_auc_score, precision_recall_curve, auc

        y_pred_proba = self.model.predict_proba(X_scaled)[:, 1]

        roc_auc = roc_auc_score(y_train, y_pred_proba)
        precision, recall, _ = precision_recall_curve(y_train, y_pred_proba)
        pr_auc = auc(recall, precision)

        metrics = {
            'roc_auc': roc_auc,
            'pr_auc': pr_auc,
            'feature_importance': dict(zip(
                ['blast_radius', 'privilege', 'incident_history'],
                self.model.feature_importances_
            ))
        }

        logger.info(f"Model trained: ROC-AUC={roc_auc:.3f}, PR-AUC={pr_auc:.3f}")

        return metrics

    def save_model(self, path: str):
        """Save model to disk"""
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'thresholds': self.thresholds,
            'factor_weights': self.factor_weights
        }, path)
        logger.info(f"Model saved to {path}")

    def load_model(self, path: str):
        """Load model from disk"""
        data = joblib.load(path)
        self.model = data['model']
        self.scaler = data['scaler']
        self.thresholds = data['thresholds']
        self.factor_weights = data['factor_weights']
        logger.info(f"Model loaded from {path}")


# Example usage
async def example_usage():
    """Example policy change risk scoring"""

    # Create scorer
    scorer = PolicyChangeRiskScorer()

    # Example policy change
    change = PolicyChange(
        change_id='change_001',
        policy_id='abac_enhanced',
        diff={
            'added': ['allow if admin'],
            'removed': []
        },
        author_id='user_123',
        timestamp=datetime.utcnow(),
        affected_resources={'resource_1', 'resource_2', 'resource_3'},
        affected_users={'user_1', 'user_2'},
        privilege_changes=[
            {'action': 'add', 'privilege': 'admin', 'scope': 'global'}
        ]
    )

    # Historical incidents
    historical_incidents = [
        {
            'policy_id': 'abac_enhanced',
            'timestamp': datetime.utcnow(),
            'severity': 'high'
        }
    ]

    # Calculate risk
    risk = scorer.score_change(change, historical_incidents)

    print(f"Change Risk Score: {risk.raw_score:.1f}")
    print(f"Risk Level: {risk.risk_level.value}")
    print(f"Blast Radius: {risk.blast_radius_score:.1f}")
    print(f"Privilege Risk: {risk.privilege_score:.1f}")
    print(f"Incident Correlation: {risk.incident_history_score:.1f}")
    print(f"Requires Approval: {risk.requires_approval}")
    print(f"Recommendations:")
    for rec in risk.recommendations:
        print(f"  - {rec}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_usage())
