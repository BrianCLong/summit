from typing import Any, Dict, List

from .moment import Moment


class MemoryRetriever:
    """
    Retrieval system for ambient memory.
    Mocks a hybrid backend combining vector search (Qdrant) and graph search (Neo4j).
    """
    def __init__(self):
        # In-memory mock storage
        self._moments: list[Moment] = []

    def insert(self, moment: Moment) -> None:
        """
        Store a moment in the underlying dual indices.
        """
        self._moments.append(moment)
        # In a real implementation:
        # self.vector_index.add(moment.content_hash, moment.text)
        # self.graph_index.add_node("Moment", moment.id, timestamp=moment.timestamp)

    def search(self, query: str, limit: int = 5) -> list[dict[str, Any]]:
        """
        Hybrid search across vector and graph to retrieve relevant moments.
        Returns formatted moments with citations.
        """
        results = []

        # Simple keyword/substring search to mock vector relevance
        query_lower = query.lower()

        # Sort by timestamp descending (newest first)
        sorted_moments = sorted(self._moments, key=lambda x: x.timestamp, reverse=True)

        for m in sorted_moments:
            # Score roughly
            if query_lower in m.text.lower() or query_lower in m.title.lower():
                # Format with citations
                formatted_result = {
                    "moment": m,
                    "evidence_citation": {
                        "source": m.source_app,
                        "timestamp": m.timestamp.isoformat(),
                        "uri": m.uri
                    },
                    "score": 1.0  # Mock confidence score
                }
                results.append(formatted_result)

            if len(results) >= limit:
                break

        return results
