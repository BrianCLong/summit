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
    "ComplianceVerifier",
    "Dataset",
    "DistillationArtifacts",
    "Example",
    "LogisticModel",
    "LogisticStudent",
    "LogisticTeacher",
    "MetadataPolicyFilter",
    "PCKDPipeline",
    "PolicyFilter",
    "ProofOfExclusion",
    "TaintScreenReport",
    "TaintScreenResult",
    "TeacherLogitsCache",
    "dpo_alignment_stub",
    "knowledge_distillation",
]
