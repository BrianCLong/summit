# summit/fimi/surge/tests/test_window_spike.py

import unittest
from summit.fimi.surge.surge_detector import SurgeDetector

class TestWindowSpike(unittest.TestCase):
    def setUp(self):
        self.detector = SurgeDetector(threshold=2.0)

    def test_no_surge(self):
        data = [10, 11, 10, 12, 11, 10]
        result = self.detector.check_window(data, "normal_window")
        self.assertFalse(result["surge_detected"])

    def test_surge_detected(self):
        data = [10, 11, 50, 12, 11, 10]
        result = self.detector.check_window(data, "diplomatic_summit_2026")
        self.assertTrue(result["surge_detected"])
        self.assertIn(2, result["spike_indices"])

if __name__ == "__main__":
    unittest.main()
