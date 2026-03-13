"""Tests for the event normalizer."""
from __future__ import annotations

from dp.app.connectors.base import ConnectorRecord
from dp.app.models import EventType
from dp.app.normalize import normalize_record


def _make_pr(state: str = "open", merged_at: str | None = None) -> ConnectorRecord:
    return ConnectorRecord(
        source_id="42",
        record_type="pull_request",
        occurred_at="2026-01-15T10:00:00Z",
        data={
            "number": 42,
            "title": "feat: add auth",
            "state": state,
            "body": "description",
            "author_login": "alice",
            "author_id": 1,
            "repo": "acme/api",
            "merged_at": merged_at,
        },
    )


def test_open_pr_maps_to_pr_opened():
    event = normalize_record(_make_pr("open"), tenant_id="acme", source_service="github")
    assert event.event_type == EventType.PR_OPENED.value
    assert event.subject_id == "alice"
    assert event.tenant_id == "acme"
    assert event.data["number"] == 42
    assert event.data["record_type"] == "pull_request"


def test_merged_pr_maps_to_pr_merged():
    event = normalize_record(
        _make_pr("closed", merged_at="2026-01-16T09:00:00Z"),
        tenant_id="acme",
        source_service="github",
    )
    assert event.event_type == EventType.PR_MERGED.value


def test_closed_pr_maps_to_pr_closed():
    event = normalize_record(_make_pr("closed"), tenant_id="acme", source_service="github")
    assert event.event_type == EventType.PR_CLOSED.value


def test_issue_closed_maps_correctly():
    record = ConnectorRecord(
        source_id="7",
        record_type="issue",
        occurred_at="2026-01-15T10:00:00Z",
        data={
            "number": 7,
            "title": "bug: crash on login",
            "state": "closed",
            "repo": "acme/api",
            "author_login": "bob",
            "author_id": 2,
        },
    )
    event = normalize_record(record, tenant_id="acme", source_service="github")
    assert event.event_type == EventType.ISSUE_CLOSED.value


def test_workflow_run_failed_maps_correctly():
    record = ConnectorRecord(
        source_id="999",
        record_type="workflow_run",
        occurred_at="2026-01-15T11:00:00Z",
        data={
            "run_id": 999,
            "name": "CI",
            "status": "completed",
            "conclusion": "failure",
            "repo": "acme/api",
            "triggering_actor_login": "charlie",
        },
    )
    event = normalize_record(record, tenant_id="acme", source_service="github")
    assert event.event_type == EventType.CI_RUN_FAILED.value
    assert event.subject_id == "charlie"
