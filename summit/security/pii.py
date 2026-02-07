import re

class PIIRedactor:
    def __init__(self):
        self.patterns = {
            "email": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
            "phone": re.compile(r"\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b"),
            "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
        }

    def redact_text(self, text: str) -> str:
        redacted = text
        for label, pattern in self.patterns.items():
            redacted = pattern.sub(f"[REDACTED_{label.upper()}]", redacted)
        return redacted
