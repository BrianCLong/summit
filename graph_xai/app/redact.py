from __future__ import annotations

import re

EMAIL = re.compile(r"[\w.%-]+@[\w.-]+")
PHONE = re.compile(r"\+?\d[\d -]{7,}\d")
HANDLE = re.compile(r"@[A-Za-z0-9_]+")


def redact(text: str) -> str:
    text = EMAIL.sub("<email>", text)
    text = PHONE.sub("<phone>", text)
    text = HANDLE.sub("<handle>", text)
    return text
