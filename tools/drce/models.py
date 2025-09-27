"""Core data models for the Drift Root-Cause Explorer."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Iterable, Mapping, Tuple


class CandidateType(str, Enum):
    """Enumeration of candidate root-cause categories."""

    DATASET = "dataset"
    FEATURE = "feature"
    PIPELINE = "pipeline"
    POLICY = "policy"


@dataclass(frozen=True)
class CandidateEvidence:
    """Evidence describing a potential drift driver."""

    name: str
    type: CandidateType
    baseline_value: float
    current_value: float
    sample_size: int
    weight: float
    metadata: Mapping[str, float]

    def drift_magnitude(self) -> float:
        """Return the weighted magnitude of change for the candidate."""

        delta = abs(self.current_value - self.baseline_value)
        return self.weight * delta


@dataclass(frozen=True)
class AttributionResult:
    """Ranked attribution produced by the explorer."""

    name: str
    type: CandidateType
    score: float
    confidence_interval: Tuple[float, float]
    supporting_metrics: Mapping[str, float]


@dataclass(frozen=True)
class CounterfactualAction:
    """An action that can be applied to a candidate to replay a what-if."""

    description: str
    revert_to_baseline: bool = True


@dataclass(frozen=True)
class CounterfactualResult:
    """The outcome of replaying a counterfactual scenario."""

    candidate: str
    predicted_drift: float
    actual_drift: float
    predicted_reduction: float
    actual_reduction: float
    action_description: str

    def reduction_error(self) -> float:
        """Absolute error between predicted and actual drift reduction."""

        return abs(self.predicted_reduction - self.actual_reduction)


def normalise_scores(results: Iterable[AttributionResult]) -> Tuple[AttributionResult, ...]:
    """Normalise attribution scores so they sum to 1 while preserving ranking."""

    results = tuple(results)
    total = sum(r.score for r in results) or 1.0
    normalised = tuple(
        AttributionResult(
            name=r.name,
            type=r.type,
            score=r.score / total,
            confidence_interval=(
                max(0.0, r.confidence_interval[0] / total),
                min(1.0, r.confidence_interval[1] / total),
            ),
            supporting_metrics=r.supporting_metrics,
        )
        for r in results
    )
    return normalised


def aggregate_metadata(evidences: Iterable[CandidateEvidence]) -> Dict[str, float]:
    """Merge metadata for reporting purposes."""

    metrics: Dict[str, float] = {}
    for evidence in evidences:
        for key, value in evidence.metadata.items():
            metrics[f"{evidence.name}:{key}"] = value
    return metrics
