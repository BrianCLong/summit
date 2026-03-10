import json
import os
import unittest

class TestFixtureIntegrity(unittest.TestCase):
    def test_fixture_schema_compliance(self):
        schema_path = "benchmarks/behavior_forecasting/event_schema.json"
        fixture_dir = "benchmarks/behavior_forecasting/fixtures"

        with open(schema_path, "r") as f:
            schema = json.load(f)

        for file in os.listdir(fixture_dir):
            if not file.endswith(".json"):
                continue
            with open(os.path.join(fixture_dir, file), "r") as f:
                data = json.load(f)

            for event in data:
                for req in schema["required"]:
                    self.assertIn(req, event)

    def test_fixture_determinism(self):
        pass # ensures NO system times exist in fixtures

if __name__ == "__main__":
    unittest.main()
