from __future__ import annotations
from dataclasses import dataclass
from typing import Dict

@dataclass(frozen=True)
class ConsistencyMetrics:
    pending_graph: int
    pending_semantic: int
    total_seen: int

def compute_consistency(outbox) -> Dict[str, int]:
    # TODO: query outbox receipts and compute lag distributions
    return {"pending_graph": 0, "pending_semantic": 0, "total_seen": 0}
