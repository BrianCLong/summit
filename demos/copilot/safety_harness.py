"""
Safety Harness for Demo Copilot Interactions

Enforces:
- PII redaction
- Content policy validation
- Authority/License checks
- Evidence grounding
- Audit logging
- Output filtering
"""

import json
import re
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SafetyViolation(Exception):
    """Raised when safety policy is violated."""
    message: str
    violation_type: str


@dataclass
class AuthorizationError(Exception):
    """Raised when user lacks required permissions."""
    message: str


class PIIDetector:
    """Detects and redacts personally identifiable information."""

    # Regex patterns for common PII
    PATTERNS = {
        "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "phone": r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
        "credit_card": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
        "ip_address": r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
    }

    @classmethod
    def detect(cls, text: str) -> List[str]:
        """Detect PII types in text."""
        found = []
        for pii_type, pattern in cls.PATTERNS.items():
            if re.search(pattern, text):
                found.append(pii_type)
        return found

    @classmethod
    def redact(cls, text: str) -> str:
        """Redact PII from text."""
        redacted = text
        for pii_type, pattern in cls.PATTERNS.items():
            redacted = re.sub(pattern, f"[REDACTED_{pii_type.upper()}]", redacted)
        return redacted


class ContentPolicyValidator:
    """Validates content against safety policies."""

    PROHIBITED_PATTERNS = [
        # Harmful generation requests
        r'\b(generate|create|make|produce)\s+(fake|false|misleading|misinformation)\b',
        r'\b(how to|tutorial|guide)\s+(deepfake|manipulate|deceive)\b',

        # Dangerous instructions
        r'\bstep[- ]by[- ]step\b.*\b(fraud|scam|hack)\b',

        # Personal attacks
        r'\b(insult|mock|demean|ridicule)\s+(customer|user|person)\b',
    ]

    @classmethod
    def validate(cls, text: str) -> List[str]:
        """Check if text violates content policy."""
        violations = []
        text_lower = text.lower()

        for pattern in cls.PROHIBITED_PATTERNS:
            if re.search(pattern, text_lower):
                violations.append(f"Prohibited pattern: {pattern}")

        return violations


class AuthorityChecker:
    """Checks user permissions for demo operations."""

    # Simple role-based permissions for demo
    ROLE_PERMISSIONS = {
        "admin": ["misinfo_demo", "deescalation_demo", "copilot_explain", "copilot_suggest"],
        "analyst": ["misinfo_demo", "copilot_explain"],
        "agent": ["deescalation_demo", "copilot_suggest"],
        "viewer": ["misinfo_demo", "deescalation_demo"],
    }

    @classmethod
    def check_permission(cls, user_role: str, operation: str) -> bool:
        """Check if user role has permission for operation."""
        if user_role not in cls.ROLE_PERMISSIONS:
            return False
        return operation in cls.ROLE_PERMISSIONS[user_role]


class EvidenceGrounder:
    """Ensures copilot responses are grounded in evidence."""

    @staticmethod
    def has_evidence_citations(response: str, evidence: List[Dict[str, Any]]) -> bool:
        """Check if response references provided evidence."""
        if not evidence:
            return False

        # Simple check: does response mention evidence types or key terms?
        response_lower = response.lower()
        evidence_terms = set()

        for item in evidence:
            evidence_terms.add(item.get("type", "").lower())
            title = item.get("title", "").lower()
            evidence_terms.update(title.split())

        # At least one evidence term should appear in response
        return any(term in response_lower for term in evidence_terms if len(term) > 3)

    @staticmethod
    def add_evidence_disclaimer(response: str) -> str:
        """Add disclaimer if evidence is weak."""
        disclaimer = "\n\n[Note: This analysis should be verified against additional evidence sources.]"
        return response + disclaimer

    @staticmethod
    def add_confidence_warning(response: str, confidence: float) -> str:
        """Add warning for low-confidence analyses."""
        if confidence < 0.5:
            warning = f"\n\n⚠️ Low confidence ({confidence:.1%}). Recommend manual review."
            return response + warning
        elif confidence < 0.7:
            warning = f"\n\n⚠️ Moderate confidence ({confidence:.1%}). Consider additional verification."
            return response + warning
        return response


