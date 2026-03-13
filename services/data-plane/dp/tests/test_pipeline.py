"""Tests for the DataPipeline orchestrator."""
from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import pytest

from dp.app.connectors.base import ConnectorBase, ConnectorRecord, ConnectorSource
from dp.app.entity_resolution import EntityResolver, EntityStore
from dp.app.models import EntityType, PipelineStatus
from dp.app.pipeline import DataPipeline


class StubConnector(ConnectorBase):
    """Minimal stub that returns a fixed set of records."""

    def __init__(self, records: list[ConnectorRecord]) -> None:
        self._records = records
        self._source = ConnectorSource(
            id="stub/repo",
            name="repo",
            kind="stub",
            metadata={"owner": "stub", "repo": "repo"},
        )

    async def discover(self) -> list[ConnectorSource]:
        return [self._source]

    async def pull(self, source: ConnectorSource) -> AsyncIterator[ConnectorRecord]:
        for record in self._records:
            yield record


def _pr_record(number: int, author: str) -> ConnectorRecord:
    return ConnectorRecord(
        source_id=str(number),
        record_type="pull_request",
        occurred_at="2026-01-15T10:00:00Z",
        data={
            "number": number,
            "title": f"PR #{number}",
            "state": "open",
            "author_login": author,
            "author_id": hash(author),
            "repo": "stub/repo",
        },
    )


@pytest.mark.asyncio
async def test_pipeline_completes_with_events():
    records = [_pr_record(1, "alice"), _pr_record(2, "bob")]
    store = EntityStore()
    connector = StubConnector(records)
    pipeline = DataPipeline(connector, entity_resolver=EntityResolver(store))

    run = await pipeline.execute(tenant_id="acme", config={"connector": "stub"})

    assert run.status == PipelineStatus.COMPLETED
    assert run.events_ingested == 2
    assert run.entities_resolved > 0
    assert len(run.evidence_ids) == 1
    assert run.evidence_ids[0].startswith("eid.dp.")


@pytest.mark.asyncio
async def test_pipeline_evidence_id_is_consistent():
    """Running the same records twice should produce the same evidence ID."""
    records = [_pr_record(1, "alice")]

    store1 = EntityStore()
    run1 = await DataPipeline(
        StubConnector(records), EntityResolver(store1)
    ).execute("acme", config={})

    store2 = EntityStore()
    run2 = await DataPipeline(
        StubConnector(records), EntityResolver(store2)
    ).execute("acme", config={})

    assert run1.evidence_ids[0] == run2.evidence_ids[0]


@pytest.mark.asyncio
async def test_pipeline_deduplicates_entities():
    """Same author across multiple PRs should produce a single Person entity."""
    records = [_pr_record(1, "alice"), _pr_record(2, "alice"), _pr_record(3, "alice")]
    store = EntityStore()
    pipeline = DataPipeline(StubConnector(records), EntityResolver(store))

    run = await pipeline.execute(tenant_id="acme")

    people = [e for e in store.get_all() if e.entity_type == EntityType.PERSON]
    assert len(people) == 1
    assert len(people[0].source_ids) == 3


@pytest.mark.asyncio
async def test_pipeline_failed_on_connector_error():
    class BrokenConnector(ConnectorBase):
        async def discover(self) -> list[ConnectorSource]:
            raise RuntimeError("network failure")

        async def pull(self, source: ConnectorSource) -> AsyncIterator[ConnectorRecord]:
            yield  # type: ignore[misc]

    pipeline = DataPipeline(BrokenConnector())
    run = await pipeline.execute(tenant_id="acme")

    assert run.status == PipelineStatus.FAILED
    assert run.error == "network failure"
