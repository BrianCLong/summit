"""
Privacy Module for Federated Learning

Implements differential privacy mechanisms with pgvector integration
for privacy-preserving embedding storage and retrieval.
"""

from .pgvector_dp import (
    PgVectorDifferentialPrivacy,
    PrivacyConfig,
    EmbeddingWithPrivacy,
)
from .secure_aggregation import (
    SecureAggregator,
    SecretShare,
)
from .privacy_accountant import (
    RenyiDPAccountant,
    CompositionTheorem,
)

__all__ = [
    "PgVectorDifferentialPrivacy",
    "PrivacyConfig",
    "EmbeddingWithPrivacy",
    "SecureAggregator",
    "SecretShare",
    "RenyiDPAccountant",
    "CompositionTheorem",
]
