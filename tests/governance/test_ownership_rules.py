import json
import subprocess
import unittest


class TestOwnershipRules(unittest.TestCase):
    def test_drift_check_passes(self):
        """Test that the drift check passes on the current codebase."""
        result = subprocess.run(
            ["python3", "scripts/governance/check_ownership_drift.py"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("Ownership Audit Passed", result.stdout)

    def test_routing_safety(self):
        """Test that safety decisions route to security team."""
        result = subprocess.run(
            ["python3", "scripts/governance/route_decision.py", "--type", "safety"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0)
        data = json.loads(result.stdout)
        self.assertIn("@intelgraph/security-team", data["approvers"])
        self.assertEqual(data["escalation"], "CISO")

    def test_routing_feature_requires_domain(self):
        """Test that feature decisions require a domain."""
        result = subprocess.run(
            ["python3", "scripts/governance/route_decision.py", "--type", "feature"],
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        # Check stdout because the script prints error to stdout then exits with 1
        # Actually checking the script code:
        # if not args.domain:
        #    print("Error: ...")
        #    sys.exit(1)
        # Wait, previous run showed output in result.result, which is stdout/stderr combined for run_in_bash_session tool?
        # But here in python subprocess, capture_output splits them.
        # Let's check both or just checking return code might be enough, but let's be robust.

        output = result.stdout + result.stderr
        self.assertIn("error", output.lower())

    def test_agent_boundaries_documented(self):
        """Test that AGENTS.md contains the required sections."""
        with open("AGENTS.md") as f:
            content = f.read()

        self.assertIn("Agents Cannot Self-Approve", content)
        self.assertIn("Partner Submissions Require Owner Sign-Off", content)
        self.assertIn("Non-Human Authority", content)

    def test_codeowners_syntax(self):
        """Basic syntax check for CODEOWNERS."""
        with open("CODEOWNERS") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split()
                self.assertGreaterEqual(len(parts), 2, f"Invalid line in CODEOWNERS: {line}")
                self.assertTrue(
                    parts[0].startswith("/") or parts[0] == "*", f"Invalid path: {parts[0]}"
                )
                self.assertTrue(
                    parts[1].startswith("@") or "@" in parts[1], f"Invalid owner: {parts[1]}"
                )


if __name__ == "__main__":
    unittest.main()
