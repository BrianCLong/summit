"""Milvus vector store integration for Summit ML engine.

This module provides a small wrapper around pymilvus so the
TensorFlow/PyTorch pipelines can persist and query embeddings that are
later consumed by the GraphQL API.  The design favors clarity over
cleverness so it can run both in notebooks and production workers.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Iterable, List, Optional

from pymilvus import (Collection, CollectionSchema, DataType, FieldSchema,
                      connections, utility)


@dataclass
class EmbeddingRecord:
    """Represents one embedding destined for Milvus."""

    id: str
    vector: List[float]
    tenant_id: str
    node_id: str
    embedding_model: Optional[str] = None
    metadata: Optional[dict] = None


class MilvusVectorStore:
    """Thin convenience wrapper around a Milvus collection."""

    def __init__(
        self,
        collection_name: str = "summit_embeddings",
        dim: Optional[int] = None,
        host: Optional[str] = None,
        port: int = 19530,
        token: Optional[str] = None,
        alias: str = "default",
    ) -> None:
        self.collection_name = collection_name
        self.alias = alias
        self.dim = dim

        address = host or "127.0.0.1"
        uri = f"http://{address}:{port}" if not address.startswith("http") else address

        connections.connect(alias=alias, uri=uri, token=token)

        if not utility.has_collection(collection_name, using=alias):
            if dim is None:
                raise ValueError(
                    "Embedding dimension must be provided when creating a new collection"
                )
            self._create_collection(dim)
        else:
            collection = Collection(collection_name, using=alias)
            if dim is None:
                dim = next(
                    field.params.get("dim")
                    for field in collection.schema.fields
                    if field.name == "embedding"
                )
            self.collection = collection
            self.dim = dim
            return

        self.collection = Collection(collection_name, using=alias)

        # Lazy load indexes to avoid startup penalties
        if not self.collection.has_index(index_name="embeddings_hnsw"):
            self.collection.create_index(
                field_name="embedding",
                index_params={
                    "index_type": "HNSW",
                    "metric_type": "COSINE",
                    "params": {"M": 16, "efConstruction": 200},
                },
                index_name="embeddings_hnsw",
            )
        self.collection.load()

    def _create_collection(self, dim: int) -> None:
        fields = [
            FieldSchema(
                name="id",
                dtype=DataType.VARCHAR,
                is_primary=True,
                max_length=128,
                auto_id=False,
            ),
            FieldSchema(
                name="tenant_id",
                dtype=DataType.VARCHAR,
                max_length=64,
            ),
            FieldSchema(
                name="node_id",
                dtype=DataType.VARCHAR,
                max_length=128,
            ),
            FieldSchema(
                name="embedding_model",
                dtype=DataType.VARCHAR,
                max_length=128,
            ),
            FieldSchema(
                name="metadata",
                dtype=DataType.VARCHAR,
                max_length=2048,
            ),
            FieldSchema(
                name="embedding",
                dtype=DataType.FLOAT_VECTOR,
                dim=dim,
            ),
        ]
        schema = CollectionSchema(fields, description="Summit entity embeddings")
        Collection(self.collection_name, schema, using=self.alias)
        self.dim = dim

    def upsert(self, records: Iterable[EmbeddingRecord]) -> None:
        records = list(records)
        if not records:
            return

        first_dim = len(records[0].vector)
        if self.dim and first_dim != self.dim:
            raise ValueError(f"Embedding dimension mismatch: expected {self.dim}, got {first_dim}")

        ids = [rec.id for rec in records]
        expr = f'id in [{",".join(f"\"{_id}\"" for _id in ids)}]'
        self.collection.delete(expr)

        data = [
            ids,
            [rec.tenant_id for rec in records],
            [rec.node_id for rec in records],
            [rec.embedding_model or "unknown" for rec in records],
            [json.dumps(rec.metadata or {}) for rec in records],
            [rec.vector for rec in records],
        ]
        self.collection.insert(data)
        self.collection.flush()

    def similarity_search(
        self,
        vector: List[float],
        top_k: int = 10,
        tenant_id: Optional[str] = None,
        node_ids: Optional[Iterable[str]] = None,
        embedding_model: Optional[str] = None,
        search_params: Optional[dict] = None,
    ) -> List[dict]:
        if self.dim and len(vector) != self.dim:
            raise ValueError(f"Query vector dimension mismatch: expected {self.dim}, got {len(vector)}")

        filters = []
        if tenant_id:
            filters.append(f"tenant_id == '{tenant_id}'")
        if embedding_model:
            filters.append(f"embedding_model == '{embedding_model}'")
        if node_ids:
            node_list = ",".join(f"'{node}'" for node in node_ids)
            filters.append(f"node_id in [{node_list}]")

        expr = " and ".join(filters) if filters else ""

        params = {
            "metric_type": "COSINE",
            "params": {"ef": 200},
        }
        if search_params:
            params.update(search_params)

        results = self.collection.search(  # type: ignore[arg-type]
            data=[vector],
            anns_field="embedding",
            param=params,
            limit=top_k,
            expr=expr or None,
            output_fields=["tenant_id", "node_id", "embedding_model", "metadata"],
        )

        formatted: List[dict] = []
        hits = results[0] if results else []
        for hit in hits:
            payload = {
                "id": hit.id,
                "score": float(hit.distance),
                "tenant_id": hit.entity.get("tenant_id"),
                "node_id": hit.entity.get("node_id"),
                "embedding_model": hit.entity.get("embedding_model"),
                "metadata": json.loads(hit.entity.get("metadata") or "{}"),
            }
            formatted.append(payload)
        return formatted

    def benchmark_search(self, vector: List[float], warmup: int = 3, runs: int = 10) -> dict:
        # Warm-up
        for _ in range(warmup):
            self.similarity_search(vector, top_k=1)

        latencies: List[float] = []
        for _ in range(runs):
            start = time.perf_counter()
            self.similarity_search(vector, top_k=5)
            latencies.append((time.perf_counter() - start) * 1000.0)

        latencies.sort()
        return {
            "runs": runs,
            "p50_ms": latencies[len(latencies) // 2],
            "p95_ms": latencies[max(int(runs * 0.95) - 1, 0)],
            "avg_ms": sum(latencies) / runs,
        }


__all__ = ["MilvusVectorStore", "EmbeddingRecord"]
