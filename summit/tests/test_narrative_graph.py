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
