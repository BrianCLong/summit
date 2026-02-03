# summit/supplychain/canary/tests/test_redirect_differential.py

import unittest
from unittest.mock import MagicMock
from summit.supplychain.canary.canary_runner import CanaryRunner

class TestRedirectDifferential(unittest.TestCase):
    def test_pass_on_identical_responses(self):
        probe1 = MagicMock()
        probe1.probe.return_value = {"hash": "h1", "redirect_url": "r1"}
        probe2 = MagicMock()
        probe2.probe.return_value = {"hash": "h1", "redirect_url": "r1"}

        runner = CanaryRunner([probe1, probe2])
        result = runner.run_check("http://example.com/update")
        self.assertEqual(result["status"], "pass")
        self.assertFalse(result["differential_detected"])

    def test_fail_on_differential_hash(self):
        probe1 = MagicMock()
        probe1.probe.return_value = {"hash": "h1", "redirect_url": "r1"}
        probe2 = MagicMock()
        probe2.probe.return_value = {"hash": "h2", "redirect_url": "r1"}

        runner = CanaryRunner([probe1, probe2])
        result = runner.run_check("http://example.com/update")
        self.assertEqual(result["status"], "fail")
        self.assertTrue(result["differential_detected"])

    def test_fail_on_differential_redirect(self):
        probe1 = MagicMock()
        probe1.probe.return_value = {"hash": "h1", "redirect_url": "r1"}
        probe2 = MagicMock()
        probe2.probe.return_value = {"hash": "h1", "redirect_url": "r2"}

        runner = CanaryRunner([probe1, probe2])
        result = runner.run_check("http://example.com/update")
        self.assertEqual(result["status"], "fail")
        self.assertTrue(result["differential_detected"])

if __name__ == "__main__":
    unittest.main()
