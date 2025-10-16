import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../json_connector")))

from schema_mapping import map_json_to_intelgraph


class TestJsonConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../json_connector/sample.json")
        )

    def test_map_json_to_intelgraph_enhanced(self):
        entities, relationships = map_json_to_intelgraph(self.sample_json_path)

        # Expected Entities (simplified checks)
        expected_entity_ids = {"user_1", "user_2", "org_1", "proj_A", "proj_B"}
        actual_entity_ids = {e["properties"]["id"] for e in entities}
        self.assertEqual(actual_entity_ids, expected_entity_ids)

        # Expected Relationships (simplified checks)
        expected_relationships = [
            {"type": "WORKS_AT", "source_id": "user_1", "target_id": "org_1"},
            {"type": "WORKS_ON", "source_id": "user_1", "target_id": "proj_A"},
            {"type": "WORKS_ON", "source_id": "user_1", "target_id": "proj_B"},
            {"type": "WORKS_AT", "source_id": "user_2", "target_id": "org_1"},
            {"type": "WORKS_ON", "source_id": "user_2", "target_id": "proj_A"},
        ]

        # Convert actual relationships to a comparable format
        actual_relationships_simplified = [
            {"type": r["type"], "source_id": r["source_id"], "target_id": r["target_id"]}
            for r in relationships
        ]

        # Sort both lists for consistent comparison
        actual_relationships_simplified.sort(
            key=lambda x: (x["type"], x["source_id"], x["target_id"])
        )
        expected_relationships.sort(key=lambda x: (x["type"], x["source_id"], x["target_id"]))

        self.assertEqual(actual_relationships_simplified, expected_relationships)


if __name__ == "__main__":
    unittest.main()
