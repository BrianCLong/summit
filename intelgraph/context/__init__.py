"""Context governance scaffolding (CPG, IC³, TWCA, CCR).

This module provides lightweight, dependency-free primitives to model
context provenance, invariant capsules, trust-weighted assembly, and
counterfactual reassembly for poisoning detection.
"""

from .types import (
    AssembledContext,
    ContextSegment,
    ContextSegmentId,
    ContextValidationResult,
    Invariant,
    InvariantViolation,
    ModelExecutionRequest,
    ModelExecutionResponse,
    TrustWeight,
)
from .provenance import ContextProvenanceGraph, ProvenanceEdge, ProvenanceNode
from .capsules import InvariantCapsule
from .trust import TrustWeightedAssemblyReport, TrustWeightedContextAssembler
from .counterfactual import (
    CCRConfig,
    CounterfactualContextReassembler,
    CounterfactualVariant,
    CounterfactualMutationType,
)
from .analysis import DivergenceAnalyzer, DivergenceScore, PoisoningIndicator
from .poisoning import PoisoningResponder, PoisoningResponse, PoisoningSuppressionResult

__all__ = [
    "AssembledContext",
    "ContextSegment",
    "ContextSegmentId",
    "ContextValidationResult",
    "Invariant",
    "InvariantViolation",
    "ModelExecutionRequest",
    "ModelExecutionResponse",
    "TrustWeight",
    "ContextProvenanceGraph",
    "ProvenanceEdge",
    "ProvenanceNode",
    "InvariantCapsule",
    "TrustWeightedContextAssembler",
    "TrustWeightedAssemblyReport",
    "CounterfactualContextReassembler",
    "CounterfactualVariant",
    "CounterfactualMutationType",
    "CCRConfig",
    "DivergenceAnalyzer",
    "DivergenceScore",
    "PoisoningIndicator",
    "PoisoningResponder",
    "PoisoningResponse",
    "PoisoningSuppressionResult",
]
