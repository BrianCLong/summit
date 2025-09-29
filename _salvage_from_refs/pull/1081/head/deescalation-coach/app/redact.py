"""Utilities for redacting PII from text."""

from __future__ import annotations

import re
from typing import Tuple

HANDLE_RE = re.compile(r"@\w+")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d -]{7,}\d")
UUID_RE = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
URL_RE = re.compile(r"https?://[\w./-]+")


REPLACEMENT = "[REDACTED]"


def redact_text(text: str) -> Tuple[str, bool]:
    """Return redacted text and whether any substitution occurred."""
    original = text
    for pattern in [HANDLE_RE, EMAIL_RE, PHONE_RE, UUID_RE]:
        text = pattern.sub(REPLACEMENT, text)
    text = URL_RE.sub("URL", text)
    return text, text != original
