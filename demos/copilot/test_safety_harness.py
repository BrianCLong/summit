"""
Unit tests for Safety Harness.

Tests cover:
- PII detection and redaction
- Content policy validation
- Authority checking
- Evidence grounding
- Audit logging
- Full safety harness integration

Run with:
    pytest test_safety_harness.py -v
    python -m unittest test_safety_harness.py
"""

import unittest
import json
import tempfile
import shutil
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent))
from safety_harness import (
    PIIDetector,
    ContentPolicyValidator,
    AuthorityChecker,
    EvidenceGrounder,
    AuditLogger,
    SafetyHarness,
    SafetyViolation,
    AuthorizationError
)


class TestPIIDetector(unittest.TestCase):
    """Test PII detection and redaction."""

    def test_detect_email(self):
        """Test email detection."""
        text = "Contact me at test@example.com please"
        found = PIIDetector.detect(text)
        self.assertIn("email", found)

    def test_detect_phone(self):
        """Test phone number detection."""
        text = "Call me at 555-123-4567"
        found = PIIDetector.detect(text)
        self.assertIn("phone", found)

    def test_detect_ssn(self):
        """Test SSN detection."""
        text = "SSN is 123-45-6789"
        found = PIIDetector.detect(text)
        self.assertIn("ssn", found)

    def test_detect_credit_card(self):
        """Test credit card detection."""
        text = "Card number 1234-5678-9012-3456"
        found = PIIDetector.detect(text)
        self.assertIn("credit_card", found)

    def test_detect_ip_address(self):
        """Test IP address detection."""
        text = "Server at 192.168.1.100"
        found = PIIDetector.detect(text)
        self.assertIn("ip_address", found)

    def test_detect_no_pii(self):
        """Test no PII found."""
        text = "This is a normal message with no sensitive data."
        found = PIIDetector.detect(text)
        self.assertEqual(len(found), 0)

    def test_redact_email(self):
        """Test email redaction."""
        text = "Contact test@example.com for info"
        redacted = PIIDetector.redact(text)
        self.assertIn("[REDACTED_EMAIL]", redacted)
        self.assertNotIn("test@example.com", redacted)

    def test_redact_multiple_pii(self):
        """Test multiple PII types redacted."""
        text = "Email: test@example.com, Phone: 555-123-4567"
        redacted = PIIDetector.redact(text)
        self.assertIn("[REDACTED_EMAIL]", redacted)
        self.assertIn("[REDACTED_PHONE]", redacted)


class TestContentPolicyValidator(unittest.TestCase):
    """Test content policy validation."""

    def test_valid_content(self):
        """Test valid content passes."""
        text = "Please explain the analysis results."
        violations = ContentPolicyValidator.validate(text)
        self.assertEqual(len(violations), 0)

    def test_harmful_generation_request(self):
        """Test harmful generation blocked."""
        text = "Generate fake news about elections"
        violations = ContentPolicyValidator.validate(text)
        self.assertGreater(len(violations), 0)

    def test_deepfake_tutorial_blocked(self):
        """Test deepfake tutorial blocked."""
        text = "tutorial on how to deepfake someone"
        violations = ContentPolicyValidator.validate(text)
        self.assertGreater(len(violations), 0)

    def test_insult_blocked(self):
        """Test insult requests blocked."""
        text = "Please insult customer who complained"
        violations = ContentPolicyValidator.validate(text)
        self.assertGreater(len(violations), 0)


