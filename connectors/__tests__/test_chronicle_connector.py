import json
import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../chronicle_connector"))
)

from schema_mapping import map_chronicle_to_intelgraph


class TestChronicleConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../chronicle_connector/sample.json")
        )

    def test_map_chronicle_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:00:00Z",
                    "event_type": "NETWORK_CONNECTION",
                    "log_type": "N_DNS",
                    "raw_log": json.dumps(
                        {
                            "metadata": {
                                "event_timestamp": "2023-08-25T10:00:00Z",
                                "event_type": "NETWORK_CONNECTION",
                                "log_type": "N_DNS",
                            },
                            "principal": {"ip": "192.168.1.100", "hostname": "user-laptop"},
                            "target": {"fqdn": "example.com", "ip": "93.184.216.34"},
                            "security_result": {"action": "ALLOW"},
                        }
                    ),
                },
            },
            {"type": "IPAddress", "properties": {"address": "192.168.1.100"}},
            {"type": "Device", "properties": {"name": "user-laptop"}},
            {"type": "Domain", "properties": {"name": "example.com"}},
            {"type": "IPAddress", "properties": {"address": "93.184.216.34"}},
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:01:00Z",
                    "event_type": "PROCESS_LAUNCH",
                    "log_type": "WINEVTLOG",
                    "raw_log": json.dumps(
                        {
                            "metadata": {
                                "event_timestamp": "2023-08-25T10:01:00Z",
                                "event_type": "PROCESS_LAUNCH",
                                "log_type": "WINEVTLOG",
                            },
                            "principal": {"hostname": "server-01", "user": {"userid": "SYSTEM"}},
                            "target": {
                                "process": {
                                    "file_name": "cmd.exe",
                                    "command_line": "cmd.exe /c whoami",
                                }
                            },
                            "security_result": {"action": "ALLOW"},
                        }
                    ),
                },
            },
            {"type": "Device", "properties": {"name": "server-01"}},
            {"type": "Person", "properties": {"userid": "SYSTEM"}},
            {"type": "File", "properties": {"name": "cmd.exe"}},
        ]

        actual_entities = map_chronicle_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
