"""FastAPI service exposing Milvus-backed embedding operations."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from .milvus_store import MilvusVectorStore, VectorRecord

app = FastAPI(title="Summit Vector Service", version="1.0.0")


def get_store() -> MilvusVectorStore:
    """Dependency injection wrapper to lazily instantiate the store."""
    if not hasattr(app.state, "vector_store"):
        app.state.vector_store = MilvusVectorStore()
    return app.state.vector_store


class EmbeddingRecord(BaseModel):
    tenantId: str = Field(..., alias="tenant_id")
    nodeId: str = Field(..., alias="node_id")
    embedding: List[float]
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        allow_population_by_field_name = True


class UpsertRequest(BaseModel):
    records: List[EmbeddingRecord]


class FetchRequest(BaseModel):
    tenantId: str
    nodeId: str


class SearchRequest(BaseModel):
    tenantId: str
    queryVector: List[float]
    topK: Optional[int] = 5
    minScore: Optional[float] = 0.0


@app.get("/healthz")
async def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/embeddings/upsert")
async def upsert_embeddings(
    request: UpsertRequest,
    store: MilvusVectorStore = Depends(get_store),
) -> Dict[str, Any]:
    vector_records = [
        VectorRecord(
            tenant_id=record.tenantId,
            node_id=record.nodeId,
            embedding=record.embedding,
            metadata=record.metadata,
        )
        for record in request.records
    ]
    store.upsert(vector_records)
    return {"status": "ok", "count": len(vector_records)}


@app.post("/embeddings/fetch")
async def fetch_embedding(
    request: FetchRequest,
    store: MilvusVectorStore = Depends(get_store),
) -> Dict[str, Any]:
    record = store.fetch(request.tenantId, request.nodeId)
    if not record:
        raise HTTPException(status_code=404, detail="Embedding not found")

    return {
        "record": {
            "tenantId": record.tenant_id,
            "nodeId": record.node_id,
            "embedding": record.embedding,
            "metadata": record.metadata,
        }
    }


@app.post("/search")
async def search_embeddings(
    request: SearchRequest,
    store: MilvusVectorStore = Depends(get_store),
) -> Dict[str, Any]:
    matches = store.search(
        tenant_id=request.tenantId,
        query_vector=request.queryVector,
        top_k=request.topK or 5,
        min_score=request.minScore or 0.0,
    )
    return {"matches": matches}


@app.middleware("http")
async def add_request_id(request: Request, call_next):  # type: ignore[override]
    response = await call_next(request)
    response.headers["x-summit-vector-service"] = "true"
    return response
