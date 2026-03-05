import re
from typing import List, Set


class AmbientPolicy:
    """Policy controls for the ambient capture memory plane.
    Enforces exclusions (apps/domains), private-mode signals, and sensitive field suppression.
    """
    def __init__(self):
        # Default exclusions
        self.excluded_apps: set[str] = {"incognito", "private", "1password", "keychain", "bank", "wallet"}
        self.excluded_domains: set[str] = {"bank.com", "secure.com", "login", "auth"}

        # Simple regex patterns for basic redaction (credit cards, ssn, typical password patterns)
        self.sensitive_patterns: list[re.Pattern] = [
            # Dummy credit card pattern
            re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
            # Dummy SSN pattern
            re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
            # "Password: xxx" pattern
            re.compile(r'(?i)(password|passwd|pwd)\s*[:=]\s*\S+')
        ]

    def evaluate_exclusions(self, app: str, uri: str) -> bool:
        """
        Evaluate if a moment should be captured based on its app and uri.
        Returns True if ALLOWED (not excluded), False if BLOCKED (excluded).
        """
        app_lower = app.lower()
        uri_lower = uri.lower()

        for excl_app in self.excluded_apps:
            if excl_app in app_lower:
                return False

        for excl_domain in self.excluded_domains:
            if excl_domain in uri_lower:
                return False

        return True

    def redact_sensitive_data(self, text: str) -> str:
        """
        Suppress sensitive fields in the text using regex patterns.
        """
        redacted_text = text
        for pattern in self.sensitive_patterns:
            redacted_text = pattern.sub('[REDACTED]', redacted_text)
        return redacted_text
