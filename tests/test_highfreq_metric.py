import unittest

import cv2
import numpy as np

from metrics.highfreq_similarity import detail_similarity, highfreq_map


class TestHighFreqMetric(unittest.TestCase):

    def test_identical_images(self):
        # Create a dummy image with details
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)

        # Test 1.0 similarity for identical images
        sim = detail_similarity(img, img.copy())
        self.assertAlmostEqual(sim, 1.0, places=5)

    def test_completely_different_images(self):
        # Image 1 is flat (no high freq details)
        img1 = np.ones((100, 100, 3), dtype=np.uint8) * 128

        # Image 2 has random noise (high freq details)
        img2 = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)

        # Sim should be ~0.0 or very low
        sim = detail_similarity(img1, img2)
        self.assertTrue(sim < 0.2)

if __name__ == '__main__':
    unittest.main()
