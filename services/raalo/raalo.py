from __future__ import annotations

import base64
import hashlib
import hmac
import json
import math
import random
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Mapping, MutableMapping, Optional, Protocol, Sequence, Set, Tuple


@dataclass(frozen=True)
class Sample:
    """A candidate example for labeling."""

    id: str
    prediction: float
    uncertainty: float
    features: Mapping[str, float]
    slice_memberships: Set[str]
    sensitivity: bool
    jurisdiction: str
    label: Optional[int] = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "slice_memberships", frozenset(self.slice_memberships))


@dataclass(frozen=True)
class FairnessSlice:
    """Represents a fairness slice defined in the DSR."""

    name: str
    description: str
    min_coverage: int


@dataclass
class SelectionConstraints:
    """Constraints applied during active learning selection."""

    total_selection_size: int
    slice_min_coverage: Dict[str, int]
    max_sensitive_fraction: float
    allowed_jurisdictions: Set[str]
    dp_epsilon_budget: float
    epsilon_per_sample: float
    slice_sensitivity_caps: Dict[str, float] = field(default_factory=dict)
    utility_target: Optional[float] = None

    def to_dict(self) -> Dict[str, object]:
        return {
            "total_selection_size": self.total_selection_size,
            "slice_min_coverage": dict(self.slice_min_coverage),
            "max_sensitive_fraction": self.max_sensitive_fraction,
            "allowed_jurisdictions": sorted(self.allowed_jurisdictions),
            "dp_epsilon_budget": self.dp_epsilon_budget,
            "epsilon_per_sample": self.epsilon_per_sample,
            "slice_sensitivity_caps": dict(self.slice_sensitivity_caps),
            "utility_target": self.utility_target,
        }


@dataclass(frozen=True)
class SelectionCertificate:
    """Certificate attesting to a deterministic constrained selection."""

    seed: int
    constraints: Dict[str, object]
    selected_sample_ids: List[str]
    epsilon_spent: float
    expected_utility_gain: float
    signature: str


@dataclass(frozen=True)
class SelectionResult:
    """Result of a RAALO selection."""

    samples: List[Sample]
    certificate: SelectionCertificate


class DSRClient(Protocol):
    """Interface for interacting with the Data Slice Registry."""

    def get_fairness_slices(self, slice_names: Sequence[str]) -> Dict[str, FairnessSlice]:
        ...


class HFAClient(Protocol):
    """Interface for HFA adjudication queue integration."""

    def queue_for_adjudication(self, samples: Sequence[Sample]) -> None:
        ...


