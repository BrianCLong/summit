"""
Synchronization Module for Federated Learning

Handles synchronization between federated nodes including
air-gapped environments.
"""

from .merkle_verification import MerkleTree, verify_merkle_proof
from .sync_manager import SyncManager, SyncState

__all__ = [
    "MerkleTree",
    "SyncManager",
    "SyncState",
    "verify_merkle_proof",
]
