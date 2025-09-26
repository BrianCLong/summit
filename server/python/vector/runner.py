"""Simple JSON-over-stdin runner for vector database operations."""
from __future__ import annotations

import json
import sys
from typing import Any, Dict

from .milvus_store import EmbeddingRecord, MilvusVectorStore


def main() -> None:
    try:
        payload: Dict[str, Any] = json.load(sys.stdin)
    except Exception as exc:  # pragma: no cover - defensive
        json.dump({"status": "error", "error": f"invalid input: {exc}"}, sys.stdout)
        return

    action = payload.get("action")
    config = payload.get("config", {})

    try:
        store = MilvusVectorStore(**config)
    except Exception as exc:
        json.dump({"status": "error", "error": str(exc)}, sys.stdout)
        return

    try:
        if action == "upsert":
            records = [EmbeddingRecord(**record) for record in payload.get("records", [])]
            store.upsert(records)
            json.dump({"status": "ok", "count": len(records)}, sys.stdout)
        elif action == "search":
            results = store.similarity_search(
                vector=payload["vector"],
                top_k=payload.get("top_k", 10),
                tenant_id=payload.get("tenant_id"),
                node_ids=payload.get("node_ids"),
                embedding_model=payload.get("embedding_model"),
                search_params=payload.get("search_params"),
            )
            json.dump({"status": "ok", "results": results}, sys.stdout)
        elif action == "benchmark":
            metrics = store.benchmark_search(
                payload["vector"],
                warmup=payload.get("warmup", 3),
                runs=payload.get("runs", 10),
            )
            json.dump({"status": "ok", "metrics": metrics}, sys.stdout)
        else:
            json.dump({"status": "error", "error": f"unsupported action '{action}'"}, sys.stdout)
    except Exception as exc:
        json.dump({"status": "error", "error": str(exc)}, sys.stdout)


if __name__ == "__main__":
    main()
