import uuid
from typing import Any

from cogwar.innovation.defensive_friction_planner import build_defensive_friction_plan


def generate_warning(
    indicators: list[dict[str, Any]],
    intervention_catalog: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
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

    recommended_defensive_actions = [
        "Monitor specific channels for further amplification",
        "Prepare prebunking material if narrative spreads",
    ]
    defensive_plan = None
    if intervention_catalog:
        try:
            defensive_plan = build_defensive_friction_plan(
                indicators=indicators,
                intervention_catalog=intervention_catalog,
            )
            recommended_defensive_actions = [
                intervention.get("name", intervention["id"])
                for intervention in defensive_plan["selected_interventions"]
            ] or recommended_defensive_actions
        except PermissionError:
            # Feature is intentionally constrained by default policy.
            defensive_plan = None

    warning = {
        "warning_id": f"WARN-{uuid.uuid4().hex[:8]}",
        "summary": f"Detected {len(indicators)} indicators of potential cognitive domain activity.",
        "indicators": indicators,
        "assessed_hypotheses": [],  # Placeholder for fusion logic
        "confidence": avg_confidence,
        "recommended_defensive_actions": recommended_defensive_actions,
        "hitl_required": hitl_required,
        "caveats": [
            "Analysis is based on limited observation window.",
            "Attribution to specific actors is not confirmed.",
        ],
        "evidence_refs": [ind["id"] for ind in indicators],
    }
    if defensive_plan:
        warning["defensive_plan"] = defensive_plan

    return warning
