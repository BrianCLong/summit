import re
from typing import Dict, Any, Union

class Redactor:
    def __init__(self):
        # Simple regex patterns for demonstration
        self.patterns = {
            "EMAIL": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "CREDIT_CARD": r"\d{4}-\d{4}-\d{4}-\d{4}",
        }

    def redact_text(self, text: str) -> str:
        """Redact sensitive information from text."""
        if not isinstance(text, str):
            return text

        redacted = text
        for label, pattern in self.patterns.items():
            redacted = re.sub(pattern, f"<{label}>", redacted)
        return redacted

    def redact_obj(self, obj: Any) -> Any:
        """Recursively redact dictionary or list."""
        if isinstance(obj, dict):
            return {k: self.redact_obj(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.redact_obj(i) for i in obj]
        elif isinstance(obj, str):
            return self.redact_text(obj)
        else:
            return obj
