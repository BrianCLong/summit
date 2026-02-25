import unittest

from vmworkbench.dangerous_ops.passthrough_plan import generate_passthrough_plan


class TestPassthroughPlan(unittest.TestCase):
    def test_plan_generation(self):
        devices = ["0000:01:00.0", "0000:01:00.1"]
        plan = generate_passthrough_plan(devices)

        self.assertEqual(plan["kind"], "vfio_passthrough")
        self.assertEqual(plan["mode"], "plan-only")
        self.assertEqual(len(plan["steps"]), 3)
        self.assertEqual(plan["steps"][1]["devices"], devices)
        self.assertEqual(plan["rollback"][0]["devices"], devices)

    def test_no_side_effects(self):
        # This is a bit philosophical for a unit test, but we want to be sure
        # no system calls are made.
        # In a real scenario we might mock 'subprocess.run' and assert it's NOT called.
        import subprocess
        from unittest.mock import patch

        with patch('subprocess.run') as mock_run:
            generate_passthrough_plan(["0000:01:00.0"])
            mock_run.assert_not_called()

if __name__ == "__main__":
    unittest.main()
