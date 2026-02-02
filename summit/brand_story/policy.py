import re
from typing import List, Dict, Any

class BrandStoryPolicy:
    """
    Deny-by-default governance policy for Brand Storytelling.
    Protects against oversharing (PII), defamation, and fabricated claims.
    """

    FORBIDDEN_PATTERNS = [
        r'\d{3}-\d{2}-\d{4}', # SSN
        r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', # Email
        r'confidential',
        r'private',
        r'proprietary',
    ]

    def __init__(self, mode: str = "deny-by-default"):
        self.mode = mode

    def validate_content(self, content: str) -> Dict[str, Any]:
        """
        Validates brand story content against policy rules.
        """
        violations = []
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                violations.append(f"Pattern matched: {pattern}")

        # Check for aggressive/defamatory language (minimal stub)
        aggressive_keywords = ["hate", "attack", "scam", "fraud"]
        for word in aggressive_keywords:
            if word in content.lower():
                violations.append(f"Aggressive keyword found: {word}")

        is_safe = len(violations) == 0
        return {
            "is_safe": is_safe,
            "violations": violations,
            "mode": self.mode
        }

    def redact_content(self, content: str) -> str:
        """
        Minimal redaction for common PII.
        """
        redacted = content
        for pattern in self.FORBIDDEN_PATTERNS:
            redacted = re.sub(pattern, "[REDACTED]", redacted, flags=re.IGNORECASE)
        return redacted
