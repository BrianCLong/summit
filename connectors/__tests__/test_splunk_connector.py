import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../splunk_connector")))

from schema_mapping import map_splunk_to_intelgraph


class TestSplunkConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../splunk_connector/sample.json")
        )

    def test_map_splunk_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:00:00.000Z",
                    "host": "webserver01",
                    "source": "/var/log/apache2/access.log",
                    "sourcetype": "access_combined",
                    "event_data": '192.168.1.10 - - [25/Aug/2023:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0"',
                },
            },
            {"type": "Device", "properties": {"name": "webserver01", "type": "Server"}},
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:01:00.000Z",
                    "host": "dbserver01",
                    "source": "/var/log/mysql/error.log",
                    "sourcetype": "mysql_error",
                    "event_data": "[ERROR] Failed to connect to database: Access denied for user 'root'",
                },
            },
            {"type": "Device", "properties": {"name": "dbserver01", "type": "Server"}},
        ]

        actual_entities = map_splunk_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
