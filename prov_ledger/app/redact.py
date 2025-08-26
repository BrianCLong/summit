import re

EMAIL_RE = re.compile(r"[\w.%-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d\s-]{7,}\d")
HANDLE_RE = re.compile(r"@[A-Za-z0-9_]{2,}")


def redact(text: str) -> str:
    text = EMAIL_RE.sub("<redacted email>", text)
    text = PHONE_RE.sub("<redacted phone>", text)
    text = HANDLE_RE.sub("<redacted handle>", text)
    return text
