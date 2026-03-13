"""
Event normalizer: maps raw ConnectorRecords to CanonicalEvents.

Rules:
  - record_type → event_type mapping is deterministic
  - every event gets tenant_id from the pipeline run config
  - data fields are passed through as-is; enrichment happens downstream
"""
from __future__ import annotations

from datetime import UTC, datetime

from .connectors.base import ConnectorRecord
from .models import CanonicalEvent, EventType

_RECORD_TYPE_MAP: dict[str, str] = {
    "pull_request": EventType.PR_OPENED.value,
    "issue": EventType.ISSUE_OPENED.value,
    "workflow_run": EventType.CI_RUN_COMPLETED.value,
    "push": EventType.REPO_PUSHED.value,
    "repository": EventType.REPO_CREATED.value,
}


def normalize_record(
    record: ConnectorRecord,
    tenant_id: str,
    source_service: str,
    correlation_id: str | None = None,
) -> CanonicalEvent:
    """Convert a raw connector record into a CanonicalEvent."""
    event_type = _RECORD_TYPE_MAP.get(record.record_type, EventType.GENERIC.value)

    # Refine event_type based on state when available
    if record.record_type == "pull_request":
        state = record.data.get("state", "")
        if record.data.get("merged_at"):
            event_type = EventType.PR_MERGED.value
        elif state == "closed":
            event_type = EventType.PR_CLOSED.value
        else:
            event_type = EventType.PR_OPENED.value

    elif record.record_type == "issue":
        state = record.data.get("state", "")
        event_type = (
            EventType.ISSUE_CLOSED.value if state == "closed" else EventType.ISSUE_OPENED.value
        )

    elif record.record_type == "workflow_run":
        conclusion = record.data.get("conclusion")
        status = record.data.get("status")
        if conclusion == "failure":
            event_type = EventType.CI_RUN_FAILED.value
        elif status == "in_progress":
            event_type = EventType.CI_RUN_STARTED.value
        else:
            event_type = EventType.CI_RUN_COMPLETED.value

    occurred_at = record.occurred_at or datetime.now(UTC).isoformat()

    return CanonicalEvent(
        event_type=event_type,
        occurred_at=occurred_at,
        tenant_id=tenant_id,
        subject_id=_extract_subject(record),
        source_service=source_service,
        correlation_id=correlation_id,
        data={
            "record_type": record.record_type,
            "source_id": record.source_id,
            **record.data,
        },
    )


def _extract_subject(record: ConnectorRecord) -> str | None:
    """Best-effort extraction of the actor/subject from a record."""
    for key in ("author_login", "triggering_actor_login", "login", "user_login"):
        if val := record.data.get(key):
            return str(val)
    return None
