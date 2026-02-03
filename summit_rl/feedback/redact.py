import re
from typing import List, Dict, Any, Optional
from .types import RichFeedback

SECRET_PATTERNS = [
    (r"sk-[a-zA-Z0-9]{20,}", "[REDACTED_API_KEY]"),
    (r"ghp_[a-zA-Z0-9]{20,}", "[REDACTED_GITHUB_TOKEN]"),
]

def redact_text(text: str) -> str:
    redacted = text
    for pattern, replacement in SECRET_PATTERNS:
        redacted = re.sub(pattern, replacement, redacted)
    return redacted

def sanitize_feedback(feedback: RichFeedback) -> RichFeedback:
    redacted_text = redact_text(feedback.text)

    # Check if redaction happened
    redactions = feedback.redactions or []
    if redacted_text != feedback.text:
         # In a real implementation we might track locations, here we just flag it
         pass

    return RichFeedback(
        kind=feedback.kind,
        text=redacted_text,
        meta=feedback.meta,
        provenance=feedback.provenance,
        redactions=redactions
    )
