"""Tests for the feed processor ingestion validator."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional
import sys

PYTHON_SRC = Path(__file__).resolve().parents[2]
if str(PYTHON_SRC) not in sys.path:
    sys.path.insert(0, str(PYTHON_SRC))

_EXPORTER: Optional[InMemorySpanExporter] = None

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from feed_processor_validation import IngestionValidator


def _configure_tracer() -> InMemorySpanExporter:
    global _EXPORTER
    if _EXPORTER is None:
        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _EXPORTER = exporter
    else:
        _EXPORTER.clear()
    return _EXPORTER


def _base_job() -> Dict[str, str]:
    return {
        "job_id": "job-123",
        "source_type": "csv",
        "target_graph": "main",
        "authority_id": "auth-1",
        "data_source_id": "source-1",
    }


def test_validation_passes_for_valid_payload() -> None:
    exporter = _configure_tracer()
    validator = IngestionValidator()

    job = _base_job()
    entities: List[Dict[str, str]] = [
        {"id": "1", "type": "person", "name": "Entity A", "source": "csv"}
    ]
    relationships: List[Dict[str, str]] = [
        {"source": "1", "target": "1", "type": "RELATED_TO", "properties": {"confidence": 0.9}}
    ]

    result = validator.validate_batch(job, entities, relationships)

    assert result.success is True
    assert result.violations == []

    spans = exporter.get_finished_spans()
    assert len(spans) == 1
    span = spans[0]
    assert span.attributes["job.id"] == "job-123"
    assert span.attributes["schema.valid"] is True
    success_events = [event for event in span.events if event.name == "schema_validation_success"]
    assert success_events, "Expected a success event to be recorded"


def test_validation_failure_records_open_telemetry_event() -> None:
    exporter = _configure_tracer()
    validator = IngestionValidator()

    job = _base_job()
    entities = [{"name": "Missing identifier"}]
    relationships: List[Dict[str, str]] = []

    result = validator.validate_batch(job, entities, relationships)

    assert result.success is False
    entity_violations = [v for v in result.violations if v.schema == "neo4j_entity"]
    assert entity_violations, "Expected at least one Neo4j entity violation"
    assert "'id' is a required property" in entity_violations[0].message

    spans = exporter.get_finished_spans()
    assert len(spans) == 1
    span = spans[0]
    assert span.attributes["schema.valid"] is False
    violation_events = [event for event in span.events if event.name == "schema_violation"]
    assert violation_events, "Expected violation events to be exported"
    assert any(event.attributes["schema"] == "neo4j_entity" for event in violation_events)
