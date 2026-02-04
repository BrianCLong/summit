import unittest
from summit_cog_war.cognition_legions.belief_network import BeliefNetwork

class TestBeliefNetwork(unittest.TestCase):
    def test_creation(self):
        bn = BeliefNetwork()
        self.assertEqual(bn.graph.number_of_nodes(), 0)

    def test_add_belief(self):
        bn = BeliefNetwork()
        bn.add_belief("The sky is blue")
        self.assertEqual(bn.graph.number_of_nodes(), 1)
        self.assertIn("The sky is blue", bn.graph.nodes)

    def test_add_connection(self):
        bn = BeliefNetwork()
        bn.add_belief("The sky is blue")
        bn.add_belief("The ocean is blue")
        bn.add_connection("The sky is blue", "The ocean is blue")
        self.assertTrue(bn.graph.has_edge("The sky is blue", "The ocean is blue"))

if __name__ == '__main__':
    unittest.main()
