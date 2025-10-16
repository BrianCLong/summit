import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../mapbox_connector")))

from schema_mapping import map_mapbox_to_intelgraph


class TestMapboxConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../mapbox_connector/sample.json")
        )

    def test_map_mapbox_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Location",
                "properties": {
                    "name": "Washington D.C.",
                    "latitude": 38.9072,
                    "longitude": -77.0369,
                    "location_type": "City",
                },
            },
            {
                "type": "Location",
                "properties": {
                    "name": "London",
                    "latitude": 51.5074,
                    "longitude": -0.1278,
                    "location_type": "City",
                },
            },
        ]

        actual_entities = map_mapbox_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
