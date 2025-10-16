import datetime
import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
sys.path.insert(0, project_root)

from server.src.governance.access_manager import (
    check_access,
    check_warrant_and_authority,
    enforce_license_and_tos,
)
from server.src.governance.audit_logger import (
    detect_misuse_and_poisoning,
    log_audit_event,
    prompt_reason_for_access,
)


class TestGovernanceStubs(unittest.TestCase):

    def test_check_access_opa_reader_allowed(self):
        user = {"id": "reader_user", "roles": ["reader"]}
        self.assertTrue(check_access(user, "data", "read"))

    def test_check_access_opa_reader_denied_write(self):
        user = {"id": "reader_user", "roles": ["reader"]}
        self.assertFalse(check_access(user, "data", "write"))

    def test_check_access_opa_writer_allowed(self):
        user = {"id": "writer_user", "roles": ["writer"]}
        self.assertTrue(check_access(user, "data", "write"))

    def test_check_access_opa_writer_denied_read(self):
        user = {"id": "writer_user", "roles": ["writer"]}
        self.assertFalse(check_access(user, "data", "read"))

    def test_check_access_opa_unauthorized(self):
        user = {"id": "guest_user", "roles": ["guest"]}
        self.assertFalse(check_access(user, "data", "read"))

    def test_check_warrant_and_authority_authorized(self):
        context = {"warrant_id": "W123", "authority_level": 3}
        result = check_warrant_and_authority(context)
        self.assertTrue(result["authorized"])

    def test_check_warrant_and_authority_unauthorized(self):
        context = {"warrant_id": "W123", "authority_level": 1}
        result = check_warrant_and_authority(context)
        self.assertFalse(result["authorized"])

    def test_enforce_license_and_tos_allowed(self):
        context = {"license_agreed": True, "tos_version": 1.0}
        result = enforce_license_and_tos(context)
        self.assertTrue(result["allowed"])

    def test_enforce_license_and_tos_blocked(self):
        context = {"license_agreed": False, "tos_version": 1.0}
        result = enforce_license_and_tos(context)
        self.assertFalse(result["allowed"])

    def test_log_audit_event(self):
        # Just ensure it runs without error
        try:
            log_audit_event(
                "test_user",
                "data_access",
                "testing",
                datetime.datetime.now(),
                {"file": "report.pdf"},
            )
            self.assertTrue(True)
        except Exception as e:
            self.fail(f"log_audit_event raised an exception: {e}")

    def test_prompt_reason_for_access(self):
        reason = prompt_reason_for_access("test_user", "customer_records")
        self.assertIn("User test_user provided reason", reason)

    def test_detect_misuse_and_poisoning(self):
        logs = [
            {"who": "user1", "what": "login", "details": {}},
            {"who": "user2", "what": "data_mod", "details": {"unusual_activity": True}},
            {"who": "user3", "what": "data_ingest", "details": {"data_poisoning_attempt": True}},
        ]
        alerts = detect_misuse_and_poisoning(logs)
        self.assertEqual(len(alerts), 2)
        self.assertIn("Misuse alert", alerts[0])
        self.assertIn("Poisoning alert", alerts[1])


if __name__ == "__main__":
    unittest.main()
