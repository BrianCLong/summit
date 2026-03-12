import pytest
import json
import os
from pathlib import Path

from summit.influence.narrative_graph import NarrativeGraph
from summit.influence.hybrid_correlation import correlate_events
from summit.influence.coordination_detector import detect_coordination
from summit.influence.llm_monitor import analyze_narrative_overlap

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "narrative"

@pytest.fixture
def documents_data():
    with open(FIXTURES_DIR / "documents.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def events_data():
    with open(FIXTURES_DIR / "events.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def narratives_data():
    with open(FIXTURES_DIR / "narratives.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def sample_claims():
    with open(FIXTURES_DIR / "sample_claims.json", "r", encoding="utf-8") as f:
        return json.load(f)

@pytest.fixture
def sample_amplification():
    with open(FIXTURES_DIR / "sample_amplification.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_narrative_graph_cluster_detection(documents_data):
    """
    Tests NarrativeGraph.link_similarity to ensure it clusters similar documents/claims.
    """
    graph = NarrativeGraph()
    for doc in documents_data:
        graph.add_document(doc["doc_id"], doc["tokens"])

    graph.link_similarity(threshold=0.4)
    graph.link_similarity(threshold=0.2)
    edges = graph.edges
    assert len(edges) > 0
    linked_1_2 = any((e[0] == "doc_1" and e[1] == "doc_2") or (e[0] == "doc_2" and e[1] == "doc_1") for e in edges)
    assert linked_1_2, "Expected doc_1 and doc_2 to be linked in the narrative graph"

def test_hybrid_correlation_narrative_spikes(events_data):
    """
    Tests correlate_events to link physical/sabotage events with info/narrative spikes.
    """
    sabotage_events = events_data["sabotage_events"]
    info_events = events_data["info_events"]
    correlations = correlate_events(sabotage_events, info_events, time_window_hours=24)
    assert len(correlations) > 0
    sab_1_corr = next((c for c in correlations if c["sabotage_event"] == "sab_1"), None)
    assert sab_1_corr is not None
    assert "info_1" in sab_1_corr["related_info_events"]
    assert "info_2" in sab_1_corr["related_info_events"]
    assert sab_1_corr["correlation_score"] == 2

def test_coordination_detector_amplification(events_data):
    """
    Tests detect_coordination to identify synchronized narrative bursts / amplification.
    """
    user_events = events_data["user_events"]
    campaigns = detect_coordination(user_events, threshold=3)
    assert len(campaigns) == 1
    assert campaigns[0]["narrative"] == "election fraud"
    assert campaigns[0]["score"] == 1.0

def test_llm_monitor_narrative_overlap(narratives_data):
    """
    Tests analyze_narrative_overlap for counter-narrative / narrative identification.
    """
    response_text = "It is unfortunate that people think the election was rigged, but the real issue is that vaccines contain microchips!"
    result = analyze_narrative_overlap(response_text, narratives_data)
    matched = result["matched_narratives"]
    assert len(matched) == 2
    assert "the election was rigged" in matched
    assert "vaccines contain microchips" in matched
    assert "climate change is a hoax" not in matched
    assert abs(result["overlap_score"] - (2 / 3)) < 0.001

@pytest.mark.skip(reason="Not implemented in production codebase yet")
def test_narrative_drift_detection(sample_claims):
    """
    Tests narrative drift detection. Expected to import from summit.influence.narrative_drift once implemented.
    """
    pass

@pytest.mark.skip(reason="Not implemented in production codebase yet")
def test_narrative_attribution(sample_claims):
    """
    Tests narrative attribution (linking narratives to actors/sources). Expected to import from summit.influence.narrative_attribution once implemented.
    """
    pass

@pytest.mark.skip(reason="Not implemented in production codebase yet")
def test_narrative_risk_scoring(sample_claims, sample_amplification):
    """
    Tests narrative risk scoring based on cluster size and amplification patterns. Expected to import from summit.influence.narrative_risk once implemented.
    """
    pass
