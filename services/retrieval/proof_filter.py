from typing import List

from services.index_store.proofs.store import ProofStore


class RetrievalHit:
    def __init__(self, pid, fh, content):
        self.path_id = pid; self.file_hash = fh; self.content = content
class ProofFilter:
    def __init__(self, ps: ProofStore): self.ps = ps
    def filter(self, ws_id, hits):
        return [h for h in hits if self.ps.is_provable(ws_id, h.path_id, h.file_hash)]
