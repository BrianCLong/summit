from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

RFC3339_PATTERN = re.compile(
    r"\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b"
)
UUID4_PATTERN = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
    flags=re.IGNORECASE,
)
RANDOM_API_PATTERN = re.compile(r"\b(random\.|uuid\.uuid4\()", flags=re.IGNORECASE)


def stable_json(data: Any) -> str:
    return json.dumps(data, indent=2, sort_keys=True) + "\n"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def stable_payload_hash(data: Any) -> str:
    return sha256_text(stable_json(data))


def detect_nondeterministic_markers(text: str) -> list[str]:
    markers: list[str] = []
    if RFC3339_PATTERN.search(text):
        markers.append("rfc3339_timestamp")
    if UUID4_PATTERN.search(text):
        markers.append("uuid4_literal")
    if RANDOM_API_PATTERN.search(text):
        markers.append("random_api")
    return sorted(set(markers))

