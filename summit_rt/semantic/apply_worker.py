from __future__ import annotations
from summit_rt.outbox.store import OutboxStore

class SemanticApplyWorker:
    def __init__(self, outbox: OutboxStore, semantic_index_client, enabled: bool = True):
        self.outbox = outbox
        self.index = semantic_index_client
        self.enabled = enabled

    def tick(self, limit: int = 100) -> int:
        if not self.enabled:
            return 0
        n = 0
        # TODO: iterate events that are graph_applied but not semantic_applied
        # Must be idempotent by stable doc_id (event_id) + graph_version.
        return n