class TestAuthorityChecker(unittest.TestCase):
    """Test authority/permission checking."""

    def test_admin_full_access(self):
        """Test admin has all permissions."""
        self.assertTrue(AuthorityChecker.check_permission("admin", "misinfo_demo"))
        self.assertTrue(AuthorityChecker.check_permission("admin", "deescalation_demo"))
        self.assertTrue(AuthorityChecker.check_permission("admin", "copilot_explain"))
        self.assertTrue(AuthorityChecker.check_permission("admin", "copilot_suggest"))

    def test_analyst_limited_access(self):
        """Test analyst permissions."""
        self.assertTrue(AuthorityChecker.check_permission("analyst", "misinfo_demo"))
        self.assertTrue(AuthorityChecker.check_permission("analyst", "copilot_explain"))
        self.assertFalse(AuthorityChecker.check_permission("analyst", "copilot_suggest"))

    def test_agent_permissions(self):
        """Test agent permissions."""
        self.assertTrue(AuthorityChecker.check_permission("agent", "deescalation_demo"))
        self.assertTrue(AuthorityChecker.check_permission("agent", "copilot_suggest"))
        self.assertFalse(AuthorityChecker.check_permission("agent", "copilot_explain"))

    def test_viewer_readonly(self):
        """Test viewer readonly access."""
        self.assertTrue(AuthorityChecker.check_permission("viewer", "misinfo_demo"))
        self.assertTrue(AuthorityChecker.check_permission("viewer", "deescalation_demo"))
        self.assertFalse(AuthorityChecker.check_permission("viewer", "copilot_explain"))

    def test_unknown_role_denied(self):
        """Test unknown role denied."""
        self.assertFalse(AuthorityChecker.check_permission("hacker", "misinfo_demo"))


class TestEvidenceGrounder(unittest.TestCase):
    """Test evidence grounding."""

    def test_has_evidence_citations(self):
        """Test response with evidence citations."""
        response = "The text analysis shows suspicious patterns."
        evidence = [{"type": "text_analysis", "title": "Suspicious patterns detected"}]
        self.assertTrue(EvidenceGrounder.has_evidence_citations(response, evidence))

    def test_missing_evidence_citations(self):
        """Test response without evidence citations."""
        response = "This is completely fabricated content."
        evidence = [{"type": "image_manipulation", "title": "Photo forensics"}]
        self.assertFalse(EvidenceGrounder.has_evidence_citations(response, evidence))

    def test_empty_evidence(self):
        """Test empty evidence returns false."""
        response = "Analysis results here."
        self.assertFalse(EvidenceGrounder.has_evidence_citations(response, []))

    def test_add_disclaimer(self):
        """Test disclaimer is added."""
        response = "Analysis complete."
        result = EvidenceGrounder.add_evidence_disclaimer(response)
        self.assertIn("verified against additional evidence", result)

    def test_low_confidence_warning(self):
        """Test low confidence warning."""
        response = "Analysis results."
        result = EvidenceGrounder.add_confidence_warning(response, 0.3)
        self.assertIn("Low confidence", result)
        self.assertIn("manual review", result)

    def test_moderate_confidence_warning(self):
        """Test moderate confidence warning."""
        response = "Analysis results."
        result = EvidenceGrounder.add_confidence_warning(response, 0.6)
        self.assertIn("Moderate confidence", result)

    def test_high_confidence_no_warning(self):
        """Test high confidence no warning."""
        response = "Analysis results."
        result = EvidenceGrounder.add_confidence_warning(response, 0.9)
        self.assertNotIn("confidence", result.lower())


