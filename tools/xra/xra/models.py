"""Data structures used by the Explainable Ranking Auditor."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class RankedDocument:
    """Represents a single ranked document returned for a query."""

    doc_id: str
    rank: int
    score: float
    group: str
    features: Dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class QueryResult:
    """A set of ranked results for a single query."""

    query_id: str
    query: str
    results: List[RankedDocument]


@dataclass(frozen=True)
class RetrievalLog:
    """Container for all query results within a retrieval evaluation."""

    version: str
    queries: List[QueryResult]

    def all_groups(self) -> List[str]:
        groups: List[str] = []
        seen = set()
        for query in self.queries:
            for doc in query.results:
                if doc.group not in seen:
                    seen.add(doc.group)
                    groups.append(doc.group)
        return groups

    def feature_names(self) -> List[str]:
        names: List[str] = []
        seen = set()
        for query in self.queries:
            for doc in query.results:
                for name in doc.features:
                    if name not in seen:
                        seen.add(name)
                        names.append(name)
        return names
