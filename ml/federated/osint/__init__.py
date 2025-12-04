"""
OSINT Module for Federated Learning

Provides OSINT-specific models and data handling for federated training.
"""

from .osint_model import OSINTClassifier, OSINTEmbedder
from .data_loader import OSINTDataLoader, OSINTDataset

__all__ = [
    "OSINTClassifier",
    "OSINTEmbedder",
    "OSINTDataLoader",
    "OSINTDataset",
]
