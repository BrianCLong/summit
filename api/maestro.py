"""Maestro API router for runs, artifacts, and disclosure packs."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from maestro.checks import check_release_gate, generate_compliance_report
from maestro.models import (
    Artifact,
    ArtifactKind,
    ArtifactMetadata,
    DisclosurePack,
    Run,
    RunStatus,
)

router = APIRouter(prefix="/maestro", tags=["maestro"])


# Request/Response schemas
class CreateRunRequest(BaseModel):
    """Request to create a new run."""

    name: str
    owner: str
    cost_estimate: float | None = None
    related_entity_ids: list[str] = Field(default_factory=list)
    related_decision_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpdateRunRequest(BaseModel):
    """Request to update a run."""

    status: RunStatus | None = None
    finished_at: datetime | None = None
    cost_actual: float | None = None
    metadata: dict[str, Any] | None = None


class CreateArtifactRequest(BaseModel):
    """Request to create an artifact."""

    run_id: str
    kind: ArtifactKind
    path_or_uri: str
    content_hash: str | None = None
    metadata_json: ArtifactMetadata = Field(default_factory=ArtifactMetadata)


class CreateDisclosurePackRequest(BaseModel):
    """Request to create a disclosure pack."""

    run_id: str
    summary: str
    artifact_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RunManifest(BaseModel):
    """Complete manifest of a run with artifacts and disclosure pack."""

    run: Run
    artifacts: list[Artifact]
    disclosure_pack: DisclosurePack | None
    compliance_report: dict[str, Any]


# Run endpoints
@router.post("/runs", response_model=Run, status_code=201)
def create_run(request: CreateRunRequest, req: Request):
    """Create a new run."""
    store = req.app.state.maestro_store

    run = Run(
        name=request.name,
        owner=request.owner,
        cost_estimate=request.cost_estimate,
        related_entity_ids=request.related_entity_ids,
        related_decision_ids=request.related_decision_ids,
        metadata=request.metadata,
    )

    return store.create_run(run)


@router.get("/runs", response_model=list[Run])
def list_runs(
    req: Request,
    owner: str | None = None,
    status: str | None = None,
):
    """List all runs, optionally filtered by owner or status."""
    store = req.app.state.maestro_store
    return store.list_runs(owner=owner, status=status)


@router.get("/runs/{run_id}", response_model=Run)
def get_run(run_id: str, req: Request):
    """Get a specific run by ID."""
    store = req.app.state.maestro_store
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return run


@router.patch("/runs/{run_id}", response_model=Run)
def update_run(run_id: str, request: UpdateRunRequest, req: Request):
    """Update a run's status, cost, or metadata."""
    store = req.app.state.maestro_store

    updates = {}
    if request.status is not None:
        updates["status"] = request.status
    if request.finished_at is not None:
        updates["finished_at"] = request.finished_at
    if request.cost_actual is not None:
        updates["cost_actual"] = request.cost_actual
    if request.metadata is not None:
        updates["metadata"] = request.metadata

    run = store.update_run(run_id, updates)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return run


# Artifact endpoints
@router.post("/artifacts", response_model=Artifact, status_code=201)
def create_artifact(request: CreateArtifactRequest, req: Request):
    """Attach an artifact to a run."""
    store = req.app.state.maestro_store

    # Verify run exists
    run = store.get_run(request.run_id)
    if not run:
        raise HTTPException(
            status_code=404, detail=f"Run {request.run_id} not found"
        )

    artifact = Artifact(
        run_id=request.run_id,
        kind=request.kind,
        path_or_uri=request.path_or_uri,
        content_hash=request.content_hash,
        metadata_json=request.metadata_json,
    )

    return store.create_artifact(artifact)


@router.get("/artifacts", response_model=list[Artifact])
def list_artifacts(req: Request, run_id: str | None = None):
    """List all artifacts, optionally filtered by run_id."""
    store = req.app.state.maestro_store
    return store.list_artifacts(run_id=run_id)


@router.get("/artifacts/{artifact_id}", response_model=Artifact)
def get_artifact(artifact_id: str, req: Request):
    """Get a specific artifact by ID."""
    store = req.app.state.maestro_store
    artifact = store.get_artifact(artifact_id)
    if not artifact:
        raise HTTPException(
            status_code=404, detail=f"Artifact {artifact_id} not found"
        )
    return artifact


# Disclosure pack endpoints
@router.post("/disclosure-packs", response_model=DisclosurePack, status_code=201)
def create_disclosure_pack(request: CreateDisclosurePackRequest, req: Request):
    """Create a disclosure pack for a run."""
    store = req.app.state.maestro_store

    # Verify run exists
    run = store.get_run(request.run_id)
    if not run:
        raise HTTPException(
            status_code=404, detail=f"Run {request.run_id} not found"
        )

    # Verify all artifacts exist
    for artifact_id in request.artifact_ids:
        artifact = store.get_artifact(artifact_id)
        if not artifact:
            raise HTTPException(
                status_code=404, detail=f"Artifact {artifact_id} not found"
            )

    pack = DisclosurePack(
        run_id=request.run_id,
        summary=request.summary,
        artifact_ids=request.artifact_ids,
        metadata=request.metadata,
    )

    return store.create_disclosure_pack(pack)


@router.get("/disclosure-packs", response_model=list[DisclosurePack])
def list_disclosure_packs(req: Request):
    """List all disclosure packs."""
    store = req.app.state.maestro_store
    return store.list_disclosure_packs()


@router.get("/disclosure-packs/{pack_id}", response_model=DisclosurePack)
def get_disclosure_pack(pack_id: str, req: Request):
    """Get a specific disclosure pack by ID."""
    store = req.app.state.maestro_store
    pack = store.get_disclosure_pack(pack_id)
    if not pack:
        raise HTTPException(
            status_code=404, detail=f"Disclosure pack {pack_id} not found"
        )
    return pack


# Run manifest endpoint
@router.get("/runs/{run_id}/manifest", response_model=RunManifest)
def get_run_manifest(run_id: str, req: Request):
    """
    Get a complete manifest for a run including:
    - Run details
    - All artifacts
    - Disclosure pack (if exists)
    - Compliance report
    """
    store = req.app.state.maestro_store

    # Get run
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    # Get artifacts
    artifacts = store.list_artifacts(run_id=run_id)

    # Get disclosure pack
    disclosure_pack = store.get_disclosure_pack_by_run(run_id)

    # Generate compliance report
    compliance_report = generate_compliance_report(store, run_id)

    return RunManifest(
        run=run,
        artifacts=artifacts,
        disclosure_pack=disclosure_pack,
        compliance_report=compliance_report,
    )


# Release gate check endpoint
@router.get("/runs/{run_id}/release-gate")
def check_run_release_gate(run_id: str, req: Request):
    """Check if a run passes the release gate requirements."""
    store = req.app.state.maestro_store

    result = check_release_gate(store, run_id)

    return {
        "run_id": run_id,
        "passed": result.passed,
        "message": result.message,
        "details": result.details,
    }
