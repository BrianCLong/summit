from __future__ import annotations

import hashlib
import json
from typing import Any

SEVERITY_ORDER = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def _validate_indicator(indicator: dict[str, Any]) -> None:
    required_keys = {"id", "name", "severity", "confidence"}
    missing = sorted(required_keys - set(indicator.keys()))
    if missing:
        raise ValueError(f"Indicator is missing required keys: {', '.join(missing)}")

    severity = str(indicator["severity"]).lower()
    if severity not in SEVERITY_ORDER:
        raise ValueError(
            f"Indicator severity '{indicator['severity']}' is invalid. "
            f"Allowed: {', '.join(sorted(SEVERITY_ORDER))}."
        )

    confidence = indicator["confidence"]
    if not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
        raise ValueError("Indicator confidence must be a number in [0, 1].")


def _deterministic_warning_id(indicators: list[dict[str, Any]]) -> str:
    canonical = [
        {
            "id": ind["id"],
            "severity": str(ind["severity"]).lower(),
            "confidence": round(float(ind["confidence"]), 6),
        }
        for ind in sorted(indicators, key=lambda item: str(item["id"]))
    ]
    digest = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return f"WARN-{digest[:8]}"


def generate_warning(indicators: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Generates a warning from a list of indicators.
    Enforces caveats and evidence references.
    """
    if not indicators:
        return None

    for indicator in indicators:
        _validate_indicator(indicator)

    # Calculate aggregate confidence (simple average for now)
    avg_confidence = sum(ind["confidence"] for ind in indicators) / len(indicators)

    # Determine severity based on highest indicator severity
    severities = [str(ind["severity"]).lower() for ind in indicators]
    severity = max(severities, key=lambda level: SEVERITY_ORDER[level])

    hitl_required = severity in ["high", "critical"] or avg_confidence < 0.7

    warning = {
        "warning_id": _deterministic_warning_id(indicators),
        "summary": f"Detected {len(indicators)} indicators of potential cognitive domain activity.",
        "indicators": indicators,
        "assessed_hypotheses": [],
        "confidence": avg_confidence,
        "recommended_defensive_actions": [
            "Monitor specific channels for further amplification",
            "Prepare prebunking material if narrative spreads"
        ],
        "hitl_required": hitl_required,
        "caveats": [
             "Analysis is based on limited observation window.",
             "Attribution to specific actors is not confirmed."
        ],
        "evidence_refs": sorted(
            {
                *[str(ind["id"]) for ind in indicators],
                *[
                    str(reference)
                    for ind in indicators
                    for reference in ind.get("evidence_refs", [])
                ],
            }
        ),
    }


    return warning