class AuditLogger:
    """Logs all copilot interactions for audit trail."""

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def log_interaction(
        self,
        user_id: str,
        operation: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        safety_checks: Dict[str, Any],
        violations: List[str] = None
    ):
        """Log a copilot interaction."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "operation": operation,
            "input_summary": {
                "length": len(str(input_data)),
                "has_pii": bool(PIIDetector.detect(str(input_data)))
            },
            "output_summary": {
                "length": len(str(output_data)),
                "filtered": safety_checks.get("output_filtered", False)
            },
            "safety_checks": safety_checks,
            "violations": violations or []
        }

        # Append to audit log
        with open(self.log_path, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

        logger.info(f"Logged interaction: {operation} for user {user_id}")


class SafetyHarness:
    """
    Main safety harness for demo copilot interactions.

    Enforces all safety policies and provides safe interface to copilot.
    """

    def __init__(self, audit_log_path: Path = None):
        if audit_log_path is None:
            audit_log_path = Path(__file__).parent.parent / "logs" / "copilot_audit.jsonl"

        self.audit_logger = AuditLogger(audit_log_path)

    def validate_request(
        self,
        user_id: str,
        user_role: str,
        operation: str,
        request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate copilot request before processing.

        Returns:
            Dict with validation results and processed data

        Raises:
            SafetyViolation: If request violates safety policy
            AuthorizationError: If user lacks permissions
        """
        validation_result = {
            "valid": False,
            "processed_data": None,
            "checks": {
                "authority": False,
                "pii_redacted": False,
                "content_policy": False
            },
            "violations": []
        }

        # Check authority
        if not AuthorityChecker.check_permission(user_role, operation):
            raise AuthorizationError(
                f"User role '{user_role}' lacks permission for operation '{operation}'"
            )
        validation_result["checks"]["authority"] = True

        # Check for PII and redact
        text_to_check = str(request_data)
        pii_found = PIIDetector.detect(text_to_check)

        if pii_found:
            logger.warning(f"PII detected: {pii_found}")
            # Redact PII from request data
            if "text" in request_data:
                request_data["text"] = PIIDetector.redact(request_data["text"])
            if "customer_message" in request_data:
                request_data["customer_message"] = PIIDetector.redact(request_data["customer_message"])

        validation_result["checks"]["pii_redacted"] = True

        # Validate content policy
        policy_violations = ContentPolicyValidator.validate(text_to_check)
        if policy_violations:
            validation_result["violations"].extend(policy_violations)
            raise SafetyViolation(
                message=f"Content policy violations: {policy_violations}",
                violation_type="content_policy"
            )

        validation_result["checks"]["content_policy"] = True
        validation_result["valid"] = True
        validation_result["processed_data"] = request_data

        return validation_result

    def filter_response(
        self,
        response: str,
        evidence: List[Dict[str, Any]] = None,
        confidence: float = None
    ) -> str:
        """
        Filter copilot response before returning to user.

        Ensures:
        - Evidence grounding
        - Confidence markers
        - No harmful content
        """
        filtered = response

        # Check for harmful content
        violations = ContentPolicyValidator.validate(filtered)
        if violations:
            logger.error(f"Output violations detected: {violations}")
            return "Response filtered due to safety policy violation."

        # Add evidence grounding
        if evidence and not EvidenceGrounder.has_evidence_citations(filtered, evidence):
            logger.warning("Weak evidence grounding detected")
            filtered = EvidenceGrounder.add_evidence_disclaimer(filtered)

        # Add confidence warnings
        if confidence is not None:
            filtered = EvidenceGrounder.add_confidence_warning(filtered, confidence)

        return filtered

    def execute_safe_copilot_request(
        self,
        user_id: str,
        user_role: str,
        operation: str,
        request_data: Dict[str, Any],
        copilot_function: callable,
        evidence: List[Dict[str, Any]] = None,
        confidence: float = None
    ) -> Dict[str, Any]:
        """
        Execute copilot request with full safety harness.

        This is the main entry point for all copilot operations.

        Args:
            user_id: Unique user identifier
            user_role: User's role (admin, analyst, agent, viewer)
            operation: Operation name (e.g., "explain_detection")
            request_data: Input data for copilot
            copilot_function: Function to call for copilot response
            evidence: Evidence to ground response in
            confidence: Confidence score for validation

        Returns:
            Dict with safe response and metadata
        """
        result = {
            "success": False,
            "response": None,
            "metadata": {
                "safety_checks": {},
                "violations": []
            }
        }

        try:
            # Validate request
            validation = self.validate_request(user_id, user_role, operation, request_data)
            result["metadata"]["safety_checks"] = validation["checks"]

            # Execute copilot (mock for demo)
            raw_response = copilot_function(validation["processed_data"])

            # Filter response
            filtered_response = self.filter_response(raw_response, evidence, confidence)

            result["success"] = True
            result["response"] = filtered_response

        except (SafetyViolation, AuthorizationError) as e:
            result["success"] = False
            result["response"] = f"Request blocked: {e.message}"
            result["metadata"]["violations"].append(str(e))

        except Exception as e:
            logger.error(f"Unexpected error in copilot request: {e}")
            result["success"] = False
            result["response"] = "An error occurred processing your request."
            result["metadata"]["violations"].append(f"internal_error: {str(e)}")

        finally:
            # Always log interaction
            self.audit_logger.log_interaction(
                user_id=user_id,
                operation=operation,
                input_data=request_data,
                output_data={"response": result.get("response", "")},
                safety_checks=result["metadata"]["safety_checks"],
                violations=result["metadata"]["violations"]
            )

        return result


# Example usage for demos
def demo_safe_copilot_call():
    """Demonstrate safe copilot call with safety harness."""

    harness = SafetyHarness()

    # Mock copilot function
    def mock_copilot_explain(data: Dict[str, Any]) -> str:
        return f"Analysis of content: {data.get('text', 'N/A')}"

    # Example: Safe request
    result = harness.execute_safe_copilot_request(
        user_id="demo_user_001",
        user_role="analyst",
        operation="copilot_explain",
        request_data={
            "text": "This is a test post about misinformation detection"
        },
        copilot_function=mock_copilot_explain,
        evidence=[{"type": "text_analysis", "title": "Suspicious patterns"}],
        confidence=0.85
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    demo_safe_copilot_call()
