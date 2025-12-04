"""
Synchronization Module for Federated Learning

Handles synchronization between federated nodes including
air-gapped environments.
"""

from .sync_manager import SyncManager, SyncState
from .merkle_verification import MerkleTree, verify_merkle_proof

__all__ = [
    "SyncManager",
    "SyncState",
    "MerkleTree",
    "verify_merkle_proof",
]
