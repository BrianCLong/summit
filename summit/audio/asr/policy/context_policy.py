"""
Policy gate for promptable ASR context.
Ensures context doesn't contain PII, secrets, or exceed length limits.
"""
from __future__ import annotations

import os
import re

import summit.flags

MAX_CONTEXT_LENGTH = 1000

# Simple regex patterns for PII/Secrets
PII_PATTERNS = [
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
    r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
    r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",  # IP
]

def validate_context(context: str | None) -> None:
    if context is None:
        return

    # Check either the specific context flag or the main feature flag
    if os.getenv("ASR_CONTEXT_ENABLED", "0") != "1" and not summit.flags.FEATURE_QWEN3_ASR:
        raise RuntimeError("Promptable ASR context is disabled (set ASR_CONTEXT_ENABLED=1 or FEATURE_QWEN3_ASR=1)")

    if len(context) > MAX_CONTEXT_LENGTH:
        raise ValueError(f"Context exceeds maximum length of {MAX_CONTEXT_LENGTH}")

    for pattern in PII_PATTERNS:
        if re.search(pattern, context):
            raise ValueError("Context contains sensitive information (PII/Secret)")
