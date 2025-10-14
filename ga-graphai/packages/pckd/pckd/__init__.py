"""Policy-Constrained Knowledge Distillation (PCKD)."""

from .attestations import AttestedTrainingManifest, ProofOfExclusion
from .baselines import knowledge_distillation, dpo_alignment_stub
from .compliance import ComplianceVerifier
from .data import Example, Dataset, TaintScreenResult
from .distillation import (
    DistillationArtifacts,
    PCKDPipeline,
    TaintScreenReport,
    TeacherLogitsCache,
)
from .filters import PolicyFilter, MetadataPolicyFilter
from .models import LogisticModel, LogisticTeacher, LogisticStudent

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
