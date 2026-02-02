from typing import Any


def strip_signed_urls(payload: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of payload with signed URLs redacted."""
    if "download_links" not in payload:
        return payload

    redacted = dict(payload)
    links = payload.get("download_links", [])
    redacted["download_links"] = ["<REDACTED_SIGNED_URL>"] * len(links)
    redacted["_redaction"] = {"download_links": "redacted"}
    return redacted
