"""FastAPI service for recording and querying data lineage events.

This service wraps the existing `LineageTracker` utilities from the
IntelGraph data-pipelines package and exposes a lightweight HTTP API for
Summit ingestion workers.  It persists lineage events to PostgreSQL so
that GraphQL resolvers and the React dashboard can surface lineage
information alongside other operational metrics.
"""
from __future__ import annotations

import os
import sys
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg2.extras import Json

# Ensure the data-pipelines package is importable when the service runs in-place
DATA_PIPELINES_PATH = Path(__file__).resolve().parents[2] / "data-pipelines"
if DATA_PIPELINES_PATH.exists():
    sys.path.append(str(DATA_PIPELINES_PATH))

from governance.lineage import LineageCatalog, LineageTracker  # type: ignore
from governance.utils.logging import get_logger  # type: ignore

LOGGER = get_logger("lineage-service")


class DatasetRef(BaseModel):
    """Dataset metadata passed from ingestion workers."""

    namespace: str = Field(default="intelgraph")
    name: str
    columns: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RunStartRequest(BaseModel):
    """Payload for starting a tracked lineage run."""

    job_name: str
    job_type: str
    namespace: str = Field(default="intelgraph")
    tenant_id: Optional[str] = Field(default=None)
    run_id: Optional[str] = Field(default=None)
    inputs: List[DatasetRef] = Field(default_factory=list)
    outputs: List[DatasetRef] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LineageEventPayload(BaseModel):
    """Lineage event emitted during ingestion or transformation."""

    run_id: str
    step_id: Optional[str] = Field(default=None)
    event_type: str
    source_dataset: Optional[str] = Field(default=None)
    target_dataset: Optional[str] = Field(default=None)
    source_column: Optional[str] = Field(default=None)
    target_column: Optional[str] = Field(default=None)
    transformation: Optional[str] = Field(default=None)
    target_system: Optional[str] = Field(default=None)
    tenant_id: Optional[str] = Field(default=None)
    columns: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RunCompleteRequest(BaseModel):
    """Marks a lineage run as completed."""

    status: str = Field(default="COMPLETED")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LineageGraphResponse(BaseModel):
    """Response structure for dataset lineage lookups."""

    dataset: str
    upstream: List[Dict[str, Any]]
    downstream: List[Dict[str, Any]]
    runs: List[Dict[str, Any]] = Field(default_factory=list)
    generated_at: datetime


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    host = os.getenv("POSTGRES_HOST", "postgres")
    user = os.getenv("POSTGRES_USER", "intelgraph")
    password = os.getenv("POSTGRES_PASSWORD", "devpassword")
    db = os.getenv("POSTGRES_DB", "intelgraph_dev")
    port = os.getenv("POSTGRES_PORT", "5432")
    DATABASE_URL = f"postgresql://{user}:{password}@{host}:{port}/{db}"


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(title="Summit Lineage Service", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    tracker = LineageTracker()
    catalog = LineageCatalog(storage_path=os.getenv("LINEAGE_CATALOG_PATH", "lineage_catalog.json"))
    ensure_storage()

    @contextmanager
    def db_connection():
        conn = psycopg2.connect(DATABASE_URL)
        try:
            yield conn
        finally:
            conn.close()

    def persist_event(
        run_id: Optional[str],
        step_id: Optional[str],
        event_type: str,
        payload: Dict[str, Any],
        event_time: Optional[datetime] = None,
    ) -> None:
        """Persist an event to PostgreSQL."""

        event_time = event_time or datetime.utcnow()
        try:
            uuid_value = uuid.UUID(run_id) if run_id else None
        except Exception as exc:  # pragma: no cover - defensive guard
            LOGGER.warn("invalid run_id provided", run_id=run_id, error=str(exc))
            uuid_value = None

        with db_connection() as conn:
            with conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO openlineage_events (run_id, step_id, event_time, event_type, payload)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (uuid_value, step_id, event_time, event_type, Json(payload)),
                    )
        LOGGER.debug(
            "persisted lineage event",
            run_id=run_id,
            step_id=step_id,
            event_type=event_type,
            payload=payload,
        )

    def register_datasets(tenant_id: Optional[str], datasets: List[DatasetRef]) -> None:
        for dataset in datasets:
            if not dataset or not dataset.name:
                continue
            metadata = dict(dataset.metadata or {})
            if tenant_id and "tenant_id" not in metadata:
                metadata["tenant_id"] = tenant_id
            catalog.register_dataset(dataset.name, dataset.columns, metadata)

    def compute_graph_from_db(
        dataset_name: str,
        tenant_id: Optional[str],
        direction: str,
    ) -> LineageGraphResponse:
        """Fallback lineage computation backed by PostgreSQL events."""

        direction = direction.upper()
        clauses = ["(payload->>'source_dataset' = %s OR payload->>'target_dataset' = %s)"]
        params: List[Any] = [dataset_name, dataset_name]

        if tenant_id and tenant_id.lower() != "all":
            clauses.append("(payload->>'tenant_id' = %s)")
            params.append(tenant_id)

        where_clause = " AND ".join(clauses)
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT run_id::text, step_id, event_time, event_type, payload
                    FROM openlineage_events
                    WHERE {where_clause}
                    ORDER BY event_time DESC
                    LIMIT 400
                    """,
                    params,
                )
                rows = cur.fetchall()

        upstream: List[Dict[str, Any]] = []
        downstream: List[Dict[str, Any]] = []
        runs: Dict[str, Dict[str, Any]] = {}

        for run_id, step_id, event_time, event_type, payload in rows:
            payload = payload or {}
            edge = {
                "runId": run_id,
                "stepId": step_id,
                "eventTime": event_time.isoformat() if isinstance(event_time, datetime) else event_time,
                "eventType": event_type,
                "sourceDataset": payload.get("source_dataset"),
                "targetDataset": payload.get("target_dataset"),
                "sourceColumn": payload.get("source_column"),
                "targetColumn": payload.get("target_column"),
                "transformation": payload.get("transformation"),
                "targetSystem": payload.get("target_system"),
                "metadata": payload.get("metadata", {}),
            }

            if payload.get("target_dataset") == dataset_name and direction in {"UPSTREAM", "BOTH"}:
                upstream.append(edge)
            if payload.get("source_dataset") == dataset_name and direction in {"DOWNSTREAM", "BOTH"}:
                downstream.append(edge)

            if run_id and run_id not in runs:
                runs[run_id] = {
                    "runId": run_id,
                    "jobName": payload.get("job_name", payload.get("job")),
                    "jobType": payload.get("job_type"),
                    "status": payload.get("status", "UNKNOWN"),
                    "startedAt": payload.get("started_at"),
                    "completedAt": payload.get("completed_at"),
                }

        return LineageGraphResponse(
            dataset=dataset_name,
            upstream=upstream,
            downstream=downstream,
            runs=list(runs.values()),
            generated_at=datetime.utcnow(),
        )

    @app.post("/runs/start")
    def start_run(payload: RunStartRequest) -> Dict[str, Any]:
        LOGGER.info("starting lineage run", job=payload.job_name, tenant=payload.tenant_id)
        run_id = tracker.start_run(
            job_name=payload.job_name,
            job_type=payload.job_type,
            namespace=payload.namespace,
            run_id=payload.run_id,
        )

        if payload.metadata:
            tracker.current_runs[run_id].metadata.update(payload.metadata)

        for dataset in payload.inputs:
            tracker.add_input_dataset(
                run_id,
                dataset.namespace,
                dataset.name,
                dataset.columns,
                dataset.metadata,
            )
        for dataset in payload.outputs:
            tracker.add_output_dataset(
                run_id,
                dataset.namespace,
                dataset.name,
                dataset.columns,
                dataset.metadata,
            )

        register_datasets(payload.tenant_id, payload.inputs + payload.outputs)

        event_payload = {
            "job_name": payload.job_name,
            "job_type": payload.job_type,
            "namespace": payload.namespace,
            "tenant_id": payload.tenant_id,
            "metadata": payload.metadata,
            "inputs": [dataset.model_dump() for dataset in payload.inputs],
            "outputs": [dataset.model_dump() for dataset in payload.outputs],
            "status": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
        }
        persist_event(run_id, "start", "RUN_START", event_payload)
        return {"run_id": run_id}

    @app.post("/runs/{run_id}/events")
    def add_event(run_id: str, payload: LineageEventPayload) -> Dict[str, Any]:
        if payload.run_id and payload.run_id != run_id:
            raise HTTPException(status_code=400, detail="Run ID mismatch between path and payload")

        LOGGER.info(
            "recording lineage event",
            run_id=run_id,
            event_type=payload.event_type,
            target_system=payload.target_system,
        )

        if payload.source_dataset and payload.target_dataset:
            try:
                tracker.add_column_lineage(
                    run_id,
                    payload.source_dataset,
                    payload.source_column or "*",
                    payload.target_dataset,
                    payload.target_column or "*",
                    payload.transformation or payload.event_type,
                    payload.metadata.get("transformation_logic") if payload.metadata else None,
                )
            except Exception as exc:  # pragma: no cover - tracker errors should not break ingestion
                LOGGER.error(
                    "failed to add column lineage",
                    run_id=run_id,
                    error=str(exc),
                )

        register_datasets(payload.tenant_id, [
            DatasetRef(namespace="", name=payload.target_dataset, columns=payload.columns, metadata=payload.metadata)
        ] if payload.target_dataset else [])

        persist_event(
            run_id,
            payload.step_id,
            payload.event_type,
            {
                "job_name": payload.metadata.get("job_name") if payload.metadata else None,
                "job_type": payload.metadata.get("job_type") if payload.metadata else None,
                "tenant_id": payload.tenant_id,
                "source_dataset": payload.source_dataset,
                "target_dataset": payload.target_dataset,
                "source_column": payload.source_column,
                "target_column": payload.target_column,
                "transformation": payload.transformation,
                "target_system": payload.target_system,
                "columns": payload.columns,
                "metadata": payload.metadata,
            },
        )

        return {"status": "RECORDED"}

    @app.post("/runs/{run_id}/complete")
    def complete_run(run_id: str, payload: RunCompleteRequest) -> Dict[str, Any]:
        LOGGER.info("completing lineage run", run_id=run_id, status=payload.status)
        run_info = tracker.complete_run(run_id, status=payload.status, metadata=payload.metadata)
        event_payload = {
            "job_name": run_info.job_info.name,
            "job_type": run_info.job_info.job_type,
            "tenant_id": payload.metadata.get("tenant_id") if payload.metadata else None,
            "status": payload.status,
            "metadata": payload.metadata,
            "completed_at": run_info.completed_at.isoformat() if run_info.completed_at else None,
            "started_at": run_info.started_at.isoformat(),
        }
        persist_event(run_id, "complete", "RUN_COMPLETE", event_payload)
        return {"status": payload.status}

    @app.get("/lineage/datasets/{dataset_name}", response_model=LineageGraphResponse)
    def dataset_lineage(
        dataset_name: str,
        tenant_id: Optional[str] = Query(default=None, description="Optional tenant scope"),
        direction: str = Query(default="BOTH", regex="^(?i)(upstream|downstream|both)$"),
    ) -> LineageGraphResponse:
        try:
            graph = tracker.get_lineage_graph(dataset_name)
        except Exception as exc:  # pragma: no cover - tracker fallback
            LOGGER.error("tracker lineage lookup failed", dataset=dataset_name, error=str(exc))
            graph = {"upstream": [], "downstream": []}

        if not graph.get("upstream") and not graph.get("downstream"):
            return compute_graph_from_db(dataset_name, tenant_id, direction)

        return LineageGraphResponse(
            dataset=dataset_name,
            upstream=graph.get("upstream", []),
            downstream=graph.get("downstream", []),
            runs=[],
            generated_at=datetime.utcnow(),
        )

    return app


def ensure_storage() -> None:
    """Ensure the PostgreSQL lineage tables exist."""

    with psycopg2.connect(DATABASE_URL) as conn:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS openlineage_events(
                        id bigserial PRIMARY KEY,
                        run_id uuid,
                        step_id text,
                        event_time timestamptz NOT NULL,
                        event_type text NOT NULL,
                        payload jsonb NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_ol_run ON openlineage_events(run_id, step_id, event_time);
                    """
                )


app = create_app()
