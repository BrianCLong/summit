import pytest
from summit.counterintelligence.adversarial_graph_asset import (
    AdversarialGraphAsset,
    AdversarialRelationObservation,
    EngagementState,
    InteractionEvent,
    InteractionEventType,
)


def test_adversarial_graph_asset_creation():
    asset = AdversarialGraphAsset(
        id="node-123",
        node_type="account",
        engagement_state=EngagementState.UNKNOWN,
        graph_node_ids=["node-123"],
        community_ids=["comm-1"],
        provenance={"source": "telegram_feed_01"},
    )
    assert asset.id == "node-123"
    assert asset.engagement_state == EngagementState.UNKNOWN
    assert "source" in asset.provenance


def test_engagement_state_transitions():
    # Model is frozen dataclass, so "transitions" means creating new instances
    initial_asset = AdversarialGraphAsset(
        id="node-123",
        node_type="account",
        engagement_state=EngagementState.SUSPECTED_POISONED_RELATION,
    )

    # Transition to TURNED_EARLY_WARNING
    turned_asset = AdversarialGraphAsset(
        id=initial_asset.id,
        node_type=initial_asset.node_type,
        engagement_state=EngagementState.TURNED_EARLY_WARNING,
    )

    assert turned_asset.engagement_state == EngagementState.TURNED_EARLY_WARNING

    # Transition to BURNED
    burned_asset = AdversarialGraphAsset(
        id=turned_asset.id,
        node_type=turned_asset.node_type,
        engagement_state=EngagementState.BURNED,
    )
    assert burned_asset.engagement_state == EngagementState.BURNED


def test_relation_observation_requirements():
    observation = AdversarialRelationObservation(
        source_node_id="node-A",
        target_node_id="node-B",
        relation_type="amplifies",
        first_seen=1704067200,
        last_seen=1704153600,
        sources=["doc-xyz"],
    )
    assert observation.source_node_id == "node-A"
    assert observation.relation_type == "amplifies"
    assert len(observation.sources) == 1


def test_interaction_event_recording():
    event = InteractionEvent(
        event_type=InteractionEventType.CENTRALITY_SPIKE,
        affected_nodes=["node-123"],
        affected_communities=["comm-1"],
        ts=1704067200,
        poisoning_impact_placeholder=0.8,
    )
    assert event.event_type == InteractionEventType.CENTRALITY_SPIKE
    assert 0.8 == event.poisoning_impact_placeholder
