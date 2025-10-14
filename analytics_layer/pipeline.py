"""Data fusion pipeline that combines external, internal, and world event data."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from statistics import mean
from typing import Iterable, List, Sequence

from .data_models import (
    ExternalMeasurement,
    FusedSnapshot,
    InternalSignal,
    WorldEventTrigger,
    extract_domain,
)


class DataFusionPipeline:
    """Fuse multi-source signals into a single normalized snapshot."""

    def __init__(self, influence_floor: float = 0.0, influence_ceiling: float = 100.0) -> None:
        self._influence_floor = influence_floor
        self._influence_ceiling = influence_ceiling

    def fuse(
        self,
        external_measurements: Sequence[ExternalMeasurement],
        internal_signals: Sequence[InternalSignal],
        event_triggers: Sequence[WorldEventTrigger],
    ) -> FusedSnapshot:
        if not external_measurements and not internal_signals and not event_triggers:
            raise ValueError("At least one data source is required to fuse a snapshot.")

        domain = self._resolve_domain(external_measurements, internal_signals, event_triggers)
        timestamp = self._latest_timestamp(external_measurements, internal_signals, event_triggers)

        fused_features = self._aggregate_features(external_measurements, internal_signals, event_triggers)

        influence_score = self._normalize(
            fused_features["external_reach"] * 0.4
            + fused_features["external_amplification"] * 0.2
            + fused_features["internal_user_growth"] * 0.2
            + (1 - fused_features["internal_platform_health"]) * 0.2
        )

        anomaly_score = min(1.0, fused_features["internal_suspicious_activity"] * 0.6 + fused_features["event_pressure"] * 0.4)

        behavior_shift = max(0.0, fused_features["behavioral_entropy"] - fused_features["baseline_entropy"])

        confidence = self._compute_confidence(fused_features)

        snapshot = FusedSnapshot(
            domain=domain,
            timestamp=timestamp,
            influence_score=influence_score,
            anomaly_score=anomaly_score,
            behavior_shift=behavior_shift,
            event_pressure=fused_features["event_pressure"],
            sample_size=int(fused_features["sample_size"]),
            confidence=confidence,
            features=fused_features,
        )
        return snapshot

    def _resolve_domain(
        self,
        external_measurements: Sequence[ExternalMeasurement],
        internal_signals: Sequence[InternalSignal],
        event_triggers: Sequence[WorldEventTrigger],
    ) -> str:
        domain = (
            extract_domain(external_measurements)
            or extract_domain(internal_signals)
            or extract_domain(event_triggers)
        )
        if not domain:
            raise ValueError("Unable to resolve domain from provided data sources.")
        return domain

    @staticmethod
    def _latest_timestamp(
        external_measurements: Sequence[ExternalMeasurement],
        internal_signals: Sequence[InternalSignal],
        event_triggers: Sequence[WorldEventTrigger],
    ) -> datetime:
        timestamps: List[datetime] = []
        for collection in (external_measurements, internal_signals, event_triggers):
            timestamps.extend(item.timestamp for item in collection)
        return max(timestamps)

    def _aggregate_features(
        self,
        external_measurements: Sequence[ExternalMeasurement],
        internal_signals: Sequence[InternalSignal],
        event_triggers: Sequence[WorldEventTrigger],
    ) -> dict:
        features = defaultdict(float)

        if external_measurements:
            features["external_reach"] = self._bounded_mean((m.reach for m in external_measurements), 0.0, 1.0)
            features["external_amplification"] = self._bounded_mean(
                (m.amplification for m in external_measurements), 0.0, 1.0
            )
            features["external_sentiment"] = self._bounded_mean((m.sentiment for m in external_measurements), -1.0, 1.0)
        else:
            features["external_reach"] = 0.0
            features["external_amplification"] = 0.0
            features["external_sentiment"] = 0.0

        if internal_signals:
            features["internal_user_growth"] = self._bounded_mean((s.user_growth for s in internal_signals), 0.0, 1.0)
            features["internal_suspicious_activity"] = self._bounded_mean(
                (s.suspicious_activity for s in internal_signals), 0.0, 1.0
            )
            features["internal_platform_health"] = self._bounded_mean(
                (s.platform_health for s in internal_signals), 0.0, 1.0
            )
        else:
            features["internal_user_growth"] = 0.0
            features["internal_suspicious_activity"] = 0.0
            features["internal_platform_health"] = 1.0

        if event_triggers:
            event_pressure = self._bounded_mean(
                (trigger.severity * trigger.relevance for trigger in event_triggers), 0.0, 1.0
            )
            features["event_pressure"] = event_pressure
        else:
            features["event_pressure"] = 0.0

        features["behavioral_entropy"] = max(
            0.0,
            features["external_amplification"] * 0.3
            + features["internal_suspicious_activity"] * 0.5
            + (1 - features["external_sentiment"]) * 0.2,
        )
        features["baseline_entropy"] = 0.35
        features["sample_size"] = len(external_measurements) + len(internal_signals) + len(event_triggers)
        return dict(features)

    def _normalize(self, value: float) -> float:
        normalized = (value - self._influence_floor) / (self._influence_ceiling - self._influence_floor or 1)
        return max(0.0, min(1.0, normalized))

    @staticmethod
    def _bounded_mean(values: Iterable[float], lower: float, upper: float) -> float:
        collected = [max(lower, min(upper, v)) for v in values]
        return mean(collected) if collected else 0.0

    @staticmethod
    def _compute_confidence(features: dict) -> float:
        base_confidence = min(1.0, 0.1 * features.get("sample_size", 0))
        volatility_penalty = abs(features.get("external_sentiment", 0.0)) * 0.2
        return max(0.1, base_confidence - volatility_penalty)
