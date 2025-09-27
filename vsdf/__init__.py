"""Verifiable Synthetic Data Forge (VSDF).

This package provides utilities for learning tabular schemas, compiling
constraints, sampling synthetic datasets under those constraints, and verifying
synthetic data fidelity and privacy risk.
"""

from .schema import TabularSchema, SchemaLearner
from .constraints import (
    ConstraintSet,
    ConstraintSpecification,
    ConstraintCompiler,
    MarginalConstraint,
    CorrelationConstraint,
    DenialConstraint,
)
from .sampler import ConstraintDrivenSampler
from .verifier import ConstraintVerifier, VerificationReport

__all__ = [
    "TabularSchema",
    "SchemaLearner",
    "ConstraintSet",
    "ConstraintSpecification",
    "ConstraintCompiler",
    "MarginalConstraint",
    "CorrelationConstraint",
    "DenialConstraint",
    "ConstraintDrivenSampler",
    "ConstraintVerifier",
    "VerificationReport",
]
