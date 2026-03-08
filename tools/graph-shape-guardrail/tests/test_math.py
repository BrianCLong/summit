import sys
import unittest
from pathlib import Path

import numpy as np

# Add tool directory to path (parent of 'tests' directory)
tool_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(tool_dir))

from lib import calculate_skewness, calculate_top_k_mass, reservoir_sample


class TestGraphGuardrailMath(unittest.TestCase):

    def test_reservoir_sample_exact(self):
        # If stream < k, should return all
        stream = range(10)
        sample = reservoir_sample(stream, k=20)
        self.assertEqual(len(sample), 10)
        self.assertEqual(set(sample), set(range(10)))

    def test_reservoir_sample_downsample(self):
        # If stream > k, should return k
        stream = range(100)
        k = 10
        sample = reservoir_sample(stream, k=k)
        self.assertEqual(len(sample), k)
        # All items should be from the stream
        self.assertTrue(all(x in range(100) for x in sample))

    def test_skewness(self):
        # Symmetrical data -> 0 skew
        data = [1, 2, 3]
        skew = calculate_skewness(data)
        self.assertAlmostEqual(skew, 0.0, places=4)

        # Positive skew (tail on right, or outliers on right)
        # [1, 1, 1, 10] -> Mean 3.25. 1s are below mean, 10 is way above.
        data_pos = [1, 1, 1, 10]
        skew_pos = calculate_skewness(data_pos)
        self.assertGreater(skew_pos, 0)

        # Negative skew (tail on left)
        # [1, 10, 10, 10] -> Mean 7.75. 10s are above mean, 1 is way below.
        data_neg = [10, 10, 10, 1]
        skew_neg = calculate_skewness(data_neg)
        self.assertLess(skew_neg, 0)

    def test_top_k_mass(self):
        # Simple case: 100 items, each 1. Top 1% of 100 is top 1 item.
        # Sum = 100. Top 1 sum = 1. Ratio = 0.01
        data = [1] * 100
        mass = calculate_top_k_mass(data, top_percent=0.01)
        self.assertAlmostEqual(mass, 0.01)

        # Concentration
        data = [1] * 99 + [100] # Total sum = 199. Top 1 is 100.
        # Top 1% of 100 items is 1 item.
        mass = calculate_top_k_mass(data, top_percent=0.01)
        self.assertAlmostEqual(mass, 100/199, places=4) # ~0.5025

    def test_top_k_mass_empty(self):
        self.assertEqual(calculate_top_k_mass([]), 0.0)

if __name__ == '__main__':
    unittest.main()
