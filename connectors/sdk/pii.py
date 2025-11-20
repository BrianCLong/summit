"""PII detection and handling for connectors."""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class PIISeverity(Enum):
    """Severity levels for PII data."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RedactionPolicy(Enum):
    """Redaction policies for PII fields."""

    ALLOW = "allow"  # Allow the data through as-is
    REDACT = "redact"  # Redact/mask the PII
    BLOCK = "block"  # Block ingestion of this field entirely
    PROMPT = "prompt"  # Prompt user for decision


@dataclass
class PIIField:
    """Configuration for a PII-sensitive field."""

    field_name: str
    description: str
    severity: PIISeverity
    redaction_policy: RedactionPolicy
    legal_basis: Optional[str] = None
    pattern: Optional[str] = None  # Regex pattern for detection


class PIIDetector:
    """
    Detects and handles PII in data according to configured policies.
    """

    # Common PII patterns
    PATTERNS = {
        "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        "phone": r"(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "credit_card": r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b",
        "ip_address": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
        "name": r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",  # Simple name pattern
    }

    def __init__(self, pii_fields: List[PIIField]):
        self.pii_fields = {field.field_name: field for field in pii_fields}
        self.detection_log = []

    def scan_value(self, value: Any, field_name: str = None) -> Dict[str, Any]:
        """
        Scan a value for PII.

        Returns:
            Dict with keys: contains_pii, pii_types, severity
        """
        if not isinstance(value, str):
            return {"contains_pii": False, "pii_types": [], "severity": None}

        detected_types = []

        # Check against known patterns
        for pii_type, pattern in self.PATTERNS.items():
            if re.search(pattern, str(value)):
                detected_types.append(pii_type)

        # Check if field is explicitly marked as PII
        if field_name and field_name in self.pii_fields:
            detected_types.append(f"configured:{field_name}")

        if detected_types:
            max_severity = self._get_max_severity(field_name)
            return {
                "contains_pii": True,
                "pii_types": detected_types,
                "severity": max_severity.value if max_severity else PIISeverity.MEDIUM.value,
                "field_name": field_name,
            }

        return {"contains_pii": False, "pii_types": [], "severity": None}

    def _get_max_severity(self, field_name: str) -> Optional[PIISeverity]:
        """Get the maximum severity for a field."""
        if field_name and field_name in self.pii_fields:
            return self.pii_fields[field_name].severity
        return PIISeverity.MEDIUM

    def apply_redaction_policy(self, value: Any, field_name: str) -> tuple[Any, bool]:
        """
        Apply redaction policy to a value.

        Returns:
            (redacted_value, should_block)
        """
        if field_name not in self.pii_fields:
            return value, False

        field = self.pii_fields[field_name]
        policy = field.redaction_policy

        if policy == RedactionPolicy.ALLOW:
            return value, False

        elif policy == RedactionPolicy.BLOCK:
            self.detection_log.append(
                {
                    "field": field_name,
                    "action": "blocked",
                    "reason": field.description,
                }
            )
            return None, True

        elif policy == RedactionPolicy.REDACT:
            redacted = self._redact_value(value, field)
            self.detection_log.append(
                {
                    "field": field_name,
                    "action": "redacted",
                    "reason": field.description,
                }
            )
            return redacted, False

        elif policy == RedactionPolicy.PROMPT:
            # In CLI wizard, this will trigger a user prompt
            return value, False

        return value, False

    def _redact_value(self, value: Any, field: PIIField) -> str:
        """Redact a PII value."""
        if not isinstance(value, str):
            return "[REDACTED]"

        # Use pattern if provided
        if field.pattern:
            return re.sub(field.pattern, "[REDACTED]", value)

        # Generic redaction - show first and last 2 chars
        if len(value) > 4:
            return f"{value[:2]}{'*' * (len(value) - 4)}{value[-2:]}"
        else:
            return "*" * len(value)

    def process_record(self, record: Dict[str, Any]) -> tuple[Dict[str, Any], List[Dict]]:
        """
        Process a full record, applying PII policies.

        Returns:
            (processed_record, pii_detections)
        """
        processed = {}
        detections = []

        for field_name, value in record.items():
            # Scan for PII
            scan_result = self.scan_value(value, field_name)
            if scan_result["contains_pii"]:
                detections.append(scan_result)

            # Apply redaction policy
            redacted_value, should_block = self.apply_redaction_policy(value, field_name)

            if not should_block:
                processed[field_name] = redacted_value

        return processed, detections

    def get_pii_report(self) -> Dict[str, Any]:
        """Get a summary report of PII detections."""
        return {
            "total_actions": len(self.detection_log),
            "actions": self.detection_log,
            "fields_with_pii": list(set(entry["field"] for entry in self.detection_log)),
        }

    def get_field_info(self, field_name: str) -> Optional[PIIField]:
        """Get PII configuration for a specific field."""
        return self.pii_fields.get(field_name)
