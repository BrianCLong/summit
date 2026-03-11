import unittest

import numpy as np

from metrics.attention_coverage import attention_coverage


class TestAttentionCoverage(unittest.TestCase):

    def test_perfect_coverage(self):
        # Mask is central 10x10 area in 100x100
        mask = np.zeros((100, 100))
        mask[45:55, 45:55] = 1.0

        # Attention is purely inside the mask
        att = np.zeros((100, 100))
        att[45:55, 45:55] = 1.0

        cov = attention_coverage(att, mask)
        self.assertEqual(cov, 1.0)

    def test_partial_coverage(self):
        mask = np.zeros((10, 10))
        mask[0:5, 0:10] = 1.0

        # Attention is everywhere
        att = np.ones((10, 10))

        # Coverage should be 0.5 (half the area)
        cov = attention_coverage(att, mask)
        self.assertEqual(cov, 0.5)

if __name__ == '__main__':
    unittest.main()
