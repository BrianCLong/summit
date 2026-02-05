from __future__ import annotations
from typing import List, Dict, Any
from summit.security.pii import PIIRedactor

class ResearcherSecurity:
    def __init__(self):
        self.pii_redactor = PIIRedactor()
        self.injection_keywords = ["ignore previous instructions", "reveal your system prompt", "you are now a"]

    def scan_and_redact(self, text: str) -> str:
        """
        Scans for PII and redacts it.
        """
        return self.pii_redactor.redact_text(text)

    def detect_injection(self, text: str) -> bool:
        """
        Detects potential prompt injection patterns in retrieved content.
        """
        lowered = text.lower()
        return any(kw in lowered for kw in self.injection_keywords)

    def validate_source_content(self, text: str) -> Dict[str, Any]:
        """
        Performs full security validation on source content.
        """
        injection = self.detect_injection(text)
        redacted_text = self.scan_and_redact(text)

        return {
            "safe": not injection,
            "redacted_text": redacted_text,
            "warnings": ["POTENTIAL_INJECTION"] if injection else []
        }
