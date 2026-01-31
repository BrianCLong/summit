import json
import os
from typing import Any, Dict, List

from ..detectors.coord_anom import Finding


def is_enabled():
    return os.getenv("INTEGRITY_OBSERVATORY_EXPORT_ENABLED", "false").lower() == "true"

def package_export(findings: list[Finding], aggregates: dict[str, Any]) -> dict[str, Any]:
    """
    Produces a standardized export bundle for the AI Influence Observatory.
    Flagged OFF by default.
    """
    if not is_enabled():
        return {}

    counts = {}
    for f in findings:
        counts[f.detector] = counts.get(f.detector, 0) + 1

    bundle = {
        "version": 1,
        "findings_count": counts,
        "aggregates": aggregates,
        "privacy_notes": "All actor IDs are hashed. No raw text included.",
        "classification": "internal"
    }
    return bundle
