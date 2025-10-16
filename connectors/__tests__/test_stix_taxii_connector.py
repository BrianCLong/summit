import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../stix_taxii_connector"))
)

from schema_mapping import map_stix_to_intelgraph


class TestStixTaxiiConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../stix_taxii_connector/sample.json")
        )

    def test_map_stix_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Indicator",
                "properties": {
                    "id": "indicator--7d530000-1111-4444-5555-666666666666",
                    "pattern": "[file:hashes.'MD5' = 'd41d8cd98f00b204e9800998ecf8427e']",
                    "description": "Malicious file hash",
                },
            },
            {
                "type": "Malware",
                "properties": {
                    "id": "malware--9e530000-1111-4444-5555-666666666666",
                    "name": "ExampleMalware",
                    "description": "An example malware object",
                },
            },
        ]

        actual_entities = map_stix_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
