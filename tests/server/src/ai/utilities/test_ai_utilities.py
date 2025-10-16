import os
import sys
import unittest

# Add the project root to sys.path to allow absolute imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))
sys.path.insert(0, project_root)

from server.src.ai.utilities.ai_utilities import (
    apply_guardrails,
    extract_text_from_document,
    log_xai_audit,
    redact_sensitive_info,
)


class TestAiUtilitiesStubs(unittest.TestCase):

    def test_extract_text_from_document(self):
        result = extract_text_from_document("dummy.pdf")
        self.assertEqual(result, "Extracted text content.")

    def test_redact_sensitive_info(self):
        result = redact_sensitive_info("My SSN is 123-45-6789", {"ssn": True})
        self.assertEqual(result, "[REDACTED] text content.")

    def test_apply_guardrails(self):
        result = apply_guardrails({"input": "malicious"}, ["no_malicious_input"])
        self.assertTrue(result)

    def test_log_xai_audit(self):
        # This function doesn't return anything, just ensure it runs without error
        try:
            log_xai_audit("query_execution", {"user": "test", "query": "MATCH (n) RETURN n"})
            self.assertTrue(True)  # If no exception, test passes
        except Exception as e:
            self.fail(f"log_xai_audit raised an exception: {e}")


if __name__ == "__main__":
    unittest.main()
