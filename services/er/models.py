"""Domain and API models for the entity-resolution service."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, conlist


class Policy(BaseModel):
    """Policy metadata that must accompany every merge decision."""

    sensitivity: str
    legal_basis: str
    retention: str
    tags: list[str] = Field(default_factory=list, description="Policy control tags applied at merge time")


class Entity(BaseModel):
    """Simplified entity representation supplied by upstream services."""

    id: str
    type: str
    name: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    policy: Policy


class CandidateRequest(BaseModel):
    records: conlist(Entity, min_length=1)
    threshold: float = Field(0.5, ge=0.0, le=1.0)


class FeatureAttribution(BaseModel):
    feature: str
    value: float
    weight: float
    contribution: float


class CandidatePair(BaseModel):
    pair_id: str
    entity_id_a: str
    entity_id_b: str
    score: float
    features: dict[str, float]
    top_features: list[FeatureAttribution]


class CandidatesResponse(BaseModel):
    candidates: list[CandidatePair]
    comparisons: int


class MergeRequest(BaseModel):
    entity_ids: conlist(str, min_length=2)
    policy: Policy
    who: str
    why: str
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    human_overrides: dict[str, float] | None = Field(default=None, description="Optional human supplied feature weight overrides")


class MergeScorecard(BaseModel):
    pair_id: str
    score: float
    top_features: list[FeatureAttribution]
    rationale: str


class MergeResponse(BaseModel):
    merge_id: str
    confidence: float
    decayed_confidence: float
    scorecard: MergeScorecard


class SplitRequest(BaseModel):
    merge_id: str
    who: str
    why: str


class SplitResponse(BaseModel):
    merge_id: str
    status: str


class ExplainResponse(BaseModel):
    pair_id: str
    score: float
    features: dict[str, float]
    weights: dict[str, float]
    human_overrides: dict[str, float] | None
    top_features: list[FeatureAttribution]


class AuditEvent(BaseModel):
    event_id: str
    action: str
    timestamp: datetime
    actor: str
    details: dict[str, Any]


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_version: str
    redis_mode: str
    database_url: Optional[HttpUrl | str]


class MigrationState(BaseModel):
    version: str
    applied_at: datetime
