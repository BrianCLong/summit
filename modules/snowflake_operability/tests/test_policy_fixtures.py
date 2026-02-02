import json
import unittest
import os
from modules.snowflake_operability.policy import evaluate_operability

class TestOperabilityPolicy(unittest.TestCase):
    def load_fixture(self, name):
        path = os.path.join("modules/snowflake_operability/fixtures", name)
        with open(path) as f:
            return json.load(f)

    def test_all_pass(self):
        events = self.load_fixture("all_pass.json")
        result = evaluate_operability(events)
        self.assertTrue(result.ok, f"Expected success, got {result.violations}")

    def test_late_data_fail(self):
        events = self.load_fixture("late_data_fail.json")
        result = evaluate_operability(events)
        self.assertFalse(result.ok)
        self.assertTrue(any("POLICY_FAILURE:late_data_policy" in v for v in result.violations))

    def test_schema_drift_fail(self):
        events = self.load_fixture("schema_drift_fail.json")
        result = evaluate_operability(events)
        self.assertFalse(result.ok)
        self.assertTrue(any("POLICY_FAILURE:schema_contract" in v for v in result.violations))

    def test_json_silent_failure_fail(self):
        events = self.load_fixture("json_silent_failure_fail.json")
        result = evaluate_operability(events)
        self.assertFalse(result.ok)
        self.assertTrue(any("POLICY_FAILURE:file_format_checks" in v for v in result.violations))

    def test_cost_spike_fail(self):
        events = self.load_fixture("cost_spike_fail.json")
        result = evaluate_operability(events)
        self.assertFalse(result.ok)
        self.assertTrue(any("POLICY_FAILURE:cost_budget" in v for v in result.violations))

    def test_missing_markers(self):
        events = self.load_fixture("missing_markers.json")
        result = evaluate_operability(events)
        self.assertFalse(result.ok)
        self.assertTrue(any("MISSING_MARKER:schema_contract" in v for v in result.violations))
        self.assertTrue(any("MISSING_MARKER:file_format_checks" in v for v in result.violations))
        self.assertTrue(any("MISSING_MARKER:cost_budget" in v for v in result.violations))

if __name__ == "__main__":
    unittest.main()
