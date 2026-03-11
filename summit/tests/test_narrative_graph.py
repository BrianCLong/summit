from summit.influence.narrative_graph import NarrativeGraph


def test_narrative_graph():
    graph = NarrativeGraph()
    graph.add_document("doc1", ["a", "b", "c"])
    graph.add_document("doc2", ["b", "c", "d"])
    graph.add_document("doc3", ["x", "y", "z"])

    def jaccard(a, b):
        s1 = set(a)
        s2 = set(b)
        union = len(s1.union(s2))
        if union == 0:
            return 0.0
        return len(s1.intersection(s2)) / union

    graph.link_similarity(threshold=0.4)
    assert len(graph.edges) == 1
    assert ("doc1", "doc2", jaccard(["a", "b", "c"], ["b", "c", "d"])) in graph.edges or ("doc2", "doc1", jaccard(["a", "b", "c"], ["b", "c", "d"])) in graph.edges

from summit.counter_ai.risk_register import global_risk_bus

def test_narrative_graph_hooks():
    global_risk_bus.clear()

    graph = NarrativeGraph()
    # High repetition token array (potential corpus poisoning)
    graph.add_document("doc_suspicious", ["spam", "spam", "spam", "spam", "a"])

    # Near identical document for relation injection test
    graph.add_document("doc_suspicious2", ["spam", "spam", "spam", "spam", "a"])

    # Normal document
    graph.add_document("doc_normal", ["legit", "normal", "text"])

    graph.link_similarity(threshold=0.4)

    observations = global_risk_bus.get_observations()

    # We expect R-001 (Corpus poisoning) twice because both doc_suspicious and doc_suspicious2 have < half unique tokens
    assert len([obs for obs in observations if obs.risk_id == "R-001"]) == 2

    # We expect R-002 (Relation Injection) once because doc_suspicious and doc_suspicious2 have 100% jaccard similarity
    assert len([obs for obs in observations if obs.risk_id == "R-002"]) == 1
