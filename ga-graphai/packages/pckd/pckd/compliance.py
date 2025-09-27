"""Compliance verification utilities for PCKD outputs."""

from __future__ import annotations

from typing import Dict, List

from .attestations import AttestedTrainingManifest
from .data import Dataset, Example, compute_rejection_digest
from .distillation import TaintScreenReport, TeacherLogitsCache


class ComplianceVerifier:
    """Deterministically verify manifests, reports, and caches."""

    def verify(
        self,
        dataset: Dataset,
        manifest: AttestedTrainingManifest,
        report: TaintScreenReport,
        logits_cache: TeacherLogitsCache,
        accuracy_drop: float,
    ) -> Dict[str, bool]:
        lookup = {example.example_id: example for example in dataset}
        allowed_examples: List[Example] = [lookup[example_id] for example_id in report.allowed_ids]
        dataset_digest_matches = manifest.dataset_digest == dataset.digest()
        allowed_digest_matches = manifest.allowed_digest == dataset.digest(allowed_examples)
        rejection_digest_matches = manifest.rejection_digest == compute_rejection_digest(report.rejected)
        proof_matches = (
            logits_cache.proof.rejection_digest == manifest.rejection_digest
            and sorted(logits_cache.proof.excluded_ids) == sorted(report.rejected.keys())
        )
        logits_scope_valid = sorted(logits_cache.logits.keys()) == sorted(report.allowed_ids)
        accuracy_within_bounds = accuracy_drop <= manifest.max_accuracy_drop
        return {
            "dataset_digest": dataset_digest_matches,
            "allowed_digest": allowed_digest_matches,
            "rejection_digest": rejection_digest_matches,
            "exclusion_proof": proof_matches,
            "logits_scope": logits_scope_valid,
            "accuracy_bound": accuracy_within_bounds,
        }
