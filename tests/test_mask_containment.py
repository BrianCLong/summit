import unittest

import numpy as np

from metrics.mask_containment import mask_containment


class TestMaskContainment(unittest.TestCase):

    def test_perfect_containment(self):
        target = np.ones((100, 100, 3), dtype=np.uint8) * 128
        gen = target.copy()

        # Mask is central area
        mask = np.zeros((100, 100))
        mask[40:60, 40:60] = 1.0

        # Gen has changes only inside mask
        gen[40:60, 40:60] = 255

        containment = mask_containment(target, gen, mask)
        self.assertEqual(containment, 1.0)

    def test_leakage(self):
        target = np.zeros((100, 100, 3), dtype=np.uint8)
        gen = target.copy()

        # Mask is small
        mask = np.zeros((100, 100))
        mask[0:10, 0:10] = 1.0

        # Gen changes completely (lots of leakage outside mask)
        gen[:,:] = 255

        containment = mask_containment(target, gen, mask)
        self.assertTrue(containment < 1.0)

if __name__ == '__main__':
    unittest.main()
