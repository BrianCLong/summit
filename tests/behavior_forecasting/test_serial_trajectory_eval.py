import os
import json
import unittest
from analysis.behavior_forecasting.serial_metrics import calculate_metrics, save_metrics

class TestSerialTrajectoryEval(unittest.TestCase):
    def test_calculate_metrics(self):
        mock_results = [
            {"t": 1, "divergence_score": 0.1},
            {"t": 2, "divergence_score": 0.3}
        ]
        metrics = calculate_metrics(mock_results)
        self.assertAlmostEqual(metrics["average_divergence"], 0.2)
        self.assertAlmostEqual(metrics["calibration_error"], 0.1)

    def test_save_metrics(self):
        metrics = {"average_divergence": 0.2, "calibration_error": 0.1}
        output_path = "artifacts/behavior-forecasting/metrics.json"

        if os.path.exists(output_path):
            os.remove(output_path)

        save_metrics(metrics)
        self.assertTrue(os.path.exists(output_path))

        with open(output_path, "r") as f:
            saved_metrics = json.load(f)
            self.assertEqual(saved_metrics, metrics)

if __name__ == "__main__":
    unittest.main()
