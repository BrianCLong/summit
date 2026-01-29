from dataclasses import dataclass, field
from typing import List, Dict, Optional

@dataclass(frozen=True)
class Citation:
    doc_id: str
    chunk_id: str
    source: str  # retriever name / index name
    offsets: Optional[Dict[str, int]] = None

@dataclass(frozen=True)
class ContextChunk:
    doc_id: str
    chunk_id: str
    text: str = ""  # NOTE: avoid logging this; only pass to model layer
    metadata: Dict[str, str] = field(default_factory=dict)

@dataclass(frozen=True)
class ContextPack:
    chunks: List[ContextChunk]
    citations: List[Citation]
    policy_tags: List[str]
    reason: str = ""

    @staticmethod
    def empty(*, reason: str) -> "ContextPack":
        return ContextPack(chunks=[], citations=[], policy_tags=[], reason=reason)

@dataclass(frozen=True)
class Candidate:
    chunk_ref: str # ID or ref
    score: float
    retriever: str
    features: Dict[str, float] = field(default_factory=dict)
