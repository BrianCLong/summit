import unittest
from summit.influence.narrative_graph import NarrativeGraph

class TestNarrativeGraph(unittest.TestCase):
    def test_link_similarity(self):
        graph = NarrativeGraph()
        graph.add_document("doc1", ["a", "b", "c"])
        graph.add_document("doc2", ["a", "b", "c"])
        graph.add_document("doc3", ["x", "y", "z"])
        graph.link_similarity(0.5)
        self.assertEqual(len(graph.edges), 2)

if __name__ == '__main__':
    unittest.main()
