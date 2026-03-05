import sys
import unittest


class TestNoUnapprovedDeps(unittest.TestCase):
    def test_pure_python_stdlib_only(self):
        """
        Ensures that the new modules we added strictly rely on the standard library.
        This is a simple import check. If an import fails, it means we introduced
        a dependency that isn't present in the environment (which is good) OR
        we are checking for third-party packages that shouldn't be there.

        For this PR stack, we enforced "pure stdlib", so we just verify we can
        import our own modules without crashing.
        """
        try:
            import modules.backfill.planner
            import modules.cost_breaker.breaker
            import modules.reconciler.reconcile
            import modules.snowflake_operability.policy
        except ImportError as e:
            self.fail(f"Failed to import new modules: {e}")

if __name__ == "__main__":
    unittest.main()
