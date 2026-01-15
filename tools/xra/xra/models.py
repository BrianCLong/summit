"""Data structures used by the Explainable Ranking Auditor."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RankedDocument:
    """Represents a single ranked document returned for a query."""

    doc_id: str
    rank: int
    score: float
    group: str
    features: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class QueryResult:
    """A set of ranked results for a single query."""

    query_id: str
    query: str
    results: list[RankedDocument]


@dataclass(frozen=True)
class RetrievalLog:
    """Container for all query results within a retrieval evaluation."""

    version: str
    queries: list[QueryResult]

    def all_groups(self) -> list[str]:
        groups: list[str] = []
        seen = set()
        for query in self.queries:
            for doc in query.results:
                if doc.group not in seen:
                    seen.add(doc.group)
                    groups.append(doc.group)
        return groups

    def feature_names(self) -> list[str]:
        names: list[str] = []
        seen = set()
        for query in self.queries:
            for doc in query.results:
                for name in doc.features:
                    if name not in seen:
                        seen.add(name)
                        names.append(name)
        return names
