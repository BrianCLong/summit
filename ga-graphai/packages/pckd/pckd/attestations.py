"""Attestation and manifest helpers for PCKD runs."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from .data import Dataset, Example, compute_rejection_digest
from .filters import PolicyFilter


@dataclass
class ProofOfExclusion:
    """Proof that disallowed examples were excluded."""

    rejection_digest: str
    excluded_ids: list[str]

    def to_dict(self) -> dict[str, object]:
        return {
            "rejection_digest": self.rejection_digest,
            "excluded_ids": list(self.excluded_ids),
        }


@dataclass
class AttestedTrainingManifest:
    """Structured manifest for student training runs."""

    dataset_digest: str
    allowed_digest: str
    rejection_digest: str
    policy_metadata: list[dict[str, str]]
    teacher_digest: str
    student_digest: str
    trainer: str
    hyperparameters: dict[str, float]
    max_accuracy_drop: float

    def to_dict(self) -> dict[str, object]:
        return {
            "dataset_digest": self.dataset_digest,
            "allowed_digest": self.allowed_digest,
            "rejection_digest": self.rejection_digest,
            "policy_metadata": list(self.policy_metadata),
            "teacher_digest": self.teacher_digest,
            "student_digest": self.student_digest,
            "trainer": self.trainer,
            "hyperparameters": dict(self.hyperparameters),
            "max_accuracy_drop": float(self.max_accuracy_drop),
        }


def digest_model_parameters(weights: list[float], bias: float) -> str:
    raw = json.dumps(
        {"weights": weights, "bias": bias}, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def build_manifest(
    dataset: Dataset,
    allowed_examples: list[Example],
    rejected_reasons: dict[str, str],
    policy_filters: list[PolicyFilter],
    teacher_params: dict[str, list[float] | float],
    student_params: dict[str, list[float] | float],
    trainer: str,
    hyperparameters: dict[str, float],
    max_accuracy_drop: float,
) -> AttestedTrainingManifest:
    policy_metadata = [policy.describe() for policy in policy_filters]
    rejection_digest = compute_rejection_digest(rejected_reasons)
    teacher_digest = digest_model_parameters(
        weights=list(map(float, teacher_params["weights"])),
        bias=float(teacher_params["bias"]),
    )
    student_digest = digest_model_parameters(
        weights=list(map(float, student_params["weights"])),
        bias=float(student_params["bias"]),
    )
    return AttestedTrainingManifest(
        dataset_digest=dataset.digest(),
        allowed_digest=dataset.digest(allowed_examples),
        rejection_digest=rejection_digest,
        policy_metadata=policy_metadata,
        teacher_digest=teacher_digest,
        student_digest=student_digest,
        trainer=trainer,
        hyperparameters=hyperparameters,
        max_accuracy_drop=max_accuracy_drop,
    )
