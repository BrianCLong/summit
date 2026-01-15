"""
Federated Learning Core Module

Implements Flower-based federated learning for OSINT model training
across air-gapped Summit nodes without data centralization.
"""

from .flower_client import ClientConfig, FederatedClient
from .flower_server import FederatedServer, ServerConfig
from .model_registry import ModelRegistry, ModelVersion
from .strategies import (
    AirgapStrategy,
    OSINTFedAvg,
    OSINTFedProx,
    PrivacyPreservingStrategy,
)

__all__ = [
    "AirgapStrategy",
    "ClientConfig",
    "FederatedClient",
    "FederatedServer",
    "ModelRegistry",
    "ModelVersion",
    "OSINTFedAvg",
    "OSINTFedProx",
    "PrivacyPreservingStrategy",
    "ServerConfig",
]

__version__ = "1.0.0"
