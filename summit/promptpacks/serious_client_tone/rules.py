import re
from typing import Iterable, List, Tuple


AVAILABILITY_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("dm_anytime", re.compile(r"\bdm me (anytime|any time)\b", re.IGNORECASE)),
    ("available_24_7", re.compile(r"\bavailable\s+(24/7|anytime|any time)\b", re.IGNORECASE)),
    ("inbox_open", re.compile(r"\bmy inbox is open\b", re.IGNORECASE)),
    ("any_project", re.compile(r"\bany project\b", re.IGNORECASE)),
    ("no_project_too_small", re.compile(r"\bno project (is )?too small\b", re.IGNORECASE)),
    ("always_on_call", re.compile(r"\bon call\b|\balways on\b", re.IGNORECASE)),
]

TRANSFORMATION_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("go_from_to", re.compile(r"\b(go|move) from\b.+?\bto\b", re.IGNORECASE | re.DOTALL)),
    ("from_to", re.compile(r"\bfrom\b.+?\bto\b", re.IGNORECASE | re.DOTALL)),
    ("transform", re.compile(r"\btransform(s|ing|ation)?\b", re.IGNORECASE)),
    ("turn_into", re.compile(r"\bturn\b.+?\binto\b", re.IGNORECASE | re.DOTALL)),
]


def find_availability_signals(text: str) -> List[str]:
    matches: List[str] = []
    for label, pattern in AVAILABILITY_PATTERNS:
        if pattern.search(text):
            matches.append(label)
    return matches


def find_transformation_signals(text: str) -> List[str]:
    matches: List[str] = []
    for label, pattern in TRANSFORMATION_PATTERNS:
        if pattern.search(text):
            matches.append(label)
    return matches


EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(r"(?:(?:\+?\d{1,3})?[-.\s()]*)?(?:\d{3}[-.\s()]*){2}\d{4}")
PRICE_PATTERN = re.compile(r"\$\s?\d[\d,]*(?:\.\d+)?")
CLIENT_LABEL_PATTERN = re.compile(r"\bclient\s*:\s*[A-Za-z][A-Za-z\s'\-]{1,40}", re.IGNORECASE)
ADDRESS_PATTERN = re.compile(r"\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(street|st|road|rd|ave|avenue|blvd|lane|ln)\b", re.IGNORECASE)


def redact_text(text: str) -> str:
    redacted = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    redacted = PHONE_PATTERN.sub("[REDACTED_PHONE]", redacted)
    redacted = PRICE_PATTERN.sub("[REDACTED_PRICE]", redacted)
    redacted = CLIENT_LABEL_PATTERN.sub("client: [REDACTED_NAME]", redacted)
    redacted = ADDRESS_PATTERN.sub("[REDACTED_ADDRESS]", redacted)
    return redacted


def redact_fields(values: Iterable[str]) -> List[str]:
    return [redact_text(value) for value in values]
