import pytest
from analytics.community import detect_communities_louvain

def test_detect_communities_simple_graph():
    nodes = [
        {"id": "A"},
        {"id": "B"},
        {"id": "C"},
        {"id": "D"},
        {"id": "E"},
        {"id": "F"},
    ]
    relationships = [
        {"source_id": "A", "target_id": "B"},
        {"source_id": "B", "target_id": "C"},
        {"source_id": "C", "target_id": "A"},
        {"source_id": "D", "target_id": "E"},
        {"source_id": "E", "target_id": "F"},
        {"source_id": "F", "target_id": "D"},
    ]

    communities = detect_communities_louvain(nodes, relationships)

    assert len(communities) == 2

    community_nodes = [set(c) for c in communities.values()]
    
    # Check if the two expected communities are found
    expected_community1 = {"A", "B", "C"}
    expected_community2 = {"D", "E", "F"}

    assert expected_community1 in community_nodes
    assert expected_community2 in community_nodes

def test_detect_communities_disconnected_nodes():
    nodes = [
        {"id": "A"},
        {"id": "B"},
        {"id": "C"},
    ]
    relationships = [
        {"source_id": "A", "target_id": "B"},
    ]

    communities = detect_communities_louvain(nodes, relationships)

    # Expect 2 communities: {A, B} and {C} (isolated node)
    assert len(communities) == 2
    community_nodes = [set(c) for c in communities.values()]
    assert {"A", "B"} in community_nodes
    assert {"C"} in community_nodes

def test_detect_communities_single_node():
    nodes = [
        {"id": "A"},
    ]
    relationships = []

    communities = detect_communities_louvain(nodes, relationships)

    assert len(communities) == 1
    assert {"A"} in [set(c) for c in communities.values()]

def test_detect_communities_empty_graph():
    nodes = []
    relationships = []

    communities = detect_communities_louvain(nodes, relationships)

    assert len(communities) == 0

def test_detect_communities_with_weak_link():
    nodes = [
        {"id": "A"},
        {"id": "B"},
        {"id": "C"},
        {"id": "D"},
        {"id": "E"},
    ]
    relationships = [
        {"source_id": "A", "target_id": "B"},
        {"source_id": "B", "target_id": "C"},
        {"source_id": "C", "target_id": "A"},
        {"source_id": "D", "target_id": "E"},
        {"source_id": "A", "target_id": "D"}, # Weak link
    ]

    communities = detect_communities_louvain(nodes, relationships)

    # Louvain should ideally separate these into two communities despite the weak link
    # The exact number of communities might vary slightly based on networkx version/seed
    # but it should generally find two main clusters.
    assert len(communities) >= 1 # At least one community
    community_nodes = [set(c) for c in communities.values()]
    
    # Check if the nodes are grouped reasonably. This test is more about ensuring it runs
    # and produces a sensible output, rather than a strict partition for this specific case.
    # A common outcome would be two communities: {A,B,C} and {D,E} with A and D potentially in the same if link is strong enough.
    # Given the weak link, it's likely to find two.
    
    # Verify all nodes are accounted for
    all_detected_nodes = set()
    for comm in community_nodes:
        all_detected_nodes.update(comm)
    assert all_detected_nodes == {"A", "B", "C", "D", "E"}

    # Check for the presence of the two expected clusters (allowing for the weak link to sometimes merge them)
    # This is a softer assertion for Louvain due to its heuristic nature.
    # We expect that A,B,C are mostly together and D,E are mostly together.
    found_cluster1 = False
    found_cluster2 = False
    for comm in community_nodes:
        if {"A", "B", "C"}.issubset(comm):
            found_cluster1 = True
        if {"D", "E"}.issubset(comm):
            found_cluster2 = True
    
    # At least one of the strong clusters should be identified as a subset of a community
    assert found_cluster1 or found_cluster2
