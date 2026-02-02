import re
from dataclasses import dataclass

# Regex for common secrets and PII
_RE_API_KEY = re.compile(r"(sk-[A-Za-z0-9]{20,})")
_RE_EMAIL = re.compile(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})")

@dataclass(frozen=True)
class RedactionResult:
    redacted_text: str
    reasons: list[str]

def redact(text: str) -> RedactionResult:
    """
    Redacts sensitive information from the text based on predefined patterns.
    Returns the redacted text and a list of reason codes.
    """
    reasons: list[str] = []
    out = text

    # Redact API Keys
    if _RE_API_KEY.search(out):
        out = _RE_API_KEY.sub("[REDACTED_SECRET]", out)
        reasons.append("P020_SECRET_DETECTED")

    # Redact Emails
    if _RE_EMAIL.search(out):
        out = _RE_EMAIL.sub("[REDACTED_EMAIL]", out)
        reasons.append("P010_PII_DETECTED")

    return RedactionResult(redacted_text=out, reasons=reasons)
