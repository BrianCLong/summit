import json
import os
import unittest
import yaml
from scripts.monitoring.behavior_forecasting_drift import check_calibration_drift

class TestForecastActualDrift(unittest.TestCase):
    def test_drift_detected(self):
        drift_path = "artifacts/behavior-forecasting/drift.json"

        # 15% over 0.05 is 0.0575, so 0.06 should trigger drift
        report = check_calibration_drift(0.06, 0.05)

        self.assertTrue(report["drift_detected"])
        self.assertIn("behavior_forecast_calibration_drift", report["alerts"])
        self.assertTrue(os.path.exists(drift_path))

        with open(drift_path, "r") as f:
            data = json.load(f)
            self.assertTrue(data["drift_detected"])

    def test_no_drift_detected(self):
        report = check_calibration_drift(0.055, 0.05)

        self.assertFalse(report["drift_detected"])
        self.assertEqual(len(report["alerts"]), 0)

    def test_alert_yaml_valid(self):
        alert_path = "alerting/behavior_forecasting_drift.yml"
        self.assertTrue(os.path.exists(alert_path))

        with open(alert_path, "r") as f:
            alerts = yaml.safe_load(f)
            self.assertIn("alerts", alerts)
            self.assertEqual(len(alerts["alerts"]), 2)

if __name__ == '__main__':
    unittest.main()
