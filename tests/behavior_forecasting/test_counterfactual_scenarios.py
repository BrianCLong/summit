import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from analysis.behavior_forecasting.counterfactual_runner import perturb_tool_latency


class TestCounterfactuals(unittest.TestCase):
    def test_perturb_tool_latency(self):
        scenario = {"env": {"tool_latency_multiplier": 1.0}}
        mutated = perturb_tool_latency(scenario, 2.0)
        self.assertEqual(mutated["env"]["tool_latency_multiplier"], 2.0)
        self.assertEqual(scenario["env"]["tool_latency_multiplier"], 1.0)

if __name__ == "__main__":
    unittest.main()
