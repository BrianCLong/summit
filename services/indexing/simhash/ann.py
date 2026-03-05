from typing import List, Tuple

from pydantic import BaseModel

from .compute import SimhashBuilder


class IndexCandidate(BaseModel):
    snapshot_id: str
    scope: str
    simhash: list[int]
class SimhashANN:
    def __init__(self): self.storage = []
    def add(self, c: IndexCandidate): self.storage.append(c)
    def find(self, qs, scope, k=1, th=10):
        res = []
        for c in self.storage:
            if not c.scope.startswith(scope): continue
            d = SimhashBuilder.hamming_distance(qs, c.simhash)
            if d <= th: res.append((c, d))
        res.sort(key=lambda x: x[1])
        return res[:k]
