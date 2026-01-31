import os
import subprocess
import sys
import unittest


class TestBackdoorGates(unittest.TestCase):
    def test_backdoor_fixture_detected(self):
        fixture_path = "federated_gnn/tests/adversarial/fixtures/backdoor_drift.json"
        gate_script = "federated_gnn/gates/backdoor_suspicion_score.py"

        # Should fail (exit 1)
        result = subprocess.run(
            ["python3", gate_script, fixture_path],
            capture_output=True,
            text=True
        )
        self.assertNotEqual(result.returncode, 0, "Backdoor fixture should trigger failure")
        self.assertIn("BACKDOOR SUSPECTED", result.stdout)

    def test_clean_fixture_passes(self):
        # Use the signed pass fixture
        fixture_path = "federated_gnn/tests/fixtures/update_signed.pass.json"
        gate_script = "federated_gnn/gates/backdoor_suspicion_score.py"

        result = subprocess.run(
            ["python3", gate_script, fixture_path],
            capture_output=True,
            text=True
        )
        self.assertEqual(result.returncode, 0, "Clean fixture should pass")
        self.assertIn("CLEAN", result.stdout)

if __name__ == '__main__':
    unittest.main()
