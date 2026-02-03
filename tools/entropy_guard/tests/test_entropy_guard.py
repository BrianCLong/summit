import unittest
import subprocess
import os
import sys

class TestEntropyGuard(unittest.TestCase):
    def test_scan_fixtures(self):
        # Path to script
        script = os.path.abspath(os.path.join(os.path.dirname(__file__), "../entropy_guard.py"))
        # Path to fixtures
        fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "fixtures"))

        env = os.environ.copy()
        env["SUMMIT_ENTROPY_GUARD"] = "on"

        # Pass the fixtures dir as argument
        result = subprocess.run(
            [sys.executable, script, fixtures_dir],
            capture_output=True,
            text=True,
            env=env
        )

        # It should exit 0 because rules are 'warn' by default in the repo.
        self.assertEqual(result.returncode, 0, f"Script failed with: {result.stderr}")
        self.assertIn("Rule EG-001-global-listeners violation", result.stdout)
        self.assertIn("bad_global_listener.example", result.stdout)

        # Should not flag good file
        # Note: if the good file contains "addEventListener" in comments it might flag depending on regex.
        # The regex is "addEventListener\(" so "const x = 1;" is safe.
        self.assertNotIn("good_no_listener.example: Avoid unbounded", result.stdout)

    def test_fail_mode(self):
        script = os.path.abspath(os.path.join(os.path.dirname(__file__), "../entropy_guard.py"))
        fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "fixtures"))
        rules_path = os.path.join(fixtures_dir, "fail_rules.yaml")

        env = os.environ.copy()
        env["SUMMIT_ENTROPY_GUARD"] = "on"
        env["SUMMIT_ENTROPY_RULES"] = rules_path

        result = subprocess.run(
            [sys.executable, script, fixtures_dir],
            capture_output=True,
            text=True,
            env=env
        )

        self.assertNotEqual(result.returncode, 0, "Script should fail when rules are in fail mode")
        self.assertIn("FAILED", result.stdout)
        self.assertIn("EG-TEST-FAIL", result.stdout)

if __name__ == '__main__':
    unittest.main()
