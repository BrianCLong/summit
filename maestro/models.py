"""Maestro domain models for Runs, Artifacts, and Disclosure Packs."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    """Status of a run."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ArtifactKind(str, Enum):
    """Type of artifact."""

    SBOM = "sbom"
    SLSA_PROVENANCE = "slsa_provenance"
    RISK_ASSESSMENT = "risk_assessment"
    BUILD_LOG = "build_log"
    TEST_REPORT = "test_report"
    OTHER = "other"


class Run(BaseModel):
    """A Maestro run tracking computation or workflow execution."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(..., description="Human-readable name for the run")
    owner: str = Field(..., description="User or service that initiated the run")
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
    status: RunStatus = Field(default=RunStatus.PENDING)
    cost_estimate: float | None = Field(
        None, description="Estimated cost in dollars", ge=0
    )
    cost_actual: float | None = Field(None, description="Actual cost in dollars", ge=0)
    related_entity_ids: list[str] = Field(
        default_factory=list,
        description="References to IntelGraph entities (UUID strings)",
    )
    related_decision_ids: list[str] = Field(
        default_factory=list,
        description="References to IntelGraph decisions (UUID strings)",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional run metadata"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Build and analyze entity network",
                "owner": "analyst@example.com",
                "status": "succeeded",
                "cost_estimate": 5.00,
                "cost_actual": 4.73,
                "related_entity_ids": ["e123", "e456"],
                "related_decision_ids": ["d789"],
            }
        }


class ArtifactMetadata(BaseModel):
    """Metadata about an artifact's governance compliance."""

    sbom_present: bool = Field(
        default=False, description="Whether SBOM data is included"
    )
    slsa_provenance_present: bool = Field(
        default=False, description="Whether SLSA provenance is included"
    )
    risk_assessment_present: bool = Field(
        default=False, description="Whether risk assessment is included"
    )
    additional_metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional metadata fields"
    )


class Artifact(BaseModel):
    """An artifact produced or consumed by a run."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str = Field(..., description="ID of the run that produced this artifact")
    kind: ArtifactKind = Field(..., description="Type of artifact")
    path_or_uri: str = Field(
        ..., description="File path, S3 URI, or other location identifier"
    )
    content_hash: str | None = Field(
        None, description="SHA256 or other hash of the artifact content"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata_json: ArtifactMetadata = Field(
        default_factory=ArtifactMetadata, description="Governance metadata"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "abc123",
                "kind": "sbom",
                "path_or_uri": "s3://artifacts/run-abc123/sbom.json",
                "content_hash": "sha256:abcdef123456",
                "metadata_json": {
                    "sbom_present": True,
                    "slsa_provenance_present": False,
                    "risk_assessment_present": False,
                },
            }
        }


class DisclosurePack(BaseModel):
    """A disclosure pack summarizing a run and its artifacts."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str = Field(..., description="ID of the run this pack describes")
    summary: str = Field(..., description="Human-readable summary of the run")
    artifact_ids: list[str] = Field(
        default_factory=list, description="IDs of artifacts included in this pack"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional pack metadata"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "run_id": "abc123",
                "summary": "Entity network analysis completed with SBOM and risk assessment",
                "artifact_ids": ["art1", "art2", "art3"],
            }
        }
