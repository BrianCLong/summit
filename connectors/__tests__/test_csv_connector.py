import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.insert(0, project_root)

from connectors.csv_connector.schema_mapping import map_csv_to_intelgraph
from simulated_ingestion.ingestion_pipeline import MockGraphDBClient, run_ingestion_pipeline


class TestCsvConnector(unittest.TestCase):

    def setUp(self):
        self.csv_connector_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../csv_connector")
        )
        self.sample_csv_path = os.path.join(self.csv_connector_path, "sample.csv")

    def test_map_csv_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Person",
                "properties": {"id": "1", "name": "Alice", "description": "A person of interest"},
            },
            {
                "type": "Person",
                "properties": {"id": "2", "name": "Bob", "description": "Another person"},
            },
            {
                "type": "Project",
                "properties": {"id": "3", "name": "Project X", "description": "A secret project"},
            },
        ]

        # map_csv_to_intelgraph now returns (entities, relationships)
        actual_entities, actual_relationships = map_csv_to_intelgraph(self.sample_csv_path)
        self.assertEqual(actual_entities, expected_entities)
        self.assertEqual(actual_relationships, [])  # CSV example doesn't generate relationships

    def test_e2e_ingestion_pipeline(self):
        mock_db = MockGraphDBClient()
        success = run_ingestion_pipeline(self.csv_connector_path, mock_db)
        self.assertTrue(success)

        # Verify nodes in mock DB
        nodes = mock_db.get_all_nodes()
        self.assertEqual(len(nodes), 3)

        # Check for specific entities
        person_names = [node["properties"]["name"] for node in nodes if node["type"] == "Person"]
        self.assertIn("Alice", person_names)
        self.assertIn("Bob", person_names)

        project_names = [node["properties"]["name"] for node in nodes if node["type"] == "Project"]
        self.assertIn("Project X", project_names)

        # Verify relationships (should be empty for CSV example)
        self.assertEqual(mock_db.get_all_relationships(), [])

        # Verify analytics output (check print statements in console for now)
        # In a real test, you'd capture stdout or mock the analytics function


if __name__ == "__main__":
    unittest.main()
