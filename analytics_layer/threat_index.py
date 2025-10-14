"""Real-time threat index calculator."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Deque, Dict, List, Tuple

from .data_models import FusedSnapshot
from .metrics import MetricBreakdown


@dataclass
class ThreatIndexState:
    timestamp: datetime
    value: float
    confidence: float
    components: Dict[str, float]


class RealTimeThreatIndexCalculator:
    """Combines explainable metrics to produce a patent-grade threat index."""

    def __init__(
        self,
        influence_weight: float = 0.35,
        anomaly_weight: float = 0.3,
        drift_weight: float = 0.2,
        event_weight: float = 0.15,
        decay: float = 0.65,
    ) -> None:
        if not 0 < decay <= 1:
            raise ValueError("decay must be between 0 and 1")
        self._weights = {
            "influence_velocity": influence_weight,
            "anomaly_clustering": anomaly_weight,
            "behavioral_drift": drift_weight,
            "event_pressure": event_weight,
        }
        self._decay = decay
        self._history: List[ThreatIndexState] = []

    def update(self, snapshot: FusedSnapshot, metrics: MetricBreakdown) -> ThreatIndexState:
        raw_components = self._weighted_components(metrics)
        blended_value = sum(raw_components.values()) * 100
        stabilized = self._stabilize(blended_value)
        confidence = self._compute_confidence(snapshot, metrics)
        state = ThreatIndexState(
            timestamp=snapshot.timestamp,
            value=stabilized,
            confidence=confidence,
            components=raw_components,
        )
        self._history.append(state)
        return state

    def _weighted_components(self, metrics: MetricBreakdown) -> Dict[str, float]:
        breakdown = metrics.as_dict()
        weighted = {
            key: max(-1.0, min(1.0, breakdown[key])) * weight
            for key, weight in self._weights.items()
        }
        return weighted

    def _stabilize(self, value: float) -> float:
        if not self._history:
            return max(0.0, min(100.0, value))
        previous = self._history[-1].value
        stabilized = self._decay * previous + (1 - self._decay) * value
        return max(0.0, min(100.0, stabilized))

    def _compute_confidence(self, snapshot: FusedSnapshot, metrics: MetricBreakdown) -> float:
        volatility = sum(abs(v) for v in metrics.as_dict().values()) / 4
        base_confidence = snapshot.confidence * (1 - min(1.0, volatility))
        smoothing_bonus = min(0.2, 0.02 * len(self._history))
        return max(0.1, min(1.0, base_confidence + smoothing_bonus))

    @property
    def history(self) -> List[ThreatIndexState]:
        return self._history

    def summary(self) -> Dict[str, float]:
        if not self._history:
            return {"current_value": 0.0, "confidence": 0.0}
        current = self._history[-1]
        return {"current_value": current.value, "confidence": current.confidence}
