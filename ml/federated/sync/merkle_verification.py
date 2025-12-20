"""
Merkle Tree Verification for Federated Learning

Provides integrity verification for model updates using Merkle trees.
"""

import hashlib
from typing import Any, List, Optional, Tuple


class MerkleTree:
    """Merkle tree for data integrity verification"""

    def __init__(self, data_blocks: List[Any]):
        self.data_blocks = data_blocks
        self.leaves = [self._hash(block) for block in data_blocks]
        self.root = self._build_tree(self.leaves)

    def _hash(self, data: Any) -> str:
        """Hash data block"""
        if isinstance(data, str):
            data = data.encode()
        elif not isinstance(data, bytes):
            import pickle
            data = pickle.dumps(data)
        return hashlib.sha256(data).hexdigest()

    def _build_tree(self, nodes: List[str]) -> str:
        """Build Merkle tree and return root"""
        if not nodes:
            return ""
        if len(nodes) == 1:
            return nodes[0]

        new_level = []
        for i in range(0, len(nodes), 2):
            left = nodes[i]
            right = nodes[i + 1] if i + 1 < len(nodes) else left
            combined = hashlib.sha256((left + right).encode()).hexdigest()
            new_level.append(combined)

        return self._build_tree(new_level)

    def get_proof(self, index: int) -> List[Tuple[str, str]]:
        """Get Merkle proof for data at index"""
        if index >= len(self.leaves):
            return []

        proof = []
        nodes = self.leaves.copy()
        idx = index

        while len(nodes) > 1:
            new_level = []
            for i in range(0, len(nodes), 2):
                left = nodes[i]
                right = nodes[i + 1] if i + 1 < len(nodes) else left

                if i == idx or i + 1 == idx:
                    if i == idx:
                        proof.append((right, "right"))
                    else:
                        proof.append((left, "left"))

                combined = hashlib.sha256((left + right).encode()).hexdigest()
                new_level.append(combined)

            idx = idx // 2
            nodes = new_level

        return proof

    def get_root(self) -> str:
        """Get Merkle root"""
        return self.root


def verify_merkle_proof(
    data: Any,
    proof: List[Tuple[str, str]],
    root: str,
) -> bool:
    """Verify a Merkle proof"""
    if isinstance(data, str):
        current = hashlib.sha256(data.encode()).hexdigest()
    elif isinstance(data, bytes):
        current = hashlib.sha256(data).hexdigest()
    else:
        import pickle
        current = hashlib.sha256(pickle.dumps(data)).hexdigest()

    for sibling, position in proof:
        if position == "left":
            combined = sibling + current
        else:
            combined = current + sibling
        current = hashlib.sha256(combined.encode()).hexdigest()

    return current == root
