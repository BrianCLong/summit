import os
import unittest
from unittest import mock

from modules.backfill import planner


class TestBackfillPlanner(unittest.TestCase):

    def test_default_disabled_returns_none(self):
        # Default state: SUMMIT_BACKFILL_PLANNER is not set or "0"
        self.assertIsNone(planner.generate_backfill_plan([("2026-01-01", "2026-01-02")]))

    @mock.patch.dict(os.environ, {"SUMMIT_BACKFILL_PLANNER": "1"})
    def test_enabled_returns_plan(self):
        # Reload module to pick up env var change
        import importlib
        importlib.reload(planner)

        missing = [("2026-01-01", "2026-01-02")]
        plan = planner.generate_backfill_plan(missing)

        self.assertIsNotNone(plan)
        self.assertEqual(len(plan), 1)
        self.assertEqual(plan[0]["action"], "replay")
        self.assertEqual(plan[0]["start_time"], "2026-01-01")

    def tearDown(self):
        # Ensure we reset module state to default for other tests
        import importlib
        if "SUMMIT_BACKFILL_PLANNER" in os.environ:
            del os.environ["SUMMIT_BACKFILL_PLANNER"]
        importlib.reload(planner)

if __name__ == "__main__":
    unittest.main()
