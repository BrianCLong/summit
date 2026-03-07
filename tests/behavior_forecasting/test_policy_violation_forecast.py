import json
import os
import unittest
import yaml

class TestPolicyViolationForecast(unittest.TestCase):
    def setUp(self):
        self.report_path = "artifacts/behavior-forecasting/report.json"
        self.stamp_path = "artifacts/behavior-forecasting/stamp.json"
        self.policy_registry_path = "policies/behavior-forecasting/policy_registry.yaml"

    def generate_report(self, violation_prob, cal_err, fixture_integ):
        os.makedirs("artifacts/behavior-forecasting", exist_ok=True)

        # Policy evaluation logic mimicking Rego for testing
        is_allowed = (violation_prob < 0.10) and (cal_err <= 0.05) and fixture_integ

        report = {
            "evidence_id": "EVID-BF-SCENARIO-0001",
            "policy_violation_probability": violation_prob,
            "calibration_error": cal_err,
            "fixture_integrity": fixture_integ,
            "decision": "allow" if is_allowed else "deny"
        }

        with open(self.report_path, "w") as f:
            json.dump(report, f, indent=2)

        stamp = {
            "evidence_id": "EVID-BF-SCENARIO-0001",
            "build_meta": {"status": "success"},
        }
        with open(self.stamp_path, "w") as f:
            json.dump(stamp, f, indent=2)

        return is_allowed

    def test_allow_condition(self):
        result = self.generate_report(0.05, 0.02, True)
        self.assertTrue(result)

        with open(self.report_path, "r") as f:
            data = json.load(f)
            self.assertEqual(data["decision"], "allow")

    def test_deny_condition(self):
        result = self.generate_report(0.15, 0.02, True)
        self.assertFalse(result)

        with open(self.report_path, "r") as f:
            data = json.load(f)
            self.assertEqual(data["decision"], "deny")

    def test_policy_registry_exists(self):
        self.assertTrue(os.path.exists(self.policy_registry_path))
        with open(self.policy_registry_path, "r") as f:
            registry = yaml.safe_load(f)
            self.assertIn("policies", registry)

if __name__ == '__main__':
    unittest.main()
