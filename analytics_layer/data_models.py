"""Core dataclasses for the analytics layer."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ExternalMeasurement:
    """Represents an external network measurement for a domain/platform."""

    domain: str
    timestamp: datetime
    reach: float
    amplification: float
    sentiment: float

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> ExternalMeasurement:
        return cls(
            domain=str(payload["domain"]),
            timestamp=_ensure_datetime(payload["timestamp"]),
            reach=float(payload.get("reach", 0.0)),
            amplification=float(payload.get("amplification", 0.0)),
            sentiment=float(payload.get("sentiment", 0.0)),
        )


@dataclass(frozen=True)
class InternalSignal:
    """Represents an internal platform signal."""

    domain: str
    timestamp: datetime
    user_growth: float
    suspicious_activity: float
    platform_health: float

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> InternalSignal:
        return cls(
            domain=str(payload["domain"]),
            timestamp=_ensure_datetime(payload["timestamp"]),
            user_growth=float(payload.get("user_growth", 0.0)),
            suspicious_activity=float(payload.get("suspicious_activity", 0.0)),
            platform_health=float(payload.get("platform_health", 0.0)),
        )


@dataclass(frozen=True)
class WorldEventTrigger:
    """Represents an external world event that may influence manipulation campaigns."""

    domain: str
    timestamp: datetime
    severity: float
    relevance: float

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> WorldEventTrigger:
        return cls(
            domain=str(payload["domain"]),
            timestamp=_ensure_datetime(payload["timestamp"]),
            severity=float(payload.get("severity", 0.0)),
            relevance=float(payload.get("relevance", 0.0)),
        )


@dataclass
class FusedSnapshot:
    """Aggregated and normalized view of a domain's manipulation posture."""

    domain: str
    timestamp: datetime
    influence_score: float
    anomaly_score: float
    behavior_shift: float
    event_pressure: float
    sample_size: int
    confidence: float
    features: dict[str, float]

    def blend(self, other: FusedSnapshot, weight: float = 0.5) -> FusedSnapshot:
        """Blend two snapshots to provide smoothing for the analytics pipeline."""

        blended_features = {
            key: (1 - weight) * self.features.get(key, 0.0) + weight * other.features.get(key, 0.0)
            for key in set(self.features) | set(other.features)
        }
        return FusedSnapshot(
            domain=self.domain,
            timestamp=max(self.timestamp, other.timestamp),
            influence_score=(1 - weight) * self.influence_score + weight * other.influence_score,
            anomaly_score=(1 - weight) * self.anomaly_score + weight * other.anomaly_score,
            behavior_shift=(1 - weight) * self.behavior_shift + weight * other.behavior_shift,
            event_pressure=(1 - weight) * self.event_pressure + weight * other.event_pressure,
            sample_size=self.sample_size + other.sample_size,
            confidence=min(1.0, (self.confidence + other.confidence) / 2),
            features=blended_features,
        )


def _ensure_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value))
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(f"Unable to parse datetime from '{value}'") from exc
    raise TypeError(f"Unsupported timestamp type: {type(value)!r}")


def extract_domain(records: Iterable[object]) -> str | None:
    """Attempt to determine the shared domain from an iterable of records."""

    for record in records:
        if hasattr(record, "domain"):
            return record.domain
    return None
