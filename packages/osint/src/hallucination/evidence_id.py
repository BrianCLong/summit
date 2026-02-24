"""Deterministic evidence ID generation utilities."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

TRACKING_QUERY_KEYS = {
    "fbclid",
    "gclid",
    "igshid",
    "mc_cid",
    "mc_eid",
}


def _drop_tracking_params(params: Iterable[tuple[str, str]]) -> list[tuple[str, str]]:
    cleaned: list[tuple[str, str]] = []
    for key, value in params:
        if key.startswith("utm_"):
            continue
        if key in TRACKING_QUERY_KEYS:
            continue
        cleaned.append((key, value))
    return cleaned


def normalize_source_url(source_url: str) -> str:
    """Normalize URLs for deterministic evidence IDs."""

    parsed = urlparse(source_url.strip())
    query_params = _drop_tracking_params(parse_qsl(parsed.query, keep_blank_values=True))
    query_params.sort()
    normalized = parsed._replace(
        scheme=parsed.scheme.lower(),
        netloc=parsed.netloc.lower(),
        query=urlencode(query_params, doseq=True),
        fragment="",
    )
    return urlunparse(normalized)


def canonicalize_snippet(snippet: str) -> str:
    """Canonicalize snippets to reduce noise before hashing."""

    normalized = unicodedata.normalize("NFKC", snippet)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def compute_evidence_id(source_type: str, source_url: str, snippet: str) -> str:
    """Compute deterministic evidence IDs."""

    normalized_url = normalize_source_url(source_url)
    normalized_snippet = canonicalize_snippet(snippet)
    url_hash = hashlib.sha256(normalized_url.encode("utf-8")).hexdigest()
    snippet_hash = hashlib.sha256(normalized_snippet.encode("utf-8")).hexdigest()
    return f"EVID:{source_type}:{url_hash}:{snippet_hash}"
