from typing import Any, Dict, List, Tuple


def scrub_pii(text: str) -> tuple[str, dict[str, Any]]:
    """
    Scrub PII from text.
    Returns:
        (scrubbed_text, redaction_report)
    """
    # This is a stub for now. Real implementation would use a PII scrubber.
    # For now, it just returns text as is, assuming no PII or manual check.
    # In production, this must be hooked to a real scrubber.

    redaction_report = {
        "scrubbed_count": 0,
        "types_found": []
    }
    return text, redaction_report

def assert_no_pii_in_evidence(evidence_data: dict[str, Any]) -> None:
    """
    Recursively check evidence data for PII keys or patterns.
    Raises ValueError if PII is suspected.
    """
    FORBIDDEN_KEYS = {"raw_text", "full_text", "username", "email", "phone", "voice_embedding", "face_embedding"}

    if isinstance(evidence_data, dict):
        for k, v in evidence_data.items():
            if k in FORBIDDEN_KEYS:
                raise ValueError(f"Forbidden PII key found in evidence: {k}")
            assert_no_pii_in_evidence(v)
    elif isinstance(evidence_data, list):
        for item in evidence_data:
            assert_no_pii_in_evidence(item)
