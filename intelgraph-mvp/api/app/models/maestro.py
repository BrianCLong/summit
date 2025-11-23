"""
Maestro domain models for run tracking, artifacts, and disclosure packs.

This module provides the data models for the Maestro subsystem, which tracks
execution runs, their artifacts, and disclosure packs for governance and compliance.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    """Status of a Maestro run."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ArtifactKind(str, Enum):
    """Type of artifact produced by a run."""

    SBOM = "sbom"
    SLSA_PROVENANCE = "slsa_provenance"
    RISK_ASSESSMENT = "risk_assessment"
    DISCLOSURE_PACK = "disclosure_pack"
    LOG = "log"
    REPORT = "report"
    DATA = "data"
    OTHER = "other"


class ArtifactMetadata(BaseModel):
    """Metadata for artifact governance checks."""

    sbom_present: bool = False
    slsa_provenance_present: bool = False
    risk_assessment_present: bool = False
    additional_data: dict[str, Any] = Field(default_factory=dict)


class Run(BaseModel):
    """
    A Maestro run represents a tracked execution that produces artifacts.

    Runs can be linked to IntelGraph entities and decisions for traceability.
    """

    id: str
    name: str
    owner: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: RunStatus = RunStatus.PENDING
    cost_estimate: Optional[float] = None
    cost_actual: Optional[float] = None
    related_entity_ids: list[str] = Field(default_factory=list)
    related_decision_ids: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Artifact(BaseModel):
    """
    An artifact is a traceable output from a Maestro run.

    Artifacts include SBOMs, SLSA provenance, risk assessments, and other outputs.
    """

    id: str
    run_id: str
    kind: ArtifactKind
    path_or_uri: str
    content_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata_json: ArtifactMetadata = Field(default_factory=ArtifactMetadata)


class DisclosurePack(BaseModel):
    """
    A disclosure pack summarizes a run and bundles its artifacts for governance review.

    Disclosure packs are the primary artifact for release gates and compliance checks.
    """

    id: str
    run_id: str
    summary: str
    artifact_ids: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Request/Response models for API


class CreateRunRequest(BaseModel):
    """Request to create a new Maestro run."""

    name: str
    owner: str
    cost_estimate: Optional[float] = None
    related_entity_ids: list[str] = Field(default_factory=list)
    related_decision_ids: list[str] = Field(default_factory=list)


class UpdateRunRequest(BaseModel):
    """Request to update a run's status or completion."""

    status: Optional[RunStatus] = None
    finished_at: Optional[datetime] = None
    cost_actual: Optional[float] = None


class CreateArtifactRequest(BaseModel):
    """Request to attach an artifact to a run."""

    run_id: str
    kind: ArtifactKind
    path_or_uri: str
    content_hash: str
    metadata_json: Optional[ArtifactMetadata] = None


class CreateDisclosurePackRequest(BaseModel):
    """Request to create a disclosure pack for a run."""

    run_id: str
    summary: str
    artifact_ids: list[str] = Field(default_factory=list)


class RunManifest(BaseModel):
    """Complete manifest of a run with artifacts and disclosure pack."""

    run: Run
    artifacts: list[Artifact] = Field(default_factory=list)
    disclosure_pack: Optional[DisclosurePack] = None
    release_gate_passed: bool = False
