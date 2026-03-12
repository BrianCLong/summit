import unittest
from pathlib import Path
from connectors.http_csv_connector.connector import HTTPCSVConnector

class TestHTTPCSVConnector(unittest.TestCase):
    def setUp(self):
        self.manifest_path = Path("connectors/http_csv_connector/manifest.yaml")
        self.sample_csv = Path("connectors/http_csv_connector/sample.csv")

    def test_connector_initialization(self):
        connector = HTTPCSVConnector(str(self.manifest_path))
        self.assertEqual(connector.manifest["name"], "http-csv-connector")

    def test_deterministic_id(self):
        connector = HTTPCSVConnector(str(self.manifest_path))
        row = {"id": "1", "name": "Test"}
        id1 = connector._generate_id(row)
        id2 = connector._generate_id(row)
        self.assertEqual(id1, id2)

        row2 = {"id": "1", "name": "Test", "other": "data"}
        id3 = connector._generate_id(row2)
        self.assertNotEqual(id1, id3)

    def test_policy_check(self):
        # Admin should be allowed
        connector = HTTPCSVConnector(str(self.manifest_path), subject={"roles": ["admin"]})
        self.assertTrue(connector.check_policy("connector:sync"))

        # Guest should be denied
        connector = HTTPCSVConnector(str(self.manifest_path), subject={"roles": ["guest"]})
        self.assertFalse(connector.check_policy("connector:sync"))

if __name__ == "__main__":
    unittest.main()
