from __future__ import annotations
from typing import Dict, Iterable, List, Tuple
from summit_rt.incremental.delta_ops import DeltaOp
from summit_rt.events.envelope import stable_hash

def compute_delta(
    old_nodes: Dict[str, Dict],
    new_nodes: Dict[str, Dict],
    old_edges: Dict[str, Dict],
    new_edges: Dict[str, Dict],
) -> List[DeltaOp]:
    ops: List[DeltaOp] = []

    for uid, nprops in new_nodes.items():
        checksum = stable_hash(nprops)
        if uid not in old_nodes or stable_hash(old_nodes[uid]) != checksum:
            ops.append(DeltaOp(op="UPSERT_NODE", uid=uid, props=nprops, checksum=checksum))

    for uid in old_nodes.keys() - new_nodes.keys():
        ops.append(DeltaOp(op="TOMBSTONE_NODE", uid=uid, reason="missing_in_new_snapshot"))

    for ek, eprops in new_edges.items():
        checksum = stable_hash(eprops)
        if ek not in old_edges or stable_hash(old_edges[ek]) != checksum:
            ops.append(DeltaOp(op="UPSERT_EDGE", edge_key=ek, props=eprops, checksum=checksum))

    for ek in old_edges.keys() - new_edges.keys():
        ops.append(DeltaOp(op="TOMBSTONE_EDGE", edge_key=ek, reason="missing_in_new_snapshot"))

    return ops
