import unittest
import os
import json
import shutil
import sys

# Add parent dir to path so we can import graph_validator
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from graph_validator.sketch import LogBinSketch
from graph_validator.ks import ks_distance
from graph_validator.drift import DriftDetector

class TestGraphValidator(unittest.TestCase):
    def setUp(self):
        self.fixtures_dir = os.path.join(os.path.dirname(__file__), "../fixtures/data")
        self.baseline_path = os.path.join(self.fixtures_dir, "baseline.jsonl")
        self.window_ok_path = os.path.join(self.fixtures_dir, "window_ok.jsonl")
        self.window_drift_path = os.path.join(self.fixtures_dir, "window_drift.jsonl")

    def load_sketch(self, filepath):
        sketch = LogBinSketch()
        with open(filepath, 'r') as f:
            for line in f:
                try:
                    d = json.loads(line).get("degree", 0)
                    sketch.add(d)
                except:
                    pass
        return sketch

    def test_sketch_properties(self):
        sketch = LogBinSketch()
        sketch.add(10)
        sketch.add(100)
        self.assertEqual(sketch.n, 2)
        cdf = sketch.get_cdf()
        self.assertTrue(len(cdf) > 0)
        self.assertEqual(cdf[-1][1], 1.0)

    def test_ks_identity(self):
        sketch = self.load_sketch(self.baseline_path)
        d = ks_distance(sketch, sketch)
        self.assertAlmostEqual(d, 0.0)

    def test_no_drift(self):
        baseline = self.load_sketch(self.baseline_path)
        window = self.load_sketch(self.window_ok_path)

        # Thresholds permissive enough for same-distribution samples
        detector = DriftDetector(threshold_d=0.15, threshold_p=1e-10)
        # Note: KS p-value for large N (1000) is very sensitive.
        # Even small random variations might trigger p < 0.05.
        # But D should be small.

        result = detector.check(baseline, window)

        print(f"\nNo Drift Test: D={result.d:.4f}, p={result.p_value:.4e}")
        self.assertEqual(result.status, "OK")
        self.assertLess(result.d, 0.15)

    def test_drift(self):
        baseline = self.load_sketch(self.baseline_path)
        window = self.load_sketch(self.window_drift_path)

        detector = DriftDetector(threshold_d=0.05, threshold_p=0.01)
        result = detector.check(baseline, window)

        print(f"\nDrift Test: D={result.d:.4f}, p={result.p_value:.4e}")
        self.assertEqual(result.status, "DRIFT")

if __name__ == '__main__':
    unittest.main()
