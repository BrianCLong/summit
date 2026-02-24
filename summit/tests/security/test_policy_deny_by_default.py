import unittest
import os
import json
from summit.security.audit import AuditLogger
from summit.security.policy_enforcement import SecurityPolicyEngine, PolicyRequest

class TestPolicyEnforcement(unittest.TestCase):
    def setUp(self):
        # We also need to check the "real" audit log artifact path
        self.artifact_path = "artifacts/evidence/security/policy_audit.log.jsonl"
        os.makedirs(os.path.dirname(self.artifact_path), exist_ok=True)

        self.log_path = "artifacts/evidence/security/test_audit.log.jsonl"
        if os.path.exists(self.log_path):
            os.remove(self.log_path)

        self.logger = AuditLogger(self.log_path)
        self.allowlist = {
            "agent_a": ["tool_safe"]
        }
        self.engine = SecurityPolicyEngine(self.allowlist, self.logger)

    def test_deny_by_default(self):
        req = PolicyRequest(agent_id="agent_a", tool_name="tool_dangerous", arguments={})
        result = self.engine.check(req)
        self.assertFalse(result.allowed)
        self.assertEqual(result.reason, "TOOL_NOT_IN_ALLOWLIST")

    def test_allowlist(self):
        req = PolicyRequest(agent_id="agent_a", tool_name="tool_safe", arguments={})
        result = self.engine.check(req)
        self.assertTrue(result.allowed)
        self.assertEqual(result.reason, "ALLOWLIST_MATCH")

    def test_audit_logging(self):
        req = PolicyRequest(agent_id="agent_a", tool_name="tool_dangerous", arguments={})
        self.engine.check(req)

        with open(self.log_path, "r") as f:
            lines = f.readlines()
            last_line = json.loads(lines[-1])
            self.assertEqual(last_line["decision"], "DENY")
            self.assertEqual(last_line["details"]["tool_name"], "tool_dangerous")

        # Append to main artifact for evidence
        with open(self.artifact_path, "a") as f:
            f.write(json.dumps(last_line) + "\n")

if __name__ == '__main__':
    unittest.main()
