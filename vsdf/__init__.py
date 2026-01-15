"""Verifiable Synthetic Data Forge (VSDF).

This package provides utilities for learning tabular schemas, compiling
constraints, sampling synthetic datasets under those constraints, and verifying
synthetic data fidelity and privacy risk.
"""

from .constraints import (
    ConstraintCompiler,
    ConstraintSet,
    ConstraintSpecification,
    CorrelationConstraint,
    DenialConstraint,
    MarginalConstraint,
)
from .sampler import ConstraintDrivenSampler
from .schema import SchemaLearner, TabularSchema
from .verifier import ConstraintVerifier, VerificationReport

__all__ = [
    "ConstraintCompiler",
    "ConstraintDrivenSampler",
    "ConstraintSet",
    "ConstraintSpecification",
    "ConstraintVerifier",
    "CorrelationConstraint",
    "DenialConstraint",
    "MarginalConstraint",
    "SchemaLearner",
    "TabularSchema",
    "VerificationReport",
]
