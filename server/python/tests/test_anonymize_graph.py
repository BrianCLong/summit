from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional, Sequence

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from anonymization.anonymize_graph import (
    GraphAnonymizationConfig,
    GraphAnonymizer,
    GraphNodeConfig,
    TableColumnConfig,
)


class RecordingSpan:
    def __init__(self, name: str, registry: List["RecordingSpan"]):
        self.name = name
        self.attributes: Dict[str, Any] = {}
        self.events: List[Dict[str, Any]] = []
        self._registry = registry

    def __enter__(self) -> "RecordingSpan":
        self._registry.append(self)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    def set_attributes(self, attributes: Dict[str, Any]) -> None:
        self.attributes.update(attributes)

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None) -> None:
        entry = {"name": name, "attributes": attributes or {}}
        self.events.append(entry)


class RecordingTracer:
    def __init__(self) -> None:
        self.spans: List[RecordingSpan] = []

    def start_as_current_span(self, name: str) -> RecordingSpan:
        return RecordingSpan(name, self.spans)


class FakeNeo4jSession:
    def __init__(self, records: Sequence[Dict[str, Any]]) -> None:
        self.records = list(records)
        self.fetch_calls: List[Dict[str, Any]] = []
        self.update_calls: List[Dict[str, Any]] = []

    def run(self, query: str, params: Optional[Dict[str, Any]] = None):
        if "RETURN id(n) as id" in query:
            self.fetch_calls.append({"query": query, "params": params or {}})
            return self.records
        self.update_calls.append({"query": query, "params": params or {}})
        return []

    def close(self) -> None:
        return None


class FakeNeo4jDriver:
    def __init__(self, records: Sequence[Dict[str, Any]]) -> None:
        self.records = records
        self.sessions: List[FakeNeo4jSession] = []

    def session(self) -> FakeNeo4jSession:
        session = FakeNeo4jSession(self.records)
        self.sessions.append(session)
        return session


class FakeCursor:
    def __init__(self, rows: Sequence[Sequence[Any]]) -> None:
        self.rows = list(rows)
        self.executed: List[Dict[str, Any]] = []

    def execute(self, query: str, params: Optional[Sequence[Any]] = None) -> None:
        self.executed.append({"query": " ".join(query.split()), "params": tuple(params or [])})

    def fetchall(self) -> List[Sequence[Any]]:
        return self.rows

    def close(self) -> None:
        return None


class FakePostgresConnection:
    def __init__(self, rows: Sequence[Sequence[Any]]) -> None:
        self.rows = rows
        self.cursors: List[FakeCursor] = []
        self.committed = False
        self.rolled_back = False

    def cursor(self) -> FakeCursor:
        cursor = FakeCursor(self.rows)
        self.cursors.append(cursor)
        return cursor

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


@pytest.fixture
def sample_config() -> GraphAnonymizationConfig:
    return GraphAnonymizationConfig(
        tenant_id="tenant-123",
        dry_run=False,
        node_properties=[GraphNodeConfig(label="Person", properties=["name", "ssn"])],
        table_columns=[TableColumnConfig(table="users", columns=["name", "ssn"])]
    )


@pytest.fixture
def sample_records() -> List[Dict[str, Any]]:
    return [
        {"id": 1, "props": {"name": "Alice", "ssn": "123-45-6789"}},
        {"id": 2, "props": {"name": "Bob", "ssn": None}},
    ]


@pytest.fixture
def sample_rows() -> List[Sequence[Any]]:
    return [
        (1, "Alice", "123-45-6789"),
        (2, "Bob", None),
    ]


def test_pseudonymize_value_is_deterministic() -> None:
    salt = "unit-test-salt"
    first = GraphAnonymizer.pseudonymize_value("Alice", salt=salt)
    second = GraphAnonymizer.pseudonymize_value("Alice", salt=salt)
    different = GraphAnonymizer.pseudonymize_value("Alice", salt="different-salt")

    assert first == second
    assert first != different


def test_anonymize_updates_datastores(sample_config, sample_records, sample_rows) -> None:
    tracer = RecordingTracer()
    neo_driver = FakeNeo4jDriver(sample_records)
    pg_conn = FakePostgresConnection(sample_rows)

    anonymizer = GraphAnonymizer(neo_driver, pg_conn, tracer=tracer, salt="salt")
    summary = anonymizer.anonymize(sample_config)

    assert summary["dry_run"] is False
    assert summary["tenant_id"] == "tenant-123"
    assert summary["node_summary"][0]["nodes_processed"] == 2
    assert summary["table_summary"][0]["rows_processed"] == 2

    # Ensure updates were issued where expected
    session = neo_driver.sessions[0]
    assert len(session.update_calls) == 2

    cursor = pg_conn.cursors[0]
    update_statements = [call for call in cursor.executed if call["query"].startswith("UPDATE")]
    assert len(update_statements) == 2
    assert pg_conn.committed is True
    assert pg_conn.rolled_back is False

    assert any(span.name == "neo4j.anonymize" for span in tracer.spans)
    assert any(event["name"] == "neo4j.anonymized" for span in tracer.spans for event in span.events)


def test_dry_run_skips_writes(sample_config, sample_records, sample_rows) -> None:
    sample_config.dry_run = True

    tracer = RecordingTracer()
    neo_driver = FakeNeo4jDriver(sample_records)
    pg_conn = FakePostgresConnection(sample_rows)

    anonymizer = GraphAnonymizer(neo_driver, pg_conn, tracer=tracer, salt="salt")
    summary = anonymizer.anonymize(sample_config)

    assert summary["dry_run"] is True
    assert summary["node_summary"][0]["nodes_processed"] == 2
    assert summary["table_summary"][0]["rows_processed"] == 2

    session = neo_driver.sessions[0]
    assert session.update_calls == []

    cursor = pg_conn.cursors[0]
    update_statements = [call for call in cursor.executed if call["query"].startswith("UPDATE")]
    assert update_statements == []
    assert pg_conn.committed is False
    assert pg_conn.rolled_back is True

    assert any(event["name"] == "postgres.anonymized" for span in tracer.spans for event in span.events)
