"""Utilities for replaying retrieval logs from structured JSON files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, List

from .models import QueryResult, RankedDocument, RetrievalLog


def _normalise_rankings(results: Iterable[dict]) -> List[RankedDocument]:
    docs: List[RankedDocument] = []
    for idx, raw in enumerate(results, start=1):
        rank = int(raw.get("rank", idx))
        docs.append(
            RankedDocument(
                doc_id=str(raw["doc_id"]),
                rank=rank,
                score=float(raw.get("score", 0.0)),
                group=str(raw.get("group", "unknown")),
                features={k: float(v) for k, v in raw.get("features", {}).items()},
            )
        )
    docs.sort(key=lambda doc: doc.rank)
    for position, doc in enumerate(docs, start=1):
        # Ensure ranks are consecutive even if the input was sparse.
        docs[position - 1] = RankedDocument(
            doc_id=doc.doc_id,
            rank=position,
            score=doc.score,
            group=doc.group,
            features=doc.features,
        )
    return docs


def load_retrieval_log(path: str | Path) -> RetrievalLog:
    """Load a retrieval log from disk.

    The expected format is::

        {
            "version": "v1",
            "queries": [
                {
                    "id": "q1",
                    "query": "history of ai",
                    "results": [
                        {
                            "doc_id": "d1",
                            "rank": 1,
                            "score": 12.3,
                            "group": "group_a",
                            "features": {"relevance": 0.8}
                        }
                    ]
                }
            ]
        }
    """

    resolved = Path(path)
    with resolved.open("r", encoding="utf8") as handle:
        payload = json.load(handle)

    version = str(payload.get("version", resolved.stem))
    queries_raw = payload.get("queries", [])
    queries: List[QueryResult] = []
    for raw in queries_raw:
        queries.append(
            QueryResult(
                query_id=str(raw.get("id") or raw.get("query_id")),
                query=str(raw.get("query", "")),
                results=_normalise_rankings(raw.get("results", [])),
            )
        )

    return RetrievalLog(version=version, queries=queries)
