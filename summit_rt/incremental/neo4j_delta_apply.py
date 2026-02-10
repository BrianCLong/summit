from __future__ import annotations
from typing import Any, Dict, List
from summit_rt.incremental.delta_ops import DeltaOp

def apply_ops(tx, ops: List[DeltaOp], ingest_time: str) -> Dict[str, int]:
    up_nodes = [o for o in ops if o.op == "UPSERT_NODE"]
    up_edges = [o for o in ops if o.op == "UPSERT_EDGE"]
    tb_nodes = [o for o in ops if o.op == "TOMBSTONE_NODE"]
    tb_edges = [o for o in ops if o.op == "TOMBSTONE_EDGE"]

    if up_nodes:
        tx.run("""
        UNWIND $rows AS row
        MERGE (n:Entity {uid: row.uid})
        SET n += row.props,
            n.checksum = row.checksum,
            n.last_ingest_time = $ingest_time,
            n.tombstoned = false
        """, rows=[{"uid": o.uid, "props": o.props or {}, "checksum": o.checksum} for o in up_nodes],
             ingest_time=ingest_time)

    if up_edges:
        # Note: In production code, relationship types should be dynamic or specific.
        # This implementation assumes a generic REL type or requires edge_key to be unique enough.
        # For this prototype, we use :REL.
        tx.run("""
        UNWIND $rows AS row
        MATCH (a:Entity {uid: row.src_uid})
        MATCH (b:Entity {uid: row.dst_uid})
        MERGE (a)-[r:REL {edge_key: row.edge_key}]->(b)
        SET r += row.props,
            r.checksum = row.checksum,
            r.last_ingest_time = $ingest_time,
            r.tombstoned = false
        """, rows=[o.props for o in up_edges], ingest_time=ingest_time)  # props must include src_uid/dst_uid/edge_key

    if tb_nodes:
        tx.run("""
        UNWIND $rows AS row
        MATCH (n:Entity {uid: row.uid})
        SET n.tombstoned = true,
            n.tombstone_reason = row.reason,
            n.last_ingest_time = $ingest_time
        """, rows=[{"uid": o.uid, "reason": o.reason} for o in tb_nodes], ingest_time=ingest_time)

    if tb_edges:
        tx.run("""
        UNWIND $rows AS row
        MATCH ()-[r:REL {edge_key: row.edge_key}]-()
        SET r.tombstoned = true,
            r.tombstone_reason = row.reason,
            r.last_ingest_time = $ingest_time
        """, rows=[{"edge_key": o.edge_key, "reason": o.reason} for o in tb_edges], ingest_time=ingest_time)

    return {
        "upsert_nodes": len(up_nodes),
        "upsert_edges": len(up_edges),
        "tombstone_nodes": len(tb_nodes),
        "tombstone_edges": len(tb_edges),
    }
