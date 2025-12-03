from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request

from ..deps import get_tenant_case, require_clearance

router = APIRouter(prefix="/gateway", tags=["gateway"])


@router.get("/entity/{entity_id}")
async def entity_by_id(entity_id: str, request: Request, tc=Depends(get_tenant_case)):
    graph = request.app.state.graph
    record = graph.entity_by_id(entity_id)
    if record:
        return record
    return {"id": None}


@router.get("/search")
async def search_entities(
    q: str,
    request: Request,
    limit: int = 25,
    tc=Depends(get_tenant_case),
    user=Depends(require_clearance("analyst")),
):
    graph = request.app.state.graph
    results = []
    for entry in graph.search_entities(q, tc["tenant_id"], tc["case_id"], limit=limit):
        policy = entry.get("policy") or entry.get("properties", {}).get("policy")
        if policy and tc["user"] and hasattr(tc["user"], "clearances"):
            if isinstance(tc["user"].clearances, list) and hasattr(user, "clearances"):
                if not set(policy.get("clearance", [])).issubset(set(user.clearances)):
                    continue
        results.append(entry)
    return {"results": results}


@router.get("/neighbors/{entity_id}")
async def neighbors(
    entity_id: str,
    request: Request,
    max_hops: int = Query(1, ge=1, le=3),
    labels: Optional[List[str]] = Query(None),
    tc=Depends(get_tenant_case),
    user=Depends(require_clearance("analyst")),
):
    graph = request.app.state.graph
    neighbor_graph = graph.neighbors(entity_id, max_hops=max_hops, labels=labels or [])
    return neighbor_graph
