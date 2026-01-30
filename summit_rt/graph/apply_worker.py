from __future__ import annotations
from typing import Optional
from summit_rt.outbox.store import OutboxStore
from summit_rt.graph.index_builder import GraphIndexBuilder

class GraphApplyWorker:
    def __init__(self, outbox: OutboxStore, neo4j_driver, enabled: bool = True):
        self.outbox = outbox
        self.driver = neo4j_driver
        self.enabled = enabled
        self.builder = GraphIndexBuilder()

    def tick(self, limit: int = 100) -> int:
        if not self.enabled:
            return 0
        n = 0
        for ev in self.outbox.iter_pending(limit=limit):
            nodes, edges = self.builder.build(ev)
            # TODO: MERGE nodes/edges with deterministic keys and edge_key.
            # MUST be idempotent. Prefer MERGE on (uid) and (edge_key).
            self.outbox.mark_done(ev.event_id, stage="graph_applied")
            n += 1
        return n
