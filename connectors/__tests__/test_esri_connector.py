import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../esri_connector")))

from schema_mapping import map_esri_to_intelgraph


class TestEsriConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../esri_connector/sample.json")
        )

    def test_map_esri_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Location",
                "properties": {
                    "name": "New York City",
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "location_type": "City",
                },
            },
            {
                "type": "Location",
                "properties": {
                    "name": "Paris",
                    "latitude": 48.8566,
                    "longitude": 2.3522,
                    "location_type": "City",
                },
            },
        ]

        actual_entities = map_esri_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
