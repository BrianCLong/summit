import unittest
import os
from trustable_ai.audit.logger import AuditLogger

class TestAuditLogger(unittest.TestCase):
    def setUp(self):
        os.environ["TRUST_AUDIT_ENABLED"] = "1"
        self.logger = AuditLogger()

    def test_log_valid_data(self):
        # Should not raise
        self.logger.log("user_action", {"action": "click", "target": "button"})

    def test_log_forbidden_key_raises_error(self):
        with self.assertRaises(ValueError):
            self.logger.log("login_attempt", {"username": "alice", "password": "123"})

        with self.assertRaises(ValueError):
            self.logger.log("api_call", {"token": "xyz"})

if __name__ == "__main__":
    unittest.main()