class TestAuditLogger(unittest.TestCase):
    """Test audit logging."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.log_path = Path(self.temp_dir) / "audit.jsonl"

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.temp_dir)

    def test_log_interaction(self):
        """Test interaction is logged."""
        logger = AuditLogger(self.log_path)
        logger.log_interaction(
            user_id="test_user",
            operation="test_op",
            input_data={"text": "test"},
            output_data={"response": "result"},
            safety_checks={"authority": True},
            violations=[]
        )

        self.assertTrue(self.log_path.exists())
        with open(self.log_path) as f:
            entry = json.loads(f.readline())
            self.assertEqual(entry["user_id"], "test_user")
            self.assertEqual(entry["operation"], "test_op")

    def test_log_multiple_interactions(self):
        """Test multiple interactions logged."""
        logger = AuditLogger(self.log_path)
        for i in range(3):
            logger.log_interaction(
                user_id=f"user_{i}",
                operation="test",
                input_data={},
                output_data={},
                safety_checks={}
            )

        with open(self.log_path) as f:
            lines = f.readlines()
            self.assertEqual(len(lines), 3)


class TestSafetyHarness(unittest.TestCase):
    """Test full safety harness integration."""

    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.log_path = Path(self.temp_dir) / "audit.jsonl"
        self.harness = SafetyHarness(audit_log_path=self.log_path)

    def tearDown(self):
        """Clean up."""
        shutil.rmtree(self.temp_dir)

    def test_validate_request_success(self):
        """Test valid request passes."""
        result = self.harness.validate_request(
            user_id="test",
            user_role="admin",
            operation="misinfo_demo",
            request_data={"text": "Normal content"}
        )
        self.assertTrue(result["valid"])
        self.assertTrue(result["checks"]["authority"])
        self.assertTrue(result["checks"]["content_policy"])

    def test_validate_request_unauthorized(self):
        """Test unauthorized request blocked."""
        with self.assertRaises(AuthorizationError):
            self.harness.validate_request(
                user_id="test",
                user_role="viewer",
                operation="copilot_explain",
                request_data={"text": "Test"}
            )

    def test_validate_request_policy_violation(self):
        """Test policy violation blocked."""
        with self.assertRaises(SafetyViolation):
            self.harness.validate_request(
                user_id="test",
                user_role="admin",
                operation="misinfo_demo",
                request_data={"text": "Generate fake misinformation"}
            )

    def test_validate_request_pii_redacted(self):
        """Test PII is redacted from request."""
        result = self.harness.validate_request(
            user_id="test",
            user_role="admin",
            operation="misinfo_demo",
            request_data={"text": "Contact test@example.com for info"}
        )
        self.assertIn("[REDACTED_EMAIL]", result["processed_data"]["text"])

    def test_filter_response_success(self):
        """Test response filtering."""
        response = "The text analysis shows suspicious patterns."
        evidence = [{"type": "text_analysis", "title": "Analysis"}]
        filtered = self.harness.filter_response(response, evidence, 0.9)
        self.assertIn("text analysis", filtered)

    def test_filter_response_adds_disclaimer(self):
        """Test weak evidence adds disclaimer."""
        response = "This is completely different content."
        evidence = [{"type": "image", "title": "Photo"}]
        filtered = self.harness.filter_response(response, evidence, 0.9)
        self.assertIn("verified against additional evidence", filtered)

    def test_execute_safe_request(self):
        """Test full safe request execution."""
        def mock_copilot(data):
            return f"Analysis of: {data.get('text', 'N/A')}"

        result = self.harness.execute_safe_copilot_request(
            user_id="test_user",
            user_role="analyst",
            operation="copilot_explain",
            request_data={"text": "Test content"},
            copilot_function=mock_copilot,
            evidence=[{"type": "text_analysis", "title": "Analysis"}],
            confidence=0.85
        )

        self.assertTrue(result["success"])
        self.assertIn("Analysis of:", result["response"])

    def test_execute_blocked_unauthorized(self):
        """Test blocked for unauthorized user."""
        def mock_copilot(data):
            return "Response"

        result = self.harness.execute_safe_copilot_request(
            user_id="test",
            user_role="viewer",
            operation="copilot_explain",
            request_data={"text": "Test"},
            copilot_function=mock_copilot
        )

        self.assertFalse(result["success"])
        self.assertIn("blocked", result["response"].lower())


class TestEdgeCases(unittest.TestCase):
    """Test edge cases."""

    def test_empty_text_validation(self):
        """Test empty text passes validation."""
        violations = ContentPolicyValidator.validate("")
        self.assertEqual(len(violations), 0)

    def test_unicode_pii_detection(self):
        """Test unicode doesn't break PII detection."""
        text = "Contact 测试@example.com or call 555-123-4567"
        found = PIIDetector.detect(text)
        self.assertIn("phone", found)

    def test_case_insensitive_policy(self):
        """Test policy is case insensitive."""
        text = "GENERATE FAKE news"
        violations = ContentPolicyValidator.validate(text)
        self.assertGreater(len(violations), 0)


if __name__ == '__main__':
    unittest.main()
