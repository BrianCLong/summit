from typing import Any, Dict, List, Tuple

from summit.promptpacks.serious_client_tone.rules import (
    find_availability_signals,
    find_transformation_signals,
    redact_text,
)


TRANSFORMATION_TEMPLATE = (
    "I help {target} go from {before} to {after} by {method}."
)


def _score(availability_count: int, transformation_present: bool) -> int:
    score = 100
    score -= min(availability_count * 10, 50)
    if not transformation_present:
        score -= 20
    return max(score, 0)


def evaluate_payload(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    input_id = str(payload.get("id", "unknown"))
    profile = str(payload.get("profile", ""))
    offer = str(payload.get("offer", ""))
    draft_message = str(payload.get("draft_message", ""))

    combined_text = "\n".join([profile, offer, draft_message])

    availability_hits = find_availability_signals(combined_text)
    transformation_hits = find_transformation_signals(draft_message)
    transformation_present = bool(transformation_hits)

    report: Dict[str, Any] = {
        "input_id": input_id,
        "availability_signals": {
            "matches": availability_hits,
            "count": len(availability_hits),
        },
        "transformation_first": {
            "present": transformation_present,
            "signals": transformation_hits,
        },
        "recommendations": {
            "remove_availability_signals": availability_hits,
        },
        "redacted_input": {
            "profile": redact_text(profile),
            "offer": redact_text(offer),
            "draft_message": redact_text(draft_message),
        },
    }

    if not transformation_present:
        report["recommendations"]["transformation_first_template"] = (
            TRANSFORMATION_TEMPLATE
        )

    metrics: Dict[str, Any] = {
        "input_id": input_id,
        "availability_signal_count": len(availability_hits),
        "transformation_first_present": transformation_present,
        "serious_client_score": _score(len(availability_hits), transformation_present),
    }

    return report, metrics
