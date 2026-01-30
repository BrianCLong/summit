from datetime import UTC, datetime, timezone

from .thresholds import requires_review


def submit_for_review(warning: dict, reviewer_role: str = "analyst") -> dict:
    """
    Submits a warning for review.
    In a real system, this would trigger a workflow.
    Here it returns a status object.
    """
    needed = requires_review(warning)
    return {
        "warning_id": warning.get("warning_id"),
        "status": "pending_review" if needed else "auto_approved",
        "assigned_role": reviewer_role if needed else None
    }

def record_decision(warning_id: str, decision: str, rationale: str) -> dict:
    """
    Records a human decision.
    """
    return {
        "warning_id": warning_id,
        "decision": decision,
        "rationale": rationale,
        "timestamp": datetime.now(UTC).isoformat()
    }
