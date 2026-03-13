"""Tests for canonical event models."""
from __future__ import annotations

import pytest

from dp.app.models import CanonicalEvent, EntityType, EventType


def test_canonical_event_defaults_are_populated():
    event = CanonicalEvent(
        event_type="pr.opened.v1",
        tenant_id="acme",
        source_service="test",
        data={"repo": "acme/api"},
    )
    assert event.event_id
    assert event.occurred_at
    assert event.recorded_at
    assert event.event_version == "v1"


def test_canonical_event_invalid_type_raises():
    with pytest.raises(Exception):
        CanonicalEvent(
            event_type="INVALID_TYPE",
            tenant_id="acme",
            source_service="test",
            data={},
        )


def test_canonical_event_content_hash_is_deterministic():
    kwargs = dict(
        event_type="pr.opened.v1",
        occurred_at="2026-01-01T00:00:00+00:00",
        tenant_id="acme",
        source_service="test",
        data={"repo": "acme/api", "number": 1},
    )
    e1 = CanonicalEvent(**kwargs)
    e2 = CanonicalEvent(**kwargs)
    assert e1.content_hash() == e2.content_hash()


def test_all_event_types_are_valid():
    for et in EventType:
        CanonicalEvent(
            event_type=et.value,
            tenant_id="acme",
            source_service="test",
            data={},
        )
