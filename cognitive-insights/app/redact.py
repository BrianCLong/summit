from __future__ import annotations

import hashlib
import re
from datetime import datetime

_URL_RE = re.compile(r"https?://\S+")
_HANDLE_RE = re.compile(r"@[A-Za-z0-9_]+")
_EMAIL_RE = re.compile(r"[\w\.-]+@[\w\.-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"\+?\d[\d\- ]{7,}\d")


def redact(text: str) -> str:
    """Redact obvious PII patterns from ``text``."""

    text = _URL_RE.sub("<URL>", text)
    text = _HANDLE_RE.sub("", text)
    text = _EMAIL_RE.sub("", text)
    text = _PHONE_RE.sub("", text)
    return text.strip()


def hash_identifier(s: str, *, now: datetime | None = None, salt: str | None = None) -> str:
    """Return a daily rotating SHA256 hash for the given string."""

    now = now or datetime.utcnow()
    salt = salt or "static_salt"
    day = now.strftime("%Y-%m-%d")
    payload = f"{salt}:{day}:{s}".encode()
    return hashlib.sha256(payload).hexdigest()
