"""Milvus-backed vector store integration for Summit."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from pymilvus import (
    Collection,
    CollectionSchema,
    DataType,
    FieldSchema,
    connections,
    utility,
)


@dataclass
class VectorRecord:
    """Representation of a vector embedding stored in Milvus."""

    tenant_id: str
    node_id: str
    embedding: List[float]
    metadata: Optional[Dict[str, Any]] = None


class MilvusVectorStore:
    """Wrapper around Milvus for storing and querying graph embeddings."""

    def __init__(self) -> None:
        self.uri = os.getenv("MILVUS_URI", "http://localhost:19530")
        self.token = os.getenv("MILVUS_TOKEN")
        self.collection_name = os.getenv("MILVUS_COLLECTION", "summit_embeddings")
        self.dimension = int(os.getenv("VECTOR_DIMENSION", "384"))
        self.primary_field = "vector_id"
        self.tenant_field = "tenant_id"
        self.node_field = "node_id"
        self.vector_field = "embedding"
        self.metadata_field = "metadata"

        connections.connect(alias="default", uri=self.uri, token=self.token)
        self.collection = self._ensure_collection()

    def _ensure_collection(self) -> Collection:
        """Create the collection if it does not exist and ensure it is indexed."""

        if not utility.has_collection(self.collection_name):
            fields = [
                FieldSchema(
                    name=self.primary_field,
                    dtype=DataType.VARCHAR,
                    is_primary=True,
                    max_length=128,
                ),
                FieldSchema(
                    name=self.tenant_field,
                    dtype=DataType.VARCHAR,
                    max_length=64,
                ),
                FieldSchema(
                    name=self.node_field,
                    dtype=DataType.VARCHAR,
                    max_length=128,
                ),
                FieldSchema(
                    name=self.vector_field,
                    dtype=DataType.FLOAT_VECTOR,
                    dim=self.dimension,
                ),
                FieldSchema(
                    name=self.metadata_field,
                    dtype=DataType.VARCHAR,
                    max_length=4096,
                ),
            ]

            schema = CollectionSchema(fields=fields, description="Summit vector embeddings")
            collection = Collection(
                name=self.collection_name,
                schema=schema,
                using="default",
                consistency_level="Strong",
            )
        else:
            collection = Collection(self.collection_name, using="default")

        try:
            existing_indexes = collection.indexes
        except Exception:  # pragma: no cover - defensive against SDK differences
            existing_indexes = []

        if not any(
            getattr(index, "field_name", None) == self.vector_field
            or (getattr(index, "params", {}) or {}).get("field_name") == self.vector_field
            for index in existing_indexes
        ):
            collection.create_index(
                field_name=self.vector_field,
                index_params={
                    "metric_type": "COSINE",
                    "index_type": "HNSW",
                    "params": {"M": 16, "efConstruction": 200},
                },
            )

        collection.load()
        return collection

    @staticmethod
    def _compose_id(tenant_id: str, node_id: str) -> str:
        return f"{tenant_id}::{node_id}"

    def upsert(self, records: List[VectorRecord]) -> None:
        if not records:
            return

        ids = [self._compose_id(r.tenant_id, r.node_id) for r in records]
        id_list = ",".join(f'"{record_id}"' for record_id in ids)
        expr = f"{self.primary_field} in [{id_list}]"
        self.collection.delete(expr)

        payload = [
            {
                self.primary_field: record_id,
                self.tenant_field: record.tenant_id,
                self.node_field: record.node_id,
                self.vector_field: record.embedding,
                self.metadata_field: json.dumps(record.metadata or {}),
            }
            for record_id, record in zip(ids, records)
        ]

        self.collection.insert(payload)
        self.collection.flush()

    def fetch(self, tenant_id: str, node_id: str) -> Optional[VectorRecord]:
        expr = (
            f'{self.tenant_field} == "{tenant_id}" '
            f'&& {self.node_field} == "{node_id}"'
        )
        results = self.collection.query(
            expr,
            output_fields=[self.node_field, self.vector_field, self.metadata_field, self.tenant_field],
            consistency_level="Strong",
        )

        if not results:
            return None

        row = results[0]
        metadata = row.get(self.metadata_field)
        return VectorRecord(
            tenant_id=row.get(self.tenant_field),
            node_id=row.get(self.node_field),
            embedding=row.get(self.vector_field),
            metadata=json.loads(metadata) if metadata else None,
        )

    def search(
        self,
        tenant_id: str,
        query_vector: List[float],
        top_k: int = 5,
        min_score: float = 0.0,
    ) -> List[Dict[str, Any]]:
        search_params = {
            "metric_type": "COSINE",
            "params": {"ef": 64},
        }

        results = self.collection.search(
            data=[query_vector],
            anns_field=self.vector_field,
            param=search_params,
            limit=top_k,
            expr=f'{self.tenant_field} == "{tenant_id}"',
            output_fields=[self.node_field, self.metadata_field, self.tenant_field],
            consistency_level="Strong",
        )

        if not results:
            return []

        matches: List[Dict[str, Any]] = []
        for hit in results[0]:
            score = float(hit.score)
            if score < min_score:
                continue

            metadata_raw = hit.entity.get(self.metadata_field)
            metadata = json.loads(metadata_raw) if metadata_raw else None

            matches.append(
                {
                    "nodeId": hit.entity.get(self.node_field),
                    "score": score,
                    "embedding": None,
                    "metadata": metadata,
                }
            )

        return matches
