import uuid
from typing import Any, Dict, List


def generate_warning(indicators: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Generates a warning from a list of indicators.
    Enforces caveats and evidence references.
    """
    if not indicators:
        return None

    # Calculate aggregate confidence (simple average for now)
    avg_confidence = sum(ind["confidence"] for ind in indicators) / len(indicators)

    # Determine severity based on highest indicator severity
    severities = [ind["severity"] for ind in indicators]
    if "critical" in severities:
        severity = "critical"
    elif "high" in severities:
        severity = "high"
    elif "medium" in severities:
        severity = "medium"
    else:
        severity = "low"

    hitl_required = severity in ["high", "critical"] or avg_confidence < 0.7

    warning = {
        "warning_id": f"WARN-{uuid.uuid4().hex[:8]}",
        "summary": f"Detected {len(indicators)} indicators of potential cognitive domain activity.",
        "indicators": indicators,
        "assessed_hypotheses": [], # Placeholder for fusion logic
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
        "evidence_refs": [ind["id"] for ind in indicators]
    }

    return warning
