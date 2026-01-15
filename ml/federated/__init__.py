"""
Federated Learning for OSINT Model Training

This module implements federated learning across air-gapped Summit nodes
for OSINT model training without data centralization.

Features:
- Flower-based federated learning framework
- pgvector differential privacy integration
- Neo4j aggregation for graph-based results
- Air-gap synchronization support
- Privacy-preserving model aggregation

Usage:
    from ml.federated import (
        FederatedServer,
        FederatedClient,
        ServerConfig,
        ClientConfig,
    )

    # Configure server
    config = ServerConfig(
        num_rounds=10,
        min_fit_clients=3,
        enable_differential_privacy=True,
        airgap_mode=True,
    )

    # Start federated training
    server = FederatedServer(config)
    history = server.start_server()

Performance Targets:
- 85% validation accuracy
- Privacy budget: epsilon=1.0, delta=1e-5

Tradeoffs:
- +Privacy: Differential privacy protects individual node data
- -Training time: Air-gap mode increases synchronization overhead
- +Security: No data centralization required
"""

__version__ = "1.0.0"

# Core components
# Agent components
from .agents import (
    AgentConfig,
    AirgapSyncAgent,
    CoordinatorConfig,
    FederatedCoordinatorAgent,
    OSINTTrainerAgent,
    SyncConfig,
    TrainingTask,
)

# Aggregation components
from .aggregation import (
    AggregationConfig,
    FederatedGraphResult,
    GraphMerger,
    MergeStrategy,
    Neo4jAggregator,
)
from .core import (
    AirgapStrategy,
    ClientConfig,
    FederatedClient,
    FederatedServer,
    ModelRegistry,
    ModelVersion,
    OSINTFedAvg,
    OSINTFedProx,
    PrivacyPreservingStrategy,
    ServerConfig,
)

# OSINT components
from .osint import (
    OSINTClassifier,
    OSINTDataLoader,
    OSINTDataset,
    OSINTEmbedder,
)

# Privacy components
from .privacy import (
    EmbeddingWithPrivacy,
    PgVectorDifferentialPrivacy,
    PrivacyConfig,
    RenyiDPAccountant,
    SecureAggregator,
)

# Sync components
from .sync import (
    MerkleTree,
    SyncManager,
    SyncState,
    verify_merkle_proof,
)

__all__ = [
    # Version
    "__version__",
    # Core
    "FederatedServer",
    "FederatedClient",
    "ServerConfig",
    "ClientConfig",
    "OSINTFedAvg",
    "OSINTFedProx",
    "PrivacyPreservingStrategy",
    "AirgapStrategy",
    "ModelRegistry",
    "ModelVersion",
    # Privacy
    "PgVectorDifferentialPrivacy",
    "PrivacyConfig",
    "EmbeddingWithPrivacy",
    "SecureAggregator",
    "RenyiDPAccountant",
    # Aggregation
    "Neo4jAggregator",
    "AggregationConfig",
    "FederatedGraphResult",
    "GraphMerger",
    "MergeStrategy",
    # Agents
    "OSINTTrainerAgent",
    "AgentConfig",
    "TrainingTask",
    "FederatedCoordinatorAgent",
    "CoordinatorConfig",
    "AirgapSyncAgent",
    "SyncConfig",
    # Sync
    "SyncManager",
    "SyncState",
    "MerkleTree",
    "verify_merkle_proof",
    # OSINT
    "OSINTClassifier",
    "OSINTEmbedder",
    "OSINTDataLoader",
    "OSINTDataset",
]
