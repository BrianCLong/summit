"""
Summit Data Plane – FastAPI application.

Endpoints:
  POST  /dp/pipelines          – run a pipeline
  GET   /dp/pipelines/{run_id} – get run status
  GET   /dp/entities           – query resolved entities
  GET   /dp/health             – liveness + readiness
"""
from __future__ import annotations

import logging
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

from .connectors.github import GitHubConnector
from .entity_resolution import EntityResolver, EntityStore
from .models import EntityQuery, EntityQueryResponse, EntityType, PipelineRun
from .pipeline import DataPipeline

structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
)
logger = structlog.get_logger(__name__)

app = FastAPI(
    title="Summit Data Plane",
    description="Ingest, normalize, resolve, and query intelligence artifacts.",
    version="0.1.0",
)

# Shared entity store (in-memory; swap with persistent backend for production)
_entity_store = EntityStore()
_entity_resolver = EntityResolver(store=_entity_store)

# In-memory run registry
_runs: dict[str, PipelineRun] = {}


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RunPipelineRequest(BaseModel):
    connector: str
    config: dict[str, Any]
    tenant_id: str = "default"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/dp/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "data-plane"}


@app.post("/dp/pipelines", response_model=PipelineRun, status_code=202)
async def run_pipeline(req: RunPipelineRequest) -> PipelineRun:
    """
    Start a pipeline run.

    Supported connectors:
      - ``github`` – config requires ``owner``; optional ``repo``, ``token``
    """
    connector = _build_connector(req.connector, req.config)
    pipeline = DataPipeline(
        connector=connector,
        entity_resolver=_entity_resolver,
    )
    run = await pipeline.execute(tenant_id=req.tenant_id, config=req.config)
    _runs[run.run_id] = run
    return run


@app.get("/dp/pipelines/{run_id}", response_model=PipelineRun)
async def get_pipeline_run(run_id: str) -> PipelineRun:
    run = _runs.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"run {run_id!r} not found")
    return run


@app.get("/dp/entities", response_model=EntityQueryResponse)
async def query_entities(
    entity_type: EntityType | None = Query(default=None),
    name_contains: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
) -> EntityQueryResponse:
    """Query the resolved entity store."""
    entities = _entity_store.find(
        entity_type=entity_type,
        name_contains=name_contains,
        limit=limit,
    )
    return EntityQueryResponse(entities=entities, total=len(entities))


# ---------------------------------------------------------------------------
# Connector factory
# ---------------------------------------------------------------------------

def _build_connector(name: str, config: dict[str, Any]) -> Any:
    if name == "github":
        return GitHubConnector(config)
    raise HTTPException(
        status_code=400,
        detail=f"Unknown connector: {name!r}. Supported: ['github']",
    )
