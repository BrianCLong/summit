from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class EngagementState(str, Enum):
    """
    Lifecycle and engagement state for adversarial assets in the graph.
    Aligned to defensive use cases: monitoring and early warning.
    """

    UNKNOWN = "UNKNOWN"
    SUSPECTED_POISONED_RELATION = "SUSPECTED_POISONED_RELATION"
    CONFIRMED_ADVERSARIAL_ASSET = "CONFIRMED_ADVERSARIAL_ASSET"
    MONITORED_SENSOR = "MONITORED_SENSOR"
    TURNED_EARLY_WARNING = "TURNED_EARLY_WARNING"
    BURNED = "BURNED"


class InteractionEventType(str, Enum):
    """Event types tailored to graph context and poisoning risks."""

    NEW_RELATION_ADDED = "NEW_RELATION_ADDED"
    COMMUNITY_SHIFT = "COMMUNITY_SHIFT"
    CENTRALITY_SPIKE = "CENTRALITY_SPIKE"
    CROSS_DOMAIN_LINK = "CROSS_DOMAIN_LINK"
    NARRATIVE_PIVOT = "NARRATIVE_PIVOT"


@dataclass(frozen=True)
class AdversarialGraphAsset:
    """
    Domain model for an adversarial asset mapped to the narrative graph.
    Focuses on defensive monitoring and poisoning risk assessment.
    """

    id: str  # Stable ID (e.g., node ID, external account ID)
    node_type: str  # account, outlet, narrative, campaign, infrastructure node
    engagement_state: EngagementState = EngagementState.UNKNOWN
    graph_node_ids: list[str] = field(default_factory=list)
    community_ids: list[str] = field(default_factory=list)
    provenance: dict[str, Any] = field(default_factory=dict)  # input corpus, channel, time range
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AdversarialRelationObservation:
    """
    Observation of a specific relation in the graph suspected of poisoning.
    """

    source_node_id: str
    target_node_id: str
    relation_type: str  # supports, contradicts, amplifies, shares_audience_with, co-occurs_with
    first_seen: int  # timestamp
    last_seen: int  # timestamp
    sources: list[str]  # documents, platforms
    confidence: float = 0.5  # Placeholder for poisoning confidence
    suspicion_score: float = 0.0  # Placeholder for suspicion/risk score


@dataclass(frozen=True)
class InteractionEvent:
    """
    Record of an event affecting nodes or communities, tracking poisoning impact.
    """

    event_type: InteractionEventType
    affected_nodes: list[str]
    affected_communities: list[str]
    ts: int
    poisoning_impact_placeholder: float = 0.0
    details: dict[str, Any] = field(default_factory=dict)
