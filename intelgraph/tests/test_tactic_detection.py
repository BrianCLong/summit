
from datetime import UTC, datetime, timedelta, timezone

import pytest

from intelgraph.core.tactic_ontology import Campaign, CampaignEvent, TacticType
from intelgraph.graph_analytics.core_analytics import Graph
from intelgraph.graph_analytics.tactic_matcher import TacticMatcher


def test_firehose_detection():
    # Setup
    matcher = TacticMatcher()
    graph = Graph()

    # Create a high-volume campaign
    events = []
    base_time = datetime.now(UTC)
    for i in range(100):
        events.append(CampaignEvent(
            id=f"evt-{i}",
            timestamp=base_time + timedelta(seconds=i),
            type="social_post",
            source_id="source-1"
        ))

    campaign = Campaign(
        id="camp-1",
        name="Firehose Test",
        description="Testing firehose detection",
        start_date=base_time,
        end_date=base_time + timedelta(seconds=100),
        events=events
    )

    # Execute
    matches = matcher.match(campaign, graph)

    # Verify
    firehose_match = next((m for m in matches if m.tactic.type == TacticType.FIREHOSE), None)
    assert firehose_match is not None
    assert firehose_match.confidence > 0.8
    assert "High frequency" in firehose_match.evidence[0]

def test_sockpuppet_ring_detection():
    # Setup
    matcher = TacticMatcher()
    graph = Graph()

    # Create a connected ring of actors
    actors = ["actor-1", "actor-2", "actor-3", "actor-4"]
    for i in range(len(actors)):
        for j in range(i + 1, len(actors)):
            graph.add_edge(actors[i], actors[j])

    events = []
    base_time = datetime.now(UTC)
    for actor in actors:
        events.append(CampaignEvent(
            id=f"evt-{actor}",
            timestamp=base_time,
            type="social_post",
            source_id=actor
        ))

    campaign = Campaign(
        id="camp-2",
        name="Sockpuppet Test",
        description="Testing sockpuppet detection",
        start_date=base_time,
        events=events
    )

    # Execute
    matches = matcher.match(campaign, graph)

    # Verify
    sockpuppet_match = next((m for m in matches if m.tactic.type == TacticType.SOCKPUPPET_RING), None)
    assert sockpuppet_match is not None
    assert sockpuppet_match.confidence > 0.8
    assert "High network density" in sockpuppet_match.evidence[0]

def test_reflexive_control_detection():
    # Setup
    matcher = TacticMatcher()
    graph = Graph()

    events = []
    base_time = datetime.now(UTC)
    for i in range(10):
        events.append(CampaignEvent(
            id=f"evt-{i}",
            timestamp=base_time,
            type="news_article",
            source_id="source-1",
            metadata={"sentiment": "high_negative"}
        ))

    campaign = Campaign(
        id="camp-3",
        name="Reflexive Control Test",
        description="Testing reflexive control detection",
        start_date=base_time,
        events=events
    )

    # Execute
    matches = matcher.match(campaign, graph)

    # Verify
    rc_match = next((m for m in matches if m.tactic.type == TacticType.REFLEXIVE_CONTROL), None)
    assert rc_match is not None
    assert rc_match.confidence > 0.6
    assert "Dominance of high-negative sentiment" in rc_match.evidence[0]

def test_laundering_detection():
    # Setup
    matcher = TacticMatcher()
    graph = Graph()

    # Create chain A -> B -> C
    graph.add_edge("source-A", "proxy-B")
    graph.add_edge("proxy-B", "mainstream-C")

    # But NOT A -> C (linear chain)

    events = []
    base_time = datetime.now(UTC)
    for actor in ["source-A", "proxy-B", "mainstream-C"]:
        events.append(CampaignEvent(
            id=f"evt-{actor}",
            timestamp=base_time,
            type="article",
            source_id=actor
        ))

    campaign = Campaign(
        id="camp-4",
        name="Laundering Test",
        description="Testing laundering detection",
        start_date=base_time,
        events=events
    )

    # Execute
    matches = matcher.match(campaign, graph)

    # Verify
    laundering_match = next((m for m in matches if m.tactic.type == TacticType.LAUNDERING), None)
    assert laundering_match is not None
    assert laundering_match.confidence > 0.5
    assert "Potential laundering chain" in laundering_match.evidence[0]

def test_front_group_detection():
    # Setup
    matcher = TacticMatcher()
    graph = Graph()

    # Create a bridge node (Front Group) connecting two disconnected clusters
    # Cluster 1: N1, N2 (Radical)
    graph.add_edge("N1", "N2")
    # Cluster 2: M1, M2 (Mainstream)
    graph.add_edge("M1", "M2")

    # Bridge: FG connects to N1 and M1
    graph.add_edge("FG", "N1")
    graph.add_edge("FG", "M1")

    # Set attributes
    graph.add_node("FG", attributes={"transparency": 0.1})

    events = [CampaignEvent(id="evt-FG", timestamp=datetime.now(UTC), type="post", source_id="FG")]

    campaign = Campaign(
        id="camp-5",
        name="Front Group Test",
        description="Testing front group detection",
        start_date=datetime.now(UTC),
        events=events
    )

    # Execute
    matches = matcher.match(campaign, graph)

    # Verify
    fg_match = next((m for m in matches if m.tactic.type == TacticType.FRONT_GROUPS), None)
    assert fg_match is not None
    assert fg_match.confidence > 0.7
    assert "Opaque bridge node" in fg_match.evidence[0]

def test_astroturfing_detection():
    # Setup
    matcher = TacticMatcher()
    graph = Graph()

    # Create coordinated burst
    events = []
    base_time = datetime.now(UTC)

    # 10 actors posting at almost exactly the same time
    for i in range(10):
        events.append(CampaignEvent(
            id=f"evt-{i}",
            timestamp=base_time + timedelta(seconds=1), # All within 1 second offset from base
            type="tweet",
            source_id=f"bot-{i}"
        ))

    campaign = Campaign(
        id="camp-6",
        name="Astroturf Test",
        description="Testing astroturfing detection",
        start_date=base_time,
        events=events
    )

    # Execute
    matches = matcher.match(campaign, graph)

    # Verify
    astro_match = next((m for m in matches if m.tactic.type == TacticType.ASTROTURFING), None)
    assert astro_match is not None
    assert astro_match.confidence > 0.6
    assert "temporal coordination" in astro_match.evidence[0]
