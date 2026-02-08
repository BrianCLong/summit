import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../gdelt_gkg")))

from schema_mapping import map_gkg_to_intelgraph, parse_gkg_line


class TestGDELTGKGConnector(unittest.TestCase):
    def setUp(self):
        self.sample_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../gdelt_gkg/sample_gkg_v21.tsv")
        )

    def test_parse_gkg_line(self):
        with open(self.sample_path) as handle:
            record = parse_gkg_line(handle.readline())

        self.assertEqual(record.gkg_record_id, "GKG-20250101000000-0001")
        self.assertEqual(record.source_common_name, "reuters.com")
        self.assertIn("ECON_GROWTH", record.themes)
        self.assertIn("US#New York#US#NYC#40.7#-74.0", record.locations)

    def test_map_gkg_to_intelgraph(self):
        with open(self.sample_path) as handle:
            record = parse_gkg_line(handle.readline())

        entities, relationships = map_gkg_to_intelgraph(record)

        entity_types = {entity["type"] for entity in entities}
        self.assertIn("GDELT_Record", entity_types)
        self.assertIn("Theme", entity_types)
        self.assertIn("Location", entity_types)

        relationship_types = {rel["type"] for rel in relationships}
        self.assertIn("MENTIONS", relationship_types)


if __name__ == "__main__":
    unittest.main()
