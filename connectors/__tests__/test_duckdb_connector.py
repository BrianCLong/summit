import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../duckdb_connector")))

from schema_mapping import map_duckdb_to_intelgraph


class TestDuckDBConnector(unittest.TestCase):

    def setUp(self):
        # No actual DuckDB connection, just passing a dummy path for the function signature
        self.sample_sql_path = "dummy_path.sql"

    def test_map_duckdb_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Person",
                "properties": {
                    "id": "101",
                    "name": "John Doe",
                    "description": "A user from DuckDB",
                },
            },
            {
                "type": "Person",
                "properties": {
                    "id": "102",
                    "name": "Jane Smith",
                    "description": "Another user from DuckDB",
                },
            },
        ]

        actual_entities = map_duckdb_to_intelgraph(self.sample_sql_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
