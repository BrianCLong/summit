import os
import unittest
from unittest import mock

from modules.cost_breaker import breaker


class TestCostBreaker(unittest.TestCase):

    def test_default_disabled_allows_over_budget(self):
        # Default state: SUMMIT_COST_BREAKER is not set or "0"
        # Should return True even if spend > limit
        self.assertTrue(breaker.check_budget_limit(150.0, 100.0))

    @mock.patch.dict(os.environ, {"SUMMIT_COST_BREAKER": "1"})
    def test_enabled_blocks_over_budget(self):
        # Reload module to pick up env var change
        import importlib
        importlib.reload(breaker)

        # Spend > Limit -> False (Block)
        self.assertFalse(breaker.check_budget_limit(150.0, 100.0))

        # Spend <= Limit -> True (Pass)
        self.assertTrue(breaker.check_budget_limit(90.0, 100.0))

    def tearDown(self):
        # Ensure we reset module state to default for other tests
        import importlib
        if "SUMMIT_COST_BREAKER" in os.environ:
            del os.environ["SUMMIT_COST_BREAKER"]
        importlib.reload(breaker)

if __name__ == "__main__":
    unittest.main()
