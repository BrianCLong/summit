"""
OSINT Module for Federated Learning

Provides OSINT-specific models and data handling for federated training.
"""

from .data_loader import OSINTDataLoader, OSINTDataset
from .osint_model import OSINTClassifier, OSINTEmbedder

__all__ = [
    "OSINTClassifier",
    "OSINTDataLoader",
    "OSINTDataset",
    "OSINTEmbedder",
]
