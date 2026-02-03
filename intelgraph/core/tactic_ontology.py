"""
Tactic Ontology for IO (Information Operations).

Defines the core data structures for representing tactics, campaigns, and signatures.
"""

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class TacticType(str, Enum):
    """Enumeration of known IO tactics."""
    FIREHOSE = "firehose"  # Firehose of Falsehood
    REFLEXIVE_CONTROL = "reflexive_control"
    ASTROTURFING = "astroturfing"
    LAUNDERING = "laundering"  # Information Laundering
    FRONT_GROUPS = "front_groups"
    SOCKPUPPET_RING = "sockpuppet_ring"


class Signature(BaseModel):
    """
    Observable condition or pattern that indicates a tactic.
    """
    name: str
    description: str
    # conditions could be more structured, e.g., a query or a rule
    conditions: dict[str, Any] = Field(default_factory=dict)
    weight: float = 1.0  # Weight for confidence scoring


class Tactic(BaseModel):
    """
    Definition of an IO tactic.
    """
    id: str
    type: TacticType
    name: str
    description: str
    signatures: list[Signature] = Field(default_factory=list)
    mitigation_suggestions: list[str] = Field(default_factory=list)


class CampaignEvent(BaseModel):
    """
    A specific event within a campaign (e.g., a post, a claim, an interaction).
    """
    id: str
    timestamp: datetime
    type: str  # e.g., "social_post", "news_article"
    source_id: str
    content: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Campaign(BaseModel):
    """
    A container for a potential or confirmed IO campaign.
    """
    id: str
    name: str
    description: str
    start_date: datetime
    end_date: Optional[datetime] = None
    events: list[CampaignEvent] = Field(default_factory=list)
    involved_entities: list[str] = Field(default_factory=list)  # IDs of entities
    suspected_tactics: list[TacticType] = Field(default_factory=list)


class MatchedTactic(BaseModel):
    """
    Result of a tactic matching process.
    """
    tactic: Tactic
    confidence: float  # 0.0 to 1.0
    evidence: list[str] = Field(default_factory=list)  # IDs of events or nodes supporting the match
    timestamp: datetime = Field(default_factory=datetime.utcnow)
