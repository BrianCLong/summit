"""
Federated Learning Core Module

Implements Flower-based federated learning for OSINT model training
across air-gapped Summit nodes without data centralization.
"""

from .flower_server import FederatedServer, ServerConfig
from .flower_client import FederatedClient, ClientConfig
from .strategies import (
    OSINTFedAvg,
    OSINTFedProx,
    PrivacyPreservingStrategy,
    AirgapStrategy,
)
from .model_registry import ModelRegistry, ModelVersion

__all__ = [
    "FederatedServer",
    "ServerConfig",
    "FederatedClient",
    "ClientConfig",
    "OSINTFedAvg",
    "OSINTFedProx",
    "PrivacyPreservingStrategy",
    "AirgapStrategy",
    "ModelRegistry",
    "ModelVersion",
]

__version__ = "1.0.0"
