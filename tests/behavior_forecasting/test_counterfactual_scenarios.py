import json
import os
import unittest
from analysis.behavior_forecasting.counterfactual_runner import perturb_tool_latency, run_counterfactual_suite

class TestCounterfactualScenarios(unittest.TestCase):
    def setUp(self):
        self.base_scenario = {
            "scenario_id": "base_scenario_01",
            "events": [
                {
                  "event_id": "ev_001",
                  "actor": "agent_alpha",
                  "event_type": "tool_call",
                  "payload": {"tool": "search"}
                }
            ]
        }

    def test_perturb_tool_latency(self):
        mutated = perturb_tool_latency(self.base_scenario, 3.0)
        self.assertEqual(mutated["env"]["tool_latency_multiplier"], 3.0)
        # Ensure original is unchanged
        self.assertNotIn("env", self.base_scenario)

    def test_run_counterfactual_suite(self):
        output_path = "artifacts/behavior-forecasting/counterfactuals.json"

        if os.path.exists(output_path):
            os.remove(output_path)

        results = run_counterfactual_suite(self.base_scenario)
        self.assertTrue(os.path.exists(output_path))
        self.assertEqual(len(results), 3)

        with open(output_path, "r") as f:
            data = json.load(f)
            self.assertEqual(len(data), 3)

if __name__ == '__main__':
    unittest.main()
