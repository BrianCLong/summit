from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional, Tuple

@dataclass
class FederatedNode:
    node_id: str
    data_shard: Set[str] = field(default_factory=set) # Set of hashed PII
    state_log: List[str] = field(default_factory=list)
    peers: List[FederatedNode] = field(default_factory=list)
    term: int = 0
    is_leader: bool = False

class ConsensusEngine:
    """
    Raft-lite consensus for federated data state.
    """
    def __init__(self, nodes: List[FederatedNode]):
        self.nodes = {n.node_id: n for n in nodes}
        for n in nodes:
            n.peers = [p for p in nodes if p.node_id != n.node_id]

    def elect_leader(self) -> Optional[str]:
        """
        Simulates an election. Returns Leader ID.
        """
        candidates = list(self.nodes.values())
        if not candidates: return None

        # Random timeout simulation
        leader = random.choice(candidates)
        leader.is_leader = True
        leader.term += 1

        # Heartbeat
        for peer in leader.peers:
            peer.is_leader = False
            peer.term = leader.term

        return leader.node_id

    def append_entry(self, entry: str) -> bool:
        """
        Leader replicates entry to followers. Requires majority.
        """
        leader = next((n for n in self.nodes.values() if n.is_leader), None)
        if not leader: return False

        leader.state_log.append(entry)

        # Replicate
        acks = 1 # Leader self-ack
        for peer in leader.peers:
            # Simulate network reliability
            if random.random() > 0.1:
                peer.state_log.append(entry)
                acks += 1

        # Majority Check
        if acks > len(self.nodes) // 2:
            return True
        return False

class PrivateSetIntersection:
    """
    Computes intersection of data between two nodes without sharing the set.
    Uses simplified commutative encryption simulation.
    """
    @staticmethod
    def compute_intersection(node_a: FederatedNode, node_b: FederatedNode) -> Set[str]:
        # Protocol:
        # 1. A hashes inputs with SecretA -> HashA(x)
        # 2. B hashes inputs with SecretB -> HashB(y)
        # 3. A sends HashA(x) to B. B hashes with SecretB -> HashB(HashA(x))
        # 4. B sends HashB(y) to A. A hashes with SecretA -> HashA(HashB(y))
        # 5. Compare. Since HashA(HashB(val)) == HashB(HashA(val)) if commutative.

        # We simulate this property with double-hashing

        set_a_blinded = {PrivateSetIntersection._double_hash(x, "key_a", "key_b") for x in node_a.data_shard}
        set_b_blinded = {PrivateSetIntersection._double_hash(x, "key_b", "key_a") for x in node_b.data_shard}

        intersection_blinded = set_a_blinded.intersection(set_b_blinded)

        # In real PSI, you'd unblind. Here we just return the count or blind IDs.
        return intersection_blinded

    @staticmethod
    def _double_hash(val: str, key1: str, key2: str) -> str:
        # Simulate commutative property: H(H(x, k1), k2) == H(H(x, k2), k1)
        # We do this by sorting keys before hashing combined string
        keys = sorted([key1, key2])
        payload = f"{val}:{keys[0]}:{keys[1]}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
