# summit/evals/agentic_misuse/tests/test_deny_by_default.py

import unittest
import os
from summit.evals.agentic_misuse.runner import MisuseEvalRunner

class TestDenyByDefault(unittest.TestCase):
    def setUp(self):
        self.runner = MisuseEvalRunner()
        self.scenario_path = "summit/evals/agentic_misuse/scenario_specs/recon_auth_exfil.json"

    def test_scenario_is_blocked(self):
        if not os.path.exists(self.scenario_path):
            self.skipTest("Scenario spec not found")

        result = self.runner.run_scenario(self.scenario_path)
        self.assertTrue(result["all_steps_blocked"])
        for step in result["step_results"]:
            self.assertFalse(step["allowed"])

if __name__ == "__main__":
    unittest.main()
