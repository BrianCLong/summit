"""Scenario representation for drift attribution exercises."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence

from .models import CandidateEvidence, CandidateType, CounterfactualAction, CounterfactualResult


@dataclass
class DriftScenario:
    """Container describing a drift snapshot with candidate evidences."""

    evidences: Sequence[CandidateEvidence]
    total_drift_metric: float

    def __post_init__(self) -> None:
        self._evidence_by_name: Dict[str, CandidateEvidence] = {
            evidence.name: evidence for evidence in self.evidences
        }

    def candidates(self) -> Sequence[CandidateEvidence]:
        return self.evidences

    def evidence_for(self, name: str) -> CandidateEvidence:
        return self._evidence_by_name[name]

    def apply_counterfactual(
        self, candidate_name: str, action: CounterfactualAction
    ) -> CounterfactualResult:
        """Replay the scenario under a counterfactual action."""

        evidence = self.evidence_for(candidate_name)
        if not action.revert_to_baseline:
            raise ValueError("Only baseline reversion actions are supported in the simulator.")

        candidate_drift = evidence.drift_magnitude()
        predicted_total = max(self.total_drift_metric - candidate_drift, 0.0)

        actual_total = self._recalculate_total_without(candidate_name)
        actual_reduction = self.total_drift_metric - actual_total
        return CounterfactualResult(
            candidate=candidate_name,
            predicted_drift=predicted_total,
            actual_drift=actual_total,
            predicted_reduction=candidate_drift,
            actual_reduction=actual_reduction,
            action_description=action.description,
        )

    def _recalculate_total_without(self, candidate_name: str) -> float:
        return sum(
            evidence.drift_magnitude()
            for evidence in self.evidences
            if evidence.name != candidate_name
        )

    @classmethod
    def from_raw(
        cls,
        datasets: Iterable[Dict[str, float]],
        features: Iterable[Dict[str, float]],
        pipelines: Iterable[Dict[str, float]],
        policies: Iterable[Dict[str, float]],
    ) -> "DriftScenario":
        evidences: List[CandidateEvidence] = []
        for entry in datasets:
            evidences.append(
                CandidateEvidence(
                    name=entry["name"],
                    type=CandidateType.DATASET,
                    baseline_value=entry["baseline"],
                    current_value=entry["current"],
                    sample_size=int(entry.get("samples", 1)),
                    weight=entry.get("weight", 1.0),
                    metadata={k: v for k, v in entry.items() if k not in {"name", "baseline", "current", "samples", "weight"}},
                )
            )
        for entry in features:
            evidences.append(
                CandidateEvidence(
                    name=entry["name"],
                    type=CandidateType.FEATURE,
                    baseline_value=entry["baseline"],
                    current_value=entry["current"],
                    sample_size=int(entry.get("samples", 1)),
                    weight=entry.get("weight", 1.0),
                    metadata={k: v for k, v in entry.items() if k not in {"name", "baseline", "current", "samples", "weight"}},
                )
            )
        for entry in pipelines:
            evidences.append(
                CandidateEvidence(
                    name=entry["name"],
                    type=CandidateType.PIPELINE,
                    baseline_value=entry["baseline"],
                    current_value=entry["current"],
                    sample_size=int(entry.get("samples", 1)),
                    weight=entry.get("weight", 1.0),
                    metadata={k: v for k, v in entry.items() if k not in {"name", "baseline", "current", "samples", "weight"}},
                )
            )
        for entry in policies:
            evidences.append(
                CandidateEvidence(
                    name=entry["name"],
                    type=CandidateType.POLICY,
                    baseline_value=entry["baseline"],
                    current_value=entry["current"],
                    sample_size=int(entry.get("samples", 1)),
                    weight=entry.get("weight", 1.0),
                    metadata={k: v for k, v in entry.items() if k not in {"name", "baseline", "current", "samples", "weight"}},
                )
            )

        total_drift = sum(evidence.drift_magnitude() for evidence in evidences)
        return cls(evidences=evidences, total_drift_metric=total_drift)
