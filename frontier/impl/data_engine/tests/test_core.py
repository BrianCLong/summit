import unittest
from frontier.impl.data_engine.core import DataEngine

class TestDataEngine(unittest.TestCase):
    def test_instantiation(self):
        engine = DataEngine()
        self.assertIsNotNone(engine)
        self.assertEqual(engine.data_lake_path, "./data_lake")

    def test_submit_telemetry(self):
        engine = DataEngine()
        telemetry = {"run_id": "test_run", "metrics": {"loss": 0.5}}
        engine.submit_telemetry(telemetry)
        self.assertEqual(len(engine.telemetry_log), 1)
        self.assertEqual(engine.telemetry_log[0], telemetry)

if __name__ == '__main__':
    unittest.main()
