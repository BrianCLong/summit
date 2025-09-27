"""Utility helpers for Merkle trie based inclusion and exclusion proofs."""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Iterable, List, Optional, Sequence


def _hash(data: bytes) -> bytes:
    return sha256(data).digest()


@dataclass
class MerkleProofStep:
    position: str
    sibling: str


class MerkleTrie:
    """A compact Merkle tree built from ordered selector strings."""

    def __init__(self, selectors: Iterable[str]):
        values = sorted({s.strip() for s in selectors if s is not None})
        self.values: List[str] = values
        self.leaves: List[bytes] = [_hash(s.encode("utf-8")) for s in values]
        if not self.leaves:
            self.levels: List[List[bytes]] = [[_hash(b"")]]
        else:
            self.levels = [self.leaves]
            while len(self.levels[-1]) > 1:
                level = self.levels[-1]
                next_level: List[bytes] = []
                for i in range(0, len(level), 2):
                    left = level[i]
                    right = level[i + 1] if i + 1 < len(level) else level[i]
                    next_level.append(_hash(left + right))
                self.levels.append(next_level)

    @property
    def root(self) -> str:
        return self.levels[-1][0].hex()

    def as_dict(self) -> dict:
        return {"root": self.root, "size": len(self.values)}

    def membership_proof(self, selector: str) -> Optional[List[MerkleProofStep]]:
        try:
            index = self.values.index(selector)
        except ValueError:
            return None
        return self._proof_for_index(index)

    def _proof_for_index(self, index: int) -> List[MerkleProofStep]:
        proof: List[MerkleProofStep] = []
        for level in self.levels[:-1]:
            sibling_index = index ^ 1
            if sibling_index >= len(level):
                sibling_index = index
            sibling = level[sibling_index]
            position = "right" if sibling_index < index else "left"
            proof.append(MerkleProofStep(position=position, sibling=sibling.hex()))
            index //= 2
        return proof

    def non_membership_proof(self, selector: str) -> dict:
        if selector in self.values:
            raise ValueError(f"Selector '{selector}' exists; cannot produce negative proof")
        import bisect

        index = bisect.bisect_left(self.values, selector)
        left_info = self._neighbor_proof(index - 1) if index - 1 >= 0 else None
        right_info = self._neighbor_proof(index) if index < len(self.values) else None
        return {
            "selector": selector,
            "leaf_hash": _hash(selector.encode("utf-8")).hex(),
            "left_neighbor": left_info,
            "right_neighbor": right_info,
            "root": self.root,
        }

    def _neighbor_proof(self, index: int) -> Optional[dict]:
        if index < 0 or index >= len(self.values):
            return None
        selector = self.values[index]
        leaf_hash = self.leaves[index].hex()
        proof_steps = [step.__dict__ for step in self._proof_for_index(index)]
        return {
            "selector": selector,
            "leaf_hash": leaf_hash,
            "proof": proof_steps,
        }


def compute_root_from_proof(leaf_hash: str, proof: Sequence[dict]) -> str:
    current = bytes.fromhex(leaf_hash)
    for step in proof:
        sibling = bytes.fromhex(step["sibling"])
        if step["position"] == "left":
            current = _hash(sibling + current)
        else:
            current = _hash(current + sibling)
    return current.hex()


def verify_non_membership(selector: str, proof: dict, expected_root: str) -> bool:
    target_hash = _hash(selector.encode("utf-8")).hex()
    if target_hash != proof.get("leaf_hash"):
        return False
    for key in ("left_neighbor", "right_neighbor"):
        neighbor = proof.get(key)
        if neighbor is None:
            continue
        recalculated = compute_root_from_proof(neighbor["leaf_hash"], neighbor["proof"])
        if recalculated != expected_root:
            return False
        neighbor_selector = neighbor["selector"]
        if key == "left_neighbor" and not (neighbor_selector < selector):
            return False
        if key == "right_neighbor" and not (selector < neighbor_selector):
            return False
    return proof.get("root") == expected_root


__all__ = [
    "MerkleTrie",
    "MerkleProofStep",
    "compute_root_from_proof",
    "verify_non_membership",
]
