from summit.influence.narrative_graph import NarrativeGraph


def test_narrative_graph_similarity():
    graph = NarrativeGraph()
    graph.add_document("doc1", ["NATO", "aggression", "border"])
    graph.add_document("doc2", ["NATO", "aggression", "border", "troops"])
    graph.add_document("doc3", ["cats", "dogs", "pets"])

    graph.link_similarity(threshold=0.5)

    assert len(graph.edges) == 1
    a, b, score = graph.edges[0]
    assert set([a, b]) == {"doc1", "doc2"}
    assert score == 0.75
