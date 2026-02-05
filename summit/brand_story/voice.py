import re
from typing import List, Dict, Any

class AuthenticityLinter:
    def __init__(self, truthfulness_mode: bool = True):
        self.truthfulness_mode = truthfulness_mode
        self.markers = ["felt", "realized", "learned", "risk", "moment"]

    def lint(self, text: str) -> Dict[ Any, Any]:
        found_markers = [m for m in self.markers if m in text.lower()]
        score = len(found_markers) / len(self.markers)

        issues = []
        if self.truthfulness_mode:
            if "literally" in text.lower() or "never before seen" in text.lower():
                issues.append("Potential hyperbole in truthfulness mode")

        return {
            "authenticity_score": score,
            "found_markers": found_markers,
            "issues": issues,
            "passed": score > 0.4
        }

def redact_pii(text: str) -> str:
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', "[EMAIL]", text)
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', "[PHONE]", text)
    return text
