"""End-to-end policy-constrained distillation pipeline."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass

import numpy as np

from .attestations import AttestedTrainingManifest, ProofOfExclusion, build_manifest
from .baselines import knowledge_distillation
from .data import Dataset, Example, compute_rejection_digest
from .filters import PolicyFilter, taint_screen
from .models import LogisticStudent, LogisticTeacher


@dataclass
class TaintScreenReport:
    """Human-readable report summarising the taint screen."""

    allowed_ids: list[str]
    rejected: dict[str, str]
    policy_metadata: list[dict[str, str]]

    def to_dict(self) -> dict[str, object]:
        return {
            "allowed_ids": list(self.allowed_ids),
            "rejected": dict(self.rejected),
            "policy_metadata": list(self.policy_metadata),
        }


@dataclass
class TeacherLogitsCache:
    """Cache of teacher logits along with exclusion proofs."""

    logits: dict[str, float]
    temperature: float
    proof: ProofOfExclusion

    def to_dict(self) -> dict[str, object]:
        return {
            "logits": dict(self.logits),
            "temperature": float(self.temperature),
            "proof": self.proof.to_dict(),
        }


@dataclass
class DistillationArtifacts:
    """All outputs from a pipeline run."""

    taint_report: TaintScreenReport
    logits_cache: TeacherLogitsCache
    student_model: LogisticStudent
    manifest: AttestedTrainingManifest
    training_summary: dict[str, float]
    accuracy_drop: float
    teacher_accuracy: float
    student_accuracy: float


class PCKDPipeline:
    """Run a policy-constrained distillation workflow."""

    def __init__(
        self,
        policy_filters: Iterable[PolicyFilter],
        trainer: Callable[..., dict[str, float]] = knowledge_distillation,
        trainer_kwargs: dict[str, float] | None = None,
        documented_accuracy_bound: float = 0.05,
    ) -> None:
        self.policy_filters = list(policy_filters)
        self.trainer = trainer
        self.trainer_kwargs = trainer_kwargs or {}
        self.documented_accuracy_bound = documented_accuracy_bound

    def run(
        self,
        dataset: Dataset,
        teacher: LogisticTeacher,
        student: LogisticStudent,
    ) -> DistillationArtifacts:
        screen_result = self._screen_dataset(dataset)
        if not screen_result.allowed:
            raise ValueError("No examples remain after taint screening.")

        features = dataset.feature_matrix(screen_result.allowed)
        labels = dataset.labels(screen_result.allowed)

        training_summary = self.trainer(
            student=student,
            teacher=teacher,
            features=features,
            labels=labels,
            **self.trainer_kwargs,
        )

        teacher_logits = teacher.predict_logits(features)
        teacher_accuracy = _accuracy(teacher.predict(features), labels)
        student_accuracy = _accuracy(student.predict(features), labels)
        accuracy_drop = max(teacher_accuracy - student_accuracy, 0.0)

        proof = ProofOfExclusion(
            rejection_digest=screen_result.rejection_digest,
            excluded_ids=screen_result.rejected_ids(),
        )

        logits_cache = TeacherLogitsCache(
            logits={
                ex.example_id: float(logit)
                for ex, logit in zip(screen_result.allowed, teacher_logits, strict=False)
            },
            temperature=float(
                self.trainer_kwargs.get("temperature", training_summary.get("temperature", 1.0))
            ),
            proof=proof,
        )

        manifest = build_manifest(
            dataset=dataset,
            allowed_examples=screen_result.allowed,
            rejected_reasons=screen_result.rejection_reasons,
            policy_filters=self.policy_filters,
            teacher_params=teacher.parameter_dict(),
            student_params=student.parameter_dict(),
            trainer=self.trainer.__name__,
            hyperparameters={k: v for k, v in training_summary.items() if k != "loss"},
            max_accuracy_drop=self.documented_accuracy_bound,
        )

        report = TaintScreenReport(
            allowed_ids=screen_result.allowed_ids(),
            rejected=screen_result.rejection_reasons,
            policy_metadata=[policy.describe() for policy in self.policy_filters],
        )

        if accuracy_drop > self.documented_accuracy_bound:
            raise ValueError(
                "Observed accuracy drop exceeds documented bound: "
                f"{accuracy_drop:.4f} > {self.documented_accuracy_bound:.4f}"
            )

        return DistillationArtifacts(
            taint_report=report,
            logits_cache=logits_cache,
            student_model=student,
            manifest=manifest,
            training_summary=training_summary,
            accuracy_drop=accuracy_drop,
            teacher_accuracy=teacher_accuracy,
            student_accuracy=student_accuracy,
        )

    def _screen_dataset(self, dataset: Dataset) -> _ScreenResultWithDigest:
        result = taint_screen(dataset, self.policy_filters)
        rejection_digest = compute_rejection_digest(result.rejection_reasons)
        return _ScreenResultWithDigest(
            allowed=result.allowed,
            rejected=result.rejected,
            rejection_reasons=result.rejection_reasons,
            rejection_digest=rejection_digest,
        )


def _accuracy(predictions: np.ndarray, labels: np.ndarray) -> float:
    labels_binary = labels.astype(np.int32)
    return float(np.mean(predictions == labels_binary))


@dataclass
class _ScreenResultWithDigest:
    allowed: list[Example]
    rejected: list[Example]
    rejection_reasons: dict[str, str]
    rejection_digest: str

    def allowed_ids(self) -> list[str]:
        return [example.example_id for example in self.allowed]

    def rejected_ids(self) -> list[str]:
        return [example.example_id for example in self.rejected]
