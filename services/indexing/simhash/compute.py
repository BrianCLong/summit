import hashlib
from typing import List
from ..merkle.models import MerkleTree, MerkleNode
class SimhashBuilder:
    def __init__(self, hash_bits: int = 64): self.hash_bits = hash_bits
    def compute(self, tree: MerkleTree) -> List[int]:
        v = [0] * self.hash_bits
        hashes = []
        self._collect(tree.root, hashes)
        for h in hashes:
            m = hashlib.md5(); m.update(h.encode('utf-8'))
            bh = int(m.hexdigest(), 16)
            for i in range(self.hash_bits):
                if (bh >> i) & 1: v[i] += 1
                else: v[i] -= 1
        return [1 if x > 0 else 0 for x in v]
    def _collect(self, node: MerkleNode, hashes: List[str]):
        if not node.is_dir: hashes.append(node.hash)
        else:
            for c in node.children.values(): self._collect(c, hashes)
    @staticmethod
    def hamming_distance(h1, h2): return sum(c1 != c2 for c1, c2 in zip(h1, h2))
