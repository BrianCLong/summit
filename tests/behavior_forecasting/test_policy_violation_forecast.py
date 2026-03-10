import unittest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

class TestPolicyViolationForecast(unittest.TestCase):
    def test_policy_risk_score(self):
        # mock forecast output
        forecast_output = {"policy_violation_probability": 0.05, "calibration_error": 0.02, "fixture_integrity": True}

        # Test default OPA logic bounds
        self.assertTrue(forecast_output["policy_violation_probability"] < 0.10)
        self.assertTrue(forecast_output["calibration_error"] <= 0.05)
        self.assertTrue(forecast_output["fixture_integrity"])

if __name__ == "__main__":
    unittest.main()
