import unittest
from summit_cog_war.cognition_legions.simulation import Simulation
from summit_cog_war.cognition_legions.digital_mind import DigitalMind
from summit_cog_war.cognition_legions.belief_network import BeliefNetwork

class TestSimulation(unittest.TestCase):
    def test_creation(self):
        sim = Simulation()
        self.assertEqual(sim.population.number_of_nodes(), 0)
        self.assertEqual(sim.tick_count, 0)

    def test_add_mind(self):
        sim = Simulation()
        dm = DigitalMind(BeliefNetwork())
        sim.add_mind(dm)
        self.assertEqual(sim.population.number_of_nodes(), 1)

    def test_connect_minds(self):
        sim = Simulation()
        dm1 = DigitalMind(BeliefNetwork())
        dm2 = DigitalMind(BeliefNetwork())
        sim.add_mind(dm1)
        sim.add_mind(dm2)
        sim.connect_minds(dm1, dm2)
        self.assertTrue(sim.population.has_edge(dm1.id, dm2.id))

    def test_tick(self):
        sim = Simulation()
        sim.tick()
        self.assertEqual(sim.tick_count, 1)

if __name__ == '__main__':
    unittest.main()
