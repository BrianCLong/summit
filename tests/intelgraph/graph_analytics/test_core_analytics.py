
import unittest
import os
import sys

# Add the parent directory to sys.path to allow importing core_analytics
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../intelgraph/graph_analytics')))

from core_analytics import (
    find_shortest_path,
    find_k_shortest_paths,
    detect_communities_louvain,
    detect_communities_leiden,
    calculate_betweenness_centrality,
    calculate_eigenvector_centrality,
    detect_roles_and_brokers,
    Graph
)

class TestCoreAnalyticsStubs(unittest.TestCase):

    def test_shortest_path_implementation(self):
        g = Graph()
        g.add_edge('A', 'B')
        g.add_edge('B', 'C')
        g.add_edge('A', 'D')
        g.add_edge('D', 'E')
        g.add_edge('E', 'C')

        self.assertEqual(find_shortest_path(g, 'A', 'C'), ['A', 'B', 'C'])
        self.assertEqual(find_shortest_path(g, 'A', 'E'), ['A', 'D', 'E'])
        self.assertEqual(find_shortest_path(g, 'A', 'F'), []) # No path
        self.assertEqual(find_shortest_path(g, 'X', 'Y'), []) # Nodes not in graph

    def test_k_shortest_paths_stub(self):
        self.assertEqual(find_k_shortest_paths(None, None, None, 1), [])

    def test_detect_communities_louvain_stub(self):
        self.assertEqual(detect_communities_louvain(None), {})

    def test_detect_communities_leiden_stub(self):
        self.assertEqual(detect_communities_leiden(None), {})

    def test_calculate_betweenness_centrality_stub(self):
        self.assertEqual(calculate_betweenness_centrality(None), {})

    def test_calculate_eigenvector_centrality_stub(self):
        self.assertEqual(calculate_eigenvector_centrality(None), {})

    def test_detect_roles_and_brokers_stub(self):
        self.assertEqual(detect_roles_and_brokers(None), {})

if __name__ == '__main__':
    unittest.main()
