"""
Canonical data-plane models, aligned with schemas/data-spine/events/base-envelope.schema.json.

Every event that flows through the data plane MUST be wrapped in a CanonicalEvent.
Nothing reaches the knowledge graph or evidence layer without passing through this envelope.
"""
from __future__ import annotations

import hashlib
import re
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Event types – loosely mirrors the data-spine convention: domain.noun.v1
# ---------------------------------------------------------------------------
class EventType(str, Enum):
    # Source-control signals
    REPO_CREATED = "repo.created.v1"
    REPO_PUSHED = "repo.pushed.v1"
    PR_OPENED = "pr.opened.v1"
    PR_MERGED = "pr.merged.v1"
    PR_CLOSED = "pr.closed.v1"
    ISSUE_OPENED = "issue.opened.v1"
    ISSUE_CLOSED = "issue.closed.v1"
    # CI/CD
    CI_RUN_STARTED = "ci.run.started.v1"
    CI_RUN_COMPLETED = "ci.run.completed.v1"
    CI_RUN_FAILED = "ci.run.failed.v1"
    # Generic / passthrough
    GENERIC = "generic.event.v1"


class EntityType(str, Enum):
    PERSON = "person"
    ORGANIZATION = "organization"
    REPOSITORY = "repository"
    PULL_REQUEST = "pull_request"
    ISSUE = "issue"
    CI_RUN = "ci_run"
    ARTIFACT = "artifact"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Canonical event envelope – every field maps to base-envelope.schema.json
# ---------------------------------------------------------------------------
class CanonicalEvent(BaseModel):
    """
    Stable envelope for all events flowing through the Summit data plane.
    Schema: schemas/data-spine/events/base-envelope.schema.json
    """

    model_config = ConfigDict(populate_by_name=True)

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str = Field(
        description="Fully-qualified event type, e.g. pr.opened.v1",
        pattern=r"^[a-z0-9_.]+\.v[0-9]+$",
    )
    event_version: str = Field(default="v1", pattern=r"^v[0-9]+$")
    occurred_at: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="ISO-8601 timestamp when the source action happened",
    )
    recorded_at: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="ISO-8601 timestamp when the data plane recorded this event",
    )
    tenant_id: str
    subject_id: str | None = None
    source_service: str = Field(description="Canonical name of the producing service")
    trace_id: str | None = None
    correlation_id: str | None = None
    region: str | None = None
    data: dict[str, Any] = Field(description="Event-specific payload")

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9_.]+\.v[0-9]+$", v):
            raise ValueError(
                f"event_type must match pattern ^[a-z0-9_.]+\\.v[0-9]+$, got: {v}"
            )
        return v

    def content_hash(self) -> str:
        """Deterministic SHA-256 over (event_type, occurred_at, data) – used for dedup."""
        payload = f"{self.event_type}|{self.occurred_at}|{sorted(self.data.items())}"
        return hashlib.sha256(payload.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Entity – a resolved, canonical representation of a real-world subject
# ---------------------------------------------------------------------------
class CanonicalEntity(BaseModel):
    """Resolved entity after identity stitching."""

    entity_id: str = Field(default_factory=lambda: str(uuid4()))
    entity_type: EntityType
    canonical_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    # All source IDs that were merged into this entity
    source_ids: list[str] = Field(default_factory=list)
    # Merged attributes from all sources
    attributes: dict[str, Any] = Field(default_factory=dict)
    evidence_ids: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


# ---------------------------------------------------------------------------
# Pipeline run – tracks a single end-to-end pipeline execution
# ---------------------------------------------------------------------------
class PipelineStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class PipelineRun(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    connector: str
    config: dict[str, Any] = Field(default_factory=dict)
    status: PipelineStatus = PipelineStatus.PENDING
    events_ingested: int = 0
    entities_resolved: int = 0
    evidence_ids: list[str] = Field(default_factory=list)
    error: str | None = None
    started_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    completed_at: str | None = None


# ---------------------------------------------------------------------------
# Query request / response
# ---------------------------------------------------------------------------
class EntityQuery(BaseModel):
    entity_type: EntityType | None = None
    name_contains: str | None = None
    limit: int = Field(default=20, ge=1, le=200)


class EntityQueryResponse(BaseModel):
    entities: list[CanonicalEntity]
    total: int
