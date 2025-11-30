"""
Domain models for IntelGraph minimal slice.

Models:
- Entity: Core nodes in the knowledge graph
- Claim: Assertions about entities with provenance
- Decision: Structured decision records with context and governance
- Source: Provenance tracking for claims and evidence
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import Field
from sqlmodel import JSON, Column, SQLModel


class PolicyOrigin(str, Enum):
    """Origin classification for governance."""

    PUBLIC = "public"
    CONFIDENTIAL = "confidential"
    SECRET = "secret"
    TOP_SECRET = "top_secret"


class PolicySensitivity(str, Enum):
    """Sensitivity classification for data handling."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PolicyLegalBasis(str, Enum):
    """Legal basis for data processing."""

    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTERESTS = "vital_interests"
    PUBLIC_TASK = "public_task"
    LEGITIMATE_INTERESTS = "legitimate_interests"


# Base models for database tables


class EntityBase(SQLModel):
    """Entity represents a node in the knowledge graph."""

    type: str = Field(description="Entity type (e.g., person, organization, event)")
    labels: str = Field(
        default="[]", description="JSON array of labels/tags for classification"
    )


class Entity(EntityBase, table=True):
    """Entity table model."""

    __tablename__ = "entities"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ClaimBase(SQLModel):
    """Claim represents an assertion about an entity."""

    entity_id: int = Field(foreign_key="entities.id", description="Related entity ID")
    predicate: str = Field(description="The claim predicate (e.g., 'works_at', 'located_in')")
    value: str = Field(description="The claim value/object")
    source_ids: str = Field(
        default="[]", description="JSON array of source IDs supporting this claim"
    )
    policy_labels: str = Field(
        default='{"origin": "public", "sensitivity": "low", "legal_basis": "consent"}',
        sa_column=Column(JSON),
        description="Governance policy labels (origin, sensitivity, legal_basis)",
    )


class Claim(ClaimBase, table=True):
    """Claim table model."""

    __tablename__ = "claims"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DecisionBase(SQLModel):
    """Decision represents a structured decision record."""

    title: str = Field(description="Decision title/summary")
    context: str = Field(description="Context and background for the decision")
    options: str = Field(
        default="[]",
        sa_column=Column(JSON),
        description="JSON array of options considered",
    )
    decision: str = Field(description="The actual decision made")
    reversible_flag: bool = Field(
        default=True, description="Whether this decision is reversible"
    )
    owners: str = Field(
        default="[]",
        sa_column=Column(JSON),
        description="JSON array of decision owners/stakeholders",
    )
    checks: str = Field(
        default="[]",
        sa_column=Column(JSON),
        description="JSON array of validation checks or risks",
    )
    related_claim_ids: str = Field(
        default="[]",
        description="JSON array of claim IDs that informed this decision",
    )


class Decision(DecisionBase, table=True):
    """Decision table model."""

    __tablename__ = "decisions"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SourceBase(SQLModel):
    """Source represents provenance for claims and evidence."""

    uri_or_hash: str = Field(
        description="URI, hash, or identifier for the source material"
    )
    origin: str = Field(
        default=PolicyOrigin.PUBLIC.value,
        description="Classification origin (public, confidential, etc.)",
    )
    sensitivity: str = Field(
        default=PolicySensitivity.LOW.value,
        description="Sensitivity level (low, medium, high, critical)",
    )
    legal_basis: str = Field(
        default=PolicyLegalBasis.CONSENT.value,
        description="Legal basis for processing this source",
    )


class Source(SourceBase, table=True):
    """Source table model."""

    __tablename__ = "sources"

    id: Optional[int] = Field(default=None, primary_key=True)
    ingested_at: datetime = Field(default_factory=datetime.utcnow)


# Response models for API


class EntityRead(EntityBase):
    """Entity response model."""

    id: int
    created_at: datetime
    updated_at: datetime


class ClaimRead(ClaimBase):
    """Claim response model."""

    id: int
    created_at: datetime


class DecisionRead(DecisionBase):
    """Decision response model."""

    id: int
    created_at: datetime


class SourceRead(SourceBase):
    """Source response model."""

    id: int
    ingested_at: datetime
