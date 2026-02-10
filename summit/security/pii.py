import re
from typing import Dict, Any, List


class PIIRedactor:
    def __init__(self, additional_patterns: List[str] = None):
        self.patterns = {
            "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            "phone": r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
            "ssn": r"\d{3}-\d{2}-\d{4}",
            "credit_card": r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}"
        }
        if additional_patterns:
            for i, pat in enumerate(additional_patterns):
                self.patterns[f"custom_{i}"] = pat

    def redact_text(self, text: str) -> str:
        redacted = text
        for name, pattern in self.patterns.items():
            redacted = re.sub(pattern, f"[REDACTED_{name.upper()}]", redacted)
        return redacted

    def redact_structured(self, data: Dict[str, Any], sensitive_keys: List[str] = None) -> Dict[str, Any]:
        sensitive_keys = sensitive_keys or ["password", "secret", "token", "ssn"]

        def _redact_recursive(obj):
            if isinstance(obj, dict):
                return {
                    k: ("[REDACTED_KEY]" if k in sensitive_keys else _redact_recursive(v))
                    for k, v in obj.items()
                }
            elif isinstance(obj, list):
                return [_redact_recursive(item) for item in obj]
            elif isinstance(obj, str):
                return self.redact_text(obj)
            else:
                return obj

        return _redact_recursive(data)

def enforce_never_embed(data: Dict[str, Any], never_embed_keys: List[str]) -> Dict[str, Any]:
    """Strictly removes keys that should never even be considered for embedding."""
    return {k: v for k, v in data.items() if k not in never_embed_keys}
