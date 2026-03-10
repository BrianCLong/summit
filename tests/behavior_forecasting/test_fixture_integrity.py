import json
import os
import unittest

class TestFixtureIntegrity(unittest.TestCase):
    def setUp(self):
        self.schema_path = "benchmarks/behavior-forecasting/event_schema.json"
        self.fixture_path = "benchmarks/behavior-forecasting/fixtures/base_scenario.json"

    def test_schema_exists(self):
        self.assertTrue(os.path.exists(self.schema_path))
        with open(self.schema_path) as f:
            schema = json.load(f)
            self.assertIn("required", schema)

    def test_fixture_matches_schema(self):
        self.assertTrue(os.path.exists(self.fixture_path))
        with open(self.fixture_path) as f:
            fixture = json.load(f)

        # Simple schema validation
        for event in fixture.get("events", []):
            self.assertIn("event_id", event)
            self.assertIn("ts_offset_ms", event)
            self.assertIn("actor", event)
            self.assertIn("event_type", event)
            self.assertIn("payload", event)

if __name__ == '__main__':
    unittest.main()
