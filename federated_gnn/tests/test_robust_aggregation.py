import os
import sys
import unittest

# Add root to path
sys.path.append(os.getcwd())

from federated_gnn.src.agg.robust import robust_aggregate


class TestRobustAggregation(unittest.TestCase):
    def test_median_outlier(self):
        # [1, 2, 3, 100] -> median should be around 2.5, not 26.5
        updates = [1.0, 2.0, 3.0, 100.0]
        result = robust_aggregate(updates, method="median")
        self.assertEqual(result, 2.5)

    def test_trimmed_mean_outlier(self):
        # [1, 2, 3, 4, 100] -> trim 1 (20%) -> mean([2, 3, 4]) = 3
        updates = [1.0, 2.0, 3.0, 4.0, 100.0]
        result = robust_aggregate(updates, method="trimmed_mean", trim_ratio=0.2)
        self.assertEqual(result, 3.0)

    def test_trimmed_mean_no_outlier(self):
        updates = [1.0, 2.0, 3.0]
        result = robust_aggregate(updates, method="trimmed_mean", trim_ratio=0.1)
        # trim ratio 0.1 of 3 is 0 -> mean([1, 2, 3]) = 2
        self.assertEqual(result, 2.0)

if __name__ == '__main__':
    unittest.main()