class CertificateSigner:
    """Signs selection certificates for auditability."""

    def __init__(self, secret: str) -> None:
        self._secret = secret.encode("utf-8")

    def sign(self, payload: Mapping[str, object]) -> str:
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        digest = hmac.new(self._secret, serialized, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(digest).decode("ascii")


class RAALO:
    """Risk-aware active learning orchestrator respecting policy and fairness constraints."""

    def __init__(
        self,
        dsr_client: DSRClient,
        hfa_client: HFAClient,
        signer: CertificateSigner,
        uncertainty_weight: float = 0.7,
    ) -> None:
        if not 0 < uncertainty_weight <= 1:
            raise ValueError("uncertainty_weight must be in (0, 1]")
        self._dsr_client = dsr_client
        self._hfa_client = hfa_client
        self._signer = signer
        self._uncertainty_weight = uncertainty_weight

    def select_samples(
        self,
        dataset: Sequence[Sample],
        constraints: SelectionConstraints,
        seed: int,
    ) -> SelectionResult:
        if constraints.total_selection_size <= 0:
            raise ValueError("total_selection_size must be positive")
        if constraints.epsilon_per_sample <= 0:
            raise ValueError("epsilon_per_sample must be positive")

        fairness_slices = self._dsr_client.get_fairness_slices(list(constraints.slice_min_coverage.keys()))
        if set(fairness_slices.keys()) != set(constraints.slice_min_coverage.keys()):
            missing = set(constraints.slice_min_coverage.keys()) - set(fairness_slices.keys())
            raise ValueError(f"Missing fairness slices from DSR: {sorted(missing)}")

        allowed_samples = [
            sample
            for sample in dataset
            if sample.jurisdiction in constraints.allowed_jurisdictions
        ]
        if not allowed_samples:
            raise ValueError("No samples available within allowed jurisdictions")

        rng = random.Random(seed)
        selected: List[Sample] = []
        selected_ids: Set[str] = set()
        slice_counts: Dict[str, int] = defaultdict(int)
        slice_sensitive_counts: Dict[str, int] = defaultdict(int)
        sensitive_count = 0
        epsilon_spent = 0.0

        target_counts = self._compute_target_counts(allowed_samples, fairness_slices, constraints)

        def can_select(sample: Sample) -> bool:
            if sample.id in selected_ids:
                return False
            if epsilon_spent + constraints.epsilon_per_sample - constraints.dp_epsilon_budget > 1e-9:
                return False
            projected_total = len(selected) + 1
            projected_sensitive = sensitive_count + (1 if sample.sensitivity else 0)
            if projected_sensitive and projected_total:
                fraction = projected_sensitive / projected_total
                if fraction - constraints.max_sensitive_fraction > 1e-9:
                    return False
            for slice_name in sample.slice_memberships:
                if slice_name not in slice_counts:
                    continue
                cap = constraints.slice_sensitivity_caps.get(slice_name)
                if cap is not None and sample.sensitivity:
                    projected_slice_count = slice_counts[slice_name] + 1
                    projected_slice_sensitive = slice_sensitive_counts[slice_name] + 1
                    if projected_slice_sensitive / projected_slice_count - cap > 1e-9:
                        return False
            return True

        def add_sample(sample: Sample) -> None:
            nonlocal epsilon_spent, sensitive_count
            if epsilon_spent + constraints.epsilon_per_sample - constraints.dp_epsilon_budget > 1e-9:
                raise ValueError("DP budget exhausted")
            selected.append(sample)
            selected_ids.add(sample.id)
            epsilon_spent += constraints.epsilon_per_sample
            if sample.sensitivity:
                sensitive_count += 1
            for slice_name in sample.slice_memberships:
                if slice_name in fairness_slices:
                    slice_counts[slice_name] += 1
                    if sample.sensitivity:
                        slice_sensitive_counts[slice_name] += 1

        for slice_name, min_required in sorted(constraints.slice_min_coverage.items(), key=lambda item: (-item[1], item[0])):
            while slice_counts[slice_name] < min_required:
                candidates = [
                    sample
                    for sample in allowed_samples
                    if slice_name in sample.slice_memberships and sample.id not in selected_ids
                ]
                candidates = [sample for sample in candidates if can_select(sample)]
                if not candidates:
                    raise ValueError(f"Unable to satisfy minimum coverage for slice '{slice_name}'")
                candidates.sort(key=lambda sample: (-sample.uncertainty, sample.id))
                add_sample(candidates[0])

        while len(selected) < constraints.total_selection_size:
            remaining = [sample for sample in allowed_samples if sample.id not in selected_ids]
            candidates = [sample for sample in remaining if can_select(sample)]
            if not candidates:
                break
            coverage_scores = [self._coverage_gap(sample, slice_counts, target_counts) for sample in candidates]
            uncertainties = [sample.uncertainty for sample in candidates]
            min_unc, max_unc = min(uncertainties), max(uncertainties)
            min_cov, max_cov = (min(coverage_scores), max(coverage_scores)) if coverage_scores else (0.0, 0.0)

            best_candidate: Optional[Tuple[float, Sample]] = None
            for sample, coverage_score in zip(candidates, coverage_scores):
                unc_norm = self._normalize(sample.uncertainty, min_unc, max_unc)
                cov_norm = self._normalize(coverage_score, min_cov, max_cov)
                jitter = rng.random() * 1e-6
                score = self._uncertainty_weight * unc_norm + (1 - self._uncertainty_weight) * cov_norm + jitter
                if best_candidate is None or score > best_candidate[0]:
                    best_candidate = (score, sample)
            if best_candidate is None:
                break
            add_sample(best_candidate[1])

        if len(selected) < constraints.total_selection_size:
            raise ValueError("Unable to satisfy selection size under provided constraints")

        selected_ids_list = [sample.id for sample in selected]
        expected_utility_gain = self._compute_expected_gain(selected, allowed_samples)
        certificate_payload = {
            "seed": seed,
            "constraints": constraints.to_dict(),
            "selected_sample_ids": selected_ids_list,
            "epsilon_spent": round(epsilon_spent, 6),
            "expected_utility_gain": round(expected_utility_gain, 6),
        }
        signature = self._signer.sign(certificate_payload)
        certificate = SelectionCertificate(
            seed=seed,
            constraints=certificate_payload["constraints"],
            selected_sample_ids=selected_ids_list,
            epsilon_spent=certificate_payload["epsilon_spent"],
            expected_utility_gain=certificate_payload["expected_utility_gain"],
            signature=signature,
        )

        self._hfa_client.queue_for_adjudication(selected)

        if constraints.utility_target is not None and expected_utility_gain < constraints.utility_target:
            raise ValueError(
                f"Expected utility gain {expected_utility_gain:.4f} is below target {constraints.utility_target:.4f}"
            )

        return SelectionResult(samples=selected, certificate=certificate)

    @staticmethod
    def _compute_target_counts(
        dataset: Sequence[Sample],
        fairness_slices: Mapping[str, FairnessSlice],
        constraints: SelectionConstraints,
    ) -> Dict[str, int]:
        slice_totals: Dict[str, int] = defaultdict(int)
        for sample in dataset:
            for slice_name in sample.slice_memberships:
                if slice_name in fairness_slices:
                    slice_totals[slice_name] += 1
        total_samples = len(dataset)
        target_counts: Dict[str, int] = {}
        for slice_name, fairness_slice in fairness_slices.items():
            proportion = slice_totals.get(slice_name, 0) / total_samples if total_samples else 0
            proportional_target = math.ceil(proportion * constraints.total_selection_size)
            target_counts[slice_name] = max(constraints.slice_min_coverage.get(slice_name, 0), proportional_target)
        return target_counts

    @staticmethod
    def _coverage_gap(
        sample: Sample,
        slice_counts: MutableMapping[str, int],
        target_counts: Mapping[str, int],
    ) -> float:
        gap = 0.0
        for slice_name in sample.slice_memberships:
            if slice_name in target_counts:
                gap += max(0, target_counts[slice_name] - slice_counts[slice_name])
        return gap

    @staticmethod
    def _normalize(value: float, min_value: float, max_value: float) -> float:
        if max_value - min_value < 1e-12:
            return 0.0
        return (value - min_value) / (max_value - min_value)

    @staticmethod
    def _compute_expected_gain(selected: Sequence[Sample], dataset: Sequence[Sample]) -> float:
        total_uncertainty = sum(sample.uncertainty for sample in dataset)
        if total_uncertainty <= 0:
            return 0.0
        selected_uncertainty = sum(sample.uncertainty for sample in selected)
        return selected_uncertainty / total_uncertainty
