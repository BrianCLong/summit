import json
import os
import sys
import unittest

# Add the parent directory to the sys.path to allow importing schema_mapping
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../sentinel_connector"))
)

from schema_mapping import map_sentinel_to_intelgraph


class TestSentinelConnector(unittest.TestCase):

    def setUp(self):
        self.sample_json_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../sentinel_connector/sample.json")
        )

    def test_map_sentinel_to_intelgraph(self):
        expected_entities = [
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:00:00.000Z",
                    "event_type": "SecurityEvent",
                    "event_id": 4624,
                    "activity": "Logon",
                    "raw_log": json.dumps(
                        {
                            "TimeGenerated": "2023-08-25T10:00:00.000Z",
                            "Computer": "VM-WIN10-01",
                            "EventID": 4624,
                            "Activity": "Logon",
                            "Account": "user1",
                            "IpAddress": "192.168.1.50",
                            "Type": "SecurityEvent",
                        }
                    ),
                },
            },
            {"type": "Device", "properties": {"name": "VM-WIN10-01"}},
            {"type": "Person", "properties": {"name": "user1"}},
            {"type": "IPAddress", "properties": {"address": "192.168.1.50"}},
            {
                "type": "Event",
                "properties": {
                    "timestamp": "2023-08-25T10:01:00.000Z",
                    "event_type": "Syslog",
                    "event_id": 1001,
                    "activity": "ProcessCreated",
                    "raw_log": json.dumps(
                        {
                            "TimeGenerated": "2023-08-25T10:01:00.000Z",
                            "Computer": "LINUX-SRV-01",
                            "EventID": 1001,
                            "Activity": "ProcessCreated",
                            "CommandLine": '/bin/bash -c "ls -la"',
                            "Type": "Syslog",
                        }
                    ),
                },
            },
            {"type": "Device", "properties": {"name": "LINUX-SRV-01"}},
            {"type": "Process", "properties": {"command_line": '/bin/bash -c "ls -la"'}},
        ]

        actual_entities = map_sentinel_to_intelgraph(self.sample_json_path)
        self.assertEqual(actual_entities, expected_entities)


if __name__ == "__main__":
    unittest.main()
