"""
Privacy Module for Federated Learning

Implements differential privacy mechanisms with pgvector integration
for privacy-preserving embedding storage and retrieval.
"""

from .pgvector_dp import (
    EmbeddingWithPrivacy,
    PgVectorDifferentialPrivacy,
    PrivacyConfig,
)
from .privacy_accountant import (
    CompositionTheorem,
    RenyiDPAccountant,
)
from .secure_aggregation import (
    SecretShare,
    SecureAggregator,
)

__all__ = [
    "CompositionTheorem",
    "EmbeddingWithPrivacy",
    "PgVectorDifferentialPrivacy",
    "PrivacyConfig",
    "RenyiDPAccountant",
    "SecretShare",
    "SecureAggregator",
]
