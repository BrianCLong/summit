import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../elasticsearch_connector"))
)

from schema_mapping import map_elasticsearch_to_intelgraph


class TestElasticsearchConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../elasticsearch_connector/sample.json")
        )

    def test_map_elasticsearch_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:00:00.000Z",
                    "log_level": "info",
                    "message": "User login successful",
                    "host": "auth-server-01",
                },
            },
            {"type": "Person", "properties": {"name": "johndoe"}},
            {"type": "Device", "properties": {"name": "auth-server-01", "type": "Server"}},
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:01:00.000Z",
                    "log_level": "error",
                    "message": "Database connection failed",
                    "host": "db-server-01",
                },
            },
            {"type": "Device", "properties": {"name": "db-server-01", "type": "Server"}},
        ]

        actual_entities = map_elasticsearch_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
