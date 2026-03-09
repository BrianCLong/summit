import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from benchmarks.behavior_forecasting.serial_trajectory_eval import evaluate_trajectory


class TestSerialTrajectory(unittest.TestCase):
    def test_trajectory_eval(self):
        events = [
            {"event_id": "1", "ts_offset_ms": 0, "actor": "user", "event_type": "req", "payload": {}},
            {"event_id": "2", "ts_offset_ms": 100, "actor": "agent", "event_type": "call", "payload": {}},
            {"event_id": "3", "ts_offset_ms": 200, "actor": "agent", "event_type": "call", "payload": {}}
        ]
        res = evaluate_trajectory(events)
        self.assertEqual(len(res), 2)

if __name__ == "__main__":
    unittest.main()
