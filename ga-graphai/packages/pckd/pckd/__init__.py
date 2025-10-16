"""Policy-Constrained Knowledge Distillation (PCKD)."""

from .attestations import AttestedTrainingManifest, ProofOfExclusion
from .baselines import dpo_alignment_stub, knowledge_distillation
from .compliance import ComplianceVerifier
from .data import Dataset, Example, TaintScreenResult
from .distillation import (
    DistillationArtifacts,
    PCKDPipeline,
    TaintScreenReport,
    TeacherLogitsCache,
)
from .filters import MetadataPolicyFilter, PolicyFilter
from .models import LogisticModel, LogisticStudent, LogisticTeacher

__all__ = [
    "AttestedTrainingManifest",
    "ProofOfExclusion",
    "knowledge_distillation",
    "dpo_alignment_stub",
    "ComplianceVerifier",
    "Example",
    "Dataset",
    "TaintScreenResult",
    "DistillationArtifacts",
    "PCKDPipeline",
    "TaintScreenReport",
    "TeacherLogitsCache",
    "PolicyFilter",
    "MetadataPolicyFilter",
    "LogisticModel",
    "LogisticTeacher",
    "LogisticStudent",
]
