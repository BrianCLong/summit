from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

INJECTION_PATTERNS = [
    re.compile(r"\bIGNORE\s+PREVIOUS\b", re.IGNORECASE),
    re.compile(r"\bSYSTEM\s+PROMPT\b", re.IGNORECASE),
    re.compile(r"\bDO\s+NOT\s+FOLLOW\b", re.IGNORECASE),
]
EMAIL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_PATTERN = re.compile(r"\b\+?\d[\d\s().-]{7,}\d\b")


@dataclass(frozen=True)
class SecurityFinding:
    kind: str
    message: str


def redact_pii(text: str) -> tuple[str, list[SecurityFinding]]:
    findings: list[SecurityFinding] = []
    if EMAIL_PATTERN.search(text):
        findings.append(SecurityFinding(kind="pii", message="email redacted"))
        text = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    if PHONE_PATTERN.search(text):
        findings.append(SecurityFinding(kind="pii", message="phone redacted"))
        text = PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
    return text, findings


def detect_prompt_injection(lines: Iterable[str]) -> list[SecurityFinding]:
    findings: list[SecurityFinding] = []
    for line in lines:
        if line.strip().startswith(">"):
            continue
        for pattern in INJECTION_PATTERNS:
            if pattern.search(line):
                findings.append(
                    SecurityFinding(
                        kind="prompt_injection",
                        message=f"instruction-like pattern '{pattern.pattern}' detected",
                    )
                )
    return findings
