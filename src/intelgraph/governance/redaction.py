import re

# Basic regexes for PII
# Email: simple regex
EMAIL_REGEX = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
# Phone: (123) 456-7890, 123-456-7890, +1-123-456-7890
PHONE_REGEX = r"(?:\b|(?<=\s))(?:\+?1[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}\b"
# SSN: 000-00-0000
SSN_REGEX = r"\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b"


def redact_text(text: str) -> str:
    """
    Redact PII from text using deterministic replacements.
    Idempotent: Redacting redacted text changes nothing.
    """
    # Order matters? Not really if disjoint.

    text = re.sub(EMAIL_REGEX, "[REDACTED_EMAIL]", text)
    text = re.sub(PHONE_REGEX, "[REDACTED_PHONE]", text)
    text = re.sub(SSN_REGEX, "[REDACTED_SSN]", text)
    return text


def scan_text(text: str) -> dict[str, int]:
    """
    Scan text for PII and return counts.
    """
    counts = {}
    emails = len(re.findall(EMAIL_REGEX, text))
    if emails:
        counts["email"] = emails

    phones = len(re.findall(PHONE_REGEX, text))
    if phones:
        counts["phone"] = phones

    ssns = len(re.findall(SSN_REGEX, text))
    if ssns:
        counts["ssn"] = ssns

    return counts
