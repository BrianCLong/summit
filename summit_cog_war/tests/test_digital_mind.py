import unittest
from summit_cog_war.cognition_legions.digital_mind import DigitalMind
from summit_cog_war.cognition_legions.belief_network import BeliefNetwork

class TestDigitalMind(unittest.TestCase):
    def test_creation(self):
        bn = BeliefNetwork()
        dm = DigitalMind(bn)
        self.assertIsNotNone(dm.id)
        self.assertEqual(dm.belief_network, bn)
        self.assertEqual(dm.connections, [])

    def test_add_connection(self):
        bn1 = BeliefNetwork()
        dm1 = DigitalMind(bn1)
        bn2 = BeliefNetwork()
        dm2 = DigitalMind(bn2)
        dm1.add_connection(dm2)
        self.assertIn(dm2, dm1.connections)

if __name__ == '__main__':
    unittest.main()
