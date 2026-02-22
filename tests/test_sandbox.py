import os
import unittest

from summit.agents.sandbox import SandboxDeny, run_tool, sandbox_enabled


class TestSandbox(unittest.TestCase):
    def test_sandbox_default_off(self):
        if "SUMMIT_AGENTIC_SANDBOX" in os.environ:
            del os.environ["SUMMIT_AGENTIC_SANDBOX"]
        self.assertFalse(sandbox_enabled())
        with self.assertRaises(SandboxDeny):
            run_tool("git", {})

    def test_sandbox_enabled(self):
        os.environ["SUMMIT_AGENTIC_SANDBOX"] = "1"
        self.assertTrue(sandbox_enabled())
        res = run_tool("git", {})
        self.assertEqual(res["status"], "success")

    def test_sandbox_allowlist(self):
        os.environ["SUMMIT_AGENTIC_SANDBOX"] = "1"
        with self.assertRaises(SandboxDeny):
            run_tool("unauthorized_tool", {})

if __name__ == "__main__":
    unittest.main()
