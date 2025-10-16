"""Explainable metrics engine for the threat analytics layer."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from statistics import mean, pstdev

from .data_models import FusedSnapshot


@dataclass
class MetricBreakdown:
    influence_velocity: float
    anomaly_clustering: float
    behavioral_drift: float
    event_pressure: float

    def as_dict(self) -> dict[str, float]:
        return {
            "influence_velocity": self.influence_velocity,
            "anomaly_clustering": self.anomaly_clustering,
            "behavioral_drift": self.behavioral_drift,
            "event_pressure": self.event_pressure,
        }


class ExplainableMetricsEngine:
    """Calculates explainable metrics from fused snapshots."""

    def __init__(self, history_window: int = 50) -> None:
        if history_window < 2:
            raise ValueError("history_window must be at least 2")
        self._history: deque[FusedSnapshot] = deque(maxlen=history_window)

    def compute(self, snapshot: FusedSnapshot) -> MetricBreakdown:
        influence_velocity = self._compute_influence_velocity(snapshot)
        anomaly_clustering = self._compute_anomaly_clustering(snapshot)
        behavioral_drift = self._compute_behavioral_drift(snapshot)
        metrics = MetricBreakdown(
            influence_velocity=influence_velocity,
            anomaly_clustering=anomaly_clustering,
            behavioral_drift=behavioral_drift,
            event_pressure=snapshot.event_pressure,
        )
        self._history.append(snapshot)
        return metrics

    def _compute_influence_velocity(self, snapshot: FusedSnapshot) -> float:
        if not self._history:
            return snapshot.influence_score
        previous = self._history[-1]
        delta = snapshot.influence_score - previous.influence_score
        time_factor = max(1.0, (snapshot.timestamp - previous.timestamp).total_seconds() / 3600.0)
        velocity = delta / time_factor
        return max(-1.0, min(1.0, velocity))

    def _compute_anomaly_clustering(self, snapshot: FusedSnapshot) -> float:
        anomalies = [s.anomaly_score for s in self._history]
        if not anomalies:
            baseline = snapshot.anomaly_score
            return baseline
        mean_anomaly = mean(anomalies)
        dispersion = pstdev(anomalies) or 1e-6
        z_score = (snapshot.anomaly_score - mean_anomaly) / dispersion
        return max(-5.0, min(5.0, z_score))

    def _compute_behavioral_drift(self, snapshot: FusedSnapshot) -> float:
        shifts = [s.behavior_shift for s in self._history]
        prior_mean = mean(shifts) if shifts else 0.0
        drift = snapshot.behavior_shift - prior_mean
        if not shifts:
            return snapshot.behavior_shift
        stabilization = 1.0 / (len(shifts) + 1)
        return max(-1.0, min(1.0, drift * stabilization + snapshot.behavior_shift * 0.1))

    @property
    def history(self) -> deque[FusedSnapshot]:
        return self._history
