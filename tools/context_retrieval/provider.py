"""
Interface-only stub. No network calls.
Feature flag: SUMMIT_CONTEXT_RETRIEVAL=off by default.
"""
from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class RetrievalHit:
    path: str
    reason: str

def retrieve(query: str) -> List[RetrievalHit]:
    # TODO: plug in approved provider later (search index / embeddings / etc.)
    return []
