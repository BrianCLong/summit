"""
Maestro API router for run tracking, artifacts, and disclosure packs.

This router provides endpoints to:
- Create and list runs
- Attach artifacts to runs
- Create disclosure packs
- Fetch run manifests with governance checks
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request

from ..models.maestro import (
    Artifact,
    ArtifactMetadata,
    CreateArtifactRequest,
    CreateDisclosurePackRequest,
    CreateRunRequest,
    DisclosurePack,
    Run,
    RunManifest,
    RunStatus,
    UpdateRunRequest,
)
from ..services.maestro_checks import check_release_gate, summarize_run_artifacts

router = APIRouter(prefix="/maestro", tags=["maestro"])


# In-memory storage (will be replaced with proper DB later)
runs_db: dict[str, Run] = {}
artifacts_db: dict[str, Artifact] = {}
disclosure_packs_db: dict[str, DisclosurePack] = {}


@router.post("/runs", response_model=Run)
def create_run(req: CreateRunRequest) -> Run:
    """
    Create a new Maestro run.

    Args:
        req: Run creation request with name, owner, and optional metadata

    Returns:
        The created run
    """
    run_id = str(uuid4())
    run = Run(
        id=run_id,
        name=req.name,
        owner=req.owner,
        started_at=datetime.utcnow(),
        status=RunStatus.PENDING,
        cost_estimate=req.cost_estimate,
        related_entity_ids=req.related_entity_ids,
        related_decision_ids=req.related_decision_ids,
    )
    runs_db[run_id] = run
    return run


@router.get("/runs", response_model=list[Run])
def list_runs(
    owner: Optional[str] = None,
    status: Optional[RunStatus] = None,
    limit: int = 100,
) -> list[Run]:
    """
    List Maestro runs with optional filtering.

    Args:
        owner: Filter by run owner
        status: Filter by run status
        limit: Maximum number of runs to return

    Returns:
        List of runs matching the filters
    """
    runs = list(runs_db.values())

    if owner:
        runs = [r for r in runs if r.owner == owner]

    if status:
        runs = [r for r in runs if r.status == status]

    # Sort by created_at descending
    runs.sort(key=lambda r: r.created_at, reverse=True)

    return runs[:limit]


@router.get("/runs/{run_id}", response_model=Run)
def get_run(run_id: str) -> Run:
    """
    Get a specific run by ID.

    Args:
        run_id: The run ID

    Returns:
        The run

    Raises:
        HTTPException: If run not found
    """
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")
    return runs_db[run_id]


@router.patch("/runs/{run_id}", response_model=Run)
def update_run(run_id: str, req: UpdateRunRequest) -> Run:
    """
    Update a run's status or completion.

    Args:
        run_id: The run ID
        req: Update request

    Returns:
        The updated run

    Raises:
        HTTPException: If run not found
    """
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    run = runs_db[run_id]

    if req.status is not None:
        run.status = req.status

    if req.finished_at is not None:
        run.finished_at = req.finished_at

    if req.cost_actual is not None:
        run.cost_actual = req.cost_actual

    runs_db[run_id] = run
    return run


@router.post("/artifacts", response_model=Artifact)
def create_artifact(req: CreateArtifactRequest) -> Artifact:
    """
    Attach an artifact to a run.

    Args:
        req: Artifact creation request

    Returns:
        The created artifact

    Raises:
        HTTPException: If run not found
    """
    if req.run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    artifact_id = str(uuid4())
    artifact = Artifact(
        id=artifact_id,
        run_id=req.run_id,
        kind=req.kind,
        path_or_uri=req.path_or_uri,
        content_hash=req.content_hash,
        metadata_json=req.metadata_json or ArtifactMetadata(),
    )
    artifacts_db[artifact_id] = artifact
    return artifact


@router.get("/runs/{run_id}/artifacts", response_model=list[Artifact])
def list_artifacts(run_id: str) -> list[Artifact]:
    """
    List all artifacts for a run.

    Args:
        run_id: The run ID

    Returns:
        List of artifacts

    Raises:
        HTTPException: If run not found
    """
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    artifacts = [a for a in artifacts_db.values() if a.run_id == run_id]
    artifacts.sort(key=lambda a: a.created_at)
    return artifacts


@router.post("/disclosure-packs", response_model=DisclosurePack)
def create_disclosure_pack(req: CreateDisclosurePackRequest) -> DisclosurePack:
    """
    Create a disclosure pack for a run.

    Args:
        req: Disclosure pack creation request

    Returns:
        The created disclosure pack

    Raises:
        HTTPException: If run not found or artifacts don't belong to run
    """
    if req.run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    # Validate all artifact IDs exist and belong to this run
    for artifact_id in req.artifact_ids:
        if artifact_id not in artifacts_db:
            raise HTTPException(
                status_code=404, detail=f"Artifact {artifact_id} not found"
            )
        if artifacts_db[artifact_id].run_id != req.run_id:
            raise HTTPException(
                status_code=400,
                detail=f"Artifact {artifact_id} does not belong to run {req.run_id}",
            )

    pack_id = str(uuid4())
    pack = DisclosurePack(
        id=pack_id,
        run_id=req.run_id,
        summary=req.summary,
        artifact_ids=req.artifact_ids,
    )
    disclosure_packs_db[pack_id] = pack
    return pack


@router.get("/runs/{run_id}/disclosure-pack", response_model=Optional[DisclosurePack])
def get_disclosure_pack(run_id: str) -> Optional[DisclosurePack]:
    """
    Get the disclosure pack for a run.

    Args:
        run_id: The run ID

    Returns:
        The disclosure pack if it exists, None otherwise

    Raises:
        HTTPException: If run not found
    """
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    # Find disclosure pack for this run
    for pack in disclosure_packs_db.values():
        if pack.run_id == run_id:
            return pack

    return None


@router.get("/runs/{run_id}/manifest", response_model=RunManifest)
def get_run_manifest(run_id: str) -> RunManifest:
    """
    Get complete run manifest with artifacts, disclosure pack, and governance status.

    This is the primary endpoint for checking if a run meets release gate requirements.

    Args:
        run_id: The run ID

    Returns:
        Complete run manifest with release gate status

    Raises:
        HTTPException: If run not found
    """
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    run = runs_db[run_id]

    # Get all artifacts for this run
    artifacts = [a for a in artifacts_db.values() if a.run_id == run_id]
    artifacts.sort(key=lambda a: a.created_at)

    # Get disclosure pack if exists
    disclosure_pack = None
    for pack in disclosure_packs_db.values():
        if pack.run_id == run_id:
            disclosure_pack = pack
            break

    # Check release gate
    passed, details = check_release_gate(run, artifacts)

    return RunManifest(
        run=run,
        artifacts=artifacts,
        disclosure_pack=disclosure_pack,
        release_gate_passed=passed,
    )


@router.get("/runs/{run_id}/summary")
def get_run_summary(run_id: str) -> dict:
    """
    Get a summary of a run's artifacts and governance status.

    Args:
        run_id: The run ID

    Returns:
        Summary dictionary with artifact counts and governance status

    Raises:
        HTTPException: If run not found
    """
    if run_id not in runs_db:
        raise HTTPException(status_code=404, detail="Run not found")

    run = runs_db[run_id]
    artifacts = [a for a in artifacts_db.values() if a.run_id == run_id]

    passed, gate_details = check_release_gate(run, artifacts)
    artifact_summary = summarize_run_artifacts(artifacts)

    return {
        "run_id": run_id,
        "run_name": run.name,
        "run_status": run.status,
        "owner": run.owner,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "release_gate": gate_details,
        "artifacts": artifact_summary,
    }


@router.get("/health")
def health() -> dict:
    """Health check endpoint for Maestro subsystem."""
    return {
        "status": "healthy",
        "runs_count": len(runs_db),
        "artifacts_count": len(artifacts_db),
        "disclosure_packs_count": len(disclosure_packs_db),
    }
