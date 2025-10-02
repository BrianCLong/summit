"""End-to-end tests for the PCKD pipeline."""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


from pckd import (
    ComplianceVerifier,
    Dataset,
    Example,
    LogisticStudent,
    LogisticTeacher,
    MetadataPolicyFilter,
    PCKDPipeline,
    dpo_alignment_stub,
)


def build_fixture_dataset() -> Dataset:
    examples = [
        Example("ex-clean-00", (0.0, 0.0), 0, {"source": "clean"}),
        Example("ex-clean-01", (0.0, 1.0), 1, {"source": "clean"}),
        Example("ex-clean-10", (1.0, 0.0), 1, {"source": "clean"}),
        Example("ex-clean-11", (1.0, 1.0), 1, {"source": "clean"}),
        Example("ex-tainted", (0.2, 0.2), 0, {"source": "restricted"}),
        Example("ex-clean-08", (0.8, 0.8), 1, {"source": "clean"}),
    ]
    return Dataset(examples)


def test_pipeline_generates_attested_artifacts():
    dataset = build_fixture_dataset()
    teacher = LogisticTeacher.from_weights((4.0, 4.0), bias=-3.0)
    student = LogisticStudent.initialize(n_features=2, seed=42)
    policy = MetadataPolicyFilter("restricted-sources", key="source", disallowed_values={"restricted"})
    pipeline = PCKDPipeline(
        policy_filters=[policy],
        trainer_kwargs={"temperature": 1.2, "alpha": 0.6, "learning_rate": 0.25, "epochs": 220},
        documented_accuracy_bound=0.05,
    )

    artifacts = pipeline.run(dataset=dataset, teacher=teacher, student=student)

    assert "ex-tainted" not in artifacts.taint_report.allowed_ids
    assert artifacts.taint_report.rejected == {"ex-tainted": "restricted-sources"}

    assert set(artifacts.logits_cache.logits.keys()) == set(artifacts.taint_report.allowed_ids)
    assert artifacts.logits_cache.proof.rejection_digest == artifacts.manifest.rejection_digest

    teacher_allowed = artifacts.teacher_accuracy
    student_allowed = artifacts.student_accuracy
    assert teacher_allowed >= 0.9
    assert student_allowed >= 0.85
    assert artifacts.accuracy_drop <= artifacts.manifest.max_accuracy_drop

    verifier = ComplianceVerifier()
    checks = verifier.verify(
        dataset=dataset,
        manifest=artifacts.manifest,
        report=artifacts.taint_report,
        logits_cache=artifacts.logits_cache,
        accuracy_drop=artifacts.accuracy_drop,
    )
    assert all(checks.values())

    student_copy = LogisticStudent(weights=student.weights.copy(), bias=float(student.bias))
    mode, margin = dpo_alignment_stub(student_copy, reference_margin=0.05)
    assert mode == "dpo-stub"
    assert math.isclose(margin, 0.05, rel_tol=1e-9)

    baseline_summary = artifacts.training_summary
    assert "loss" in baseline_summary and baseline_summary["loss"] >= 0.0
