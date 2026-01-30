from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple
from summit_rt.events.envelope import EventEnvelope, stable_hash

@dataclass(frozen=True)
class NodeSpec:
    label: str
    uid: str
    props: Dict[str, Any]

@dataclass(frozen=True)
class EdgeSpec:
    src_uid: str
    rel: str
    dst_uid: str
    props: Dict[str, Any]
    edge_key: str  # deterministic for idempotency

class GraphIndexBuilder:
    """
    Turns an EventEnvelope into normalized nodes/edges.
    v1 intentionally simple; evolve extraction without changing consumers.
    """
    def build(self, ev: EventEnvelope) -> Tuple[List[NodeSpec], List[EdgeSpec]]:
        parsed = ev.payload.get("parsed", {})
        # v1: treat whole record as a Document; optional mention list
        doc_uid = f"doc:{ev.event_id}"
        nodes = [NodeSpec(label="Document", uid=doc_uid, props={
            "uid": doc_uid,
            "source_uri": ev.source.get("uri"),
            "event_time": ev.event_time,
            "ingest_time": ev.ingest_time,
        })]

        edges: List[EdgeSpec] = []
        for m in parsed.get("mentions", []):
            person_uid = f"person:{m}"
            nodes.append(NodeSpec(label="Person", uid=person_uid, props={"uid": person_uid, "name": m}))
            edge_basis = {"src": doc_uid, "rel": "MENTIONS", "dst": person_uid}
            edges.append(EdgeSpec(
                src_uid=doc_uid,
                rel="MENTIONS",
                dst_uid=person_uid,
                props={"source_uri": ev.source.get("uri"), "first_seen": ev.ingest_time, "last_seen": ev.ingest_time},
                edge_key=stable_hash(edge_basis),
            ))
        return nodes, edges
