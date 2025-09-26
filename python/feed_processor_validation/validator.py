"""Schema validation utilities for feed processor ingestion."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional
import json
import logging

from jsonschema import Draft202012Validator, FormatChecker, ValidationError
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor
from opentelemetry.trace import Span, Tracer

logger = logging.getLogger(__name__)

SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DEFAULT_SERVICE_NAME = "feed-processor-schema-validator"

_format_checker = FormatChecker()
_tracer_initialized = False


def _load_schema(schema_name: str) -> Dict[str, Any]:
    schema_path = SCHEMA_DIR / schema_name
    with schema_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _ensure_tracer_provider() -> None:
    global _tracer_initialized
    if _tracer_initialized:
        return

    provider = trace.get_tracer_provider()
    if provider.__class__.__name__ == "DefaultTracerProvider":
        tracer_provider = TracerProvider(
            resource=Resource.create({"service.name": DEFAULT_SERVICE_NAME})
        )
        tracer_provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
        trace.set_tracer_provider(tracer_provider)
    _tracer_initialized = True


@dataclass
class ValidationViolation:
    """Details about a schema validation failure."""

    schema: str
    message: str
    instance_index: int
    path: str
    schema_path: str
    instance: Any

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schema": self.schema,
            "message": self.message,
            "instance_index": self.instance_index,
            "path": self.path,
            "schema_path": self.schema_path,
            "instance": self.instance,
        }


@dataclass
class ValidationResult:
    """Outcome of a schema validation run."""

    success: bool
    violations: List[ValidationViolation]


class IngestionValidator:
    """Validate feed processor payloads against relational and graph schemas."""

    def __init__(self, tracer: Optional[Tracer] = None) -> None:
        _ensure_tracer_provider()
        self._tracer = tracer or trace.get_tracer(__name__)
        self._postgres_validator = Draft202012Validator(
            _load_schema("postgres_record.schema.json"), format_checker=_format_checker
        )
        self._entity_validator = Draft202012Validator(
            _load_schema("neo4j_entity.schema.json"), format_checker=_format_checker
        )
        self._relationship_validator = Draft202012Validator(
            _load_schema("neo4j_relationship.schema.json"), format_checker=_format_checker
        )

    def validate_batch(
        self,
        job: Dict[str, Any],
        entities: Iterable[Dict[str, Any]],
        relationships: Iterable[Dict[str, Any]],
        postgres_records: Optional[Iterable[Dict[str, Any]]] = None,
    ) -> ValidationResult:
        """Validate a batch of ingestion data."""

        materialized_entities = list(entities)
        materialized_relationships = list(relationships)
        materialized_records = list(postgres_records) if postgres_records is not None else None

        if materialized_records is None:
            materialized_records = self._build_postgres_records(job, materialized_entities)

        with self._tracer.start_as_current_span(
            "feed_processor.schema_validation"
        ) as span:
            span.set_attribute("job.id", job.get("job_id", "unknown"))
            span.set_attribute("job.source_type", job.get("source_type", "unknown"))
            span.set_attribute("job.target_graph", job.get("target_graph", "unknown"))
            span.set_attribute("validation.entities", len(materialized_entities))
            span.set_attribute("validation.relationships", len(materialized_relationships))

            violations: List[ValidationViolation] = []
            violations.extend(
                self._validate_sequence(
                    span,
                    "postgres_record",
                    self._postgres_validator,
                    materialized_records,
                )
            )
            violations.extend(
                self._validate_sequence(
                    span,
                    "neo4j_entity",
                    self._entity_validator,
                    materialized_entities,
                )
            )
            violations.extend(
                self._validate_sequence(
                    span,
                    "neo4j_relationship",
                    self._relationship_validator,
                    materialized_relationships,
                )
            )

            if violations:
                span.set_attribute("schema.valid", False)
                logger.warning("Schema validation failed", extra={"violations": [v.to_dict() for v in violations]})
                for violation in violations:
                    self._record_violation(span, violation)
            else:
                span.set_attribute("schema.valid", True)
                span.add_event(
                    "schema_validation_success",
                    {
                        "entities": len(materialized_entities),
                        "relationships": len(materialized_relationships),
                    },
                )

            return ValidationResult(success=not violations, violations=violations)

    def _validate_sequence(
        self,
        span: Span,
        schema_name: str,
        validator: Draft202012Validator,
        instances: Iterable[Dict[str, Any]],
    ) -> List[ValidationViolation]:
        violations: List[ValidationViolation] = []
        for index, instance in enumerate(instances):
            errors = sorted(validator.iter_errors(instance), key=lambda error: error.path)
            for error in errors:
                violation = ValidationViolation(
                    schema=schema_name,
                    message=error.message,
                    instance_index=index,
                    path=self._stringify_path(error),
                    schema_path="/".join(str(part) for part in error.absolute_schema_path),
                    instance=instance,
                )
                violations.append(violation)
        return violations

    def _record_violation(self, span: Span, violation: ValidationViolation) -> None:
        span.add_event(
            "schema_violation",
            {
                "schema": violation.schema,
                "message": violation.message,
                "path": violation.path,
                "schema_path": violation.schema_path,
                "instance_index": violation.instance_index,
            },
        )

    def _build_postgres_records(
        self, job: Dict[str, Any], entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        job_id = job.get("job_id", "unknown-job")
        source_type = job.get("source_type", "csv")
        target_graph = job.get("target_graph", "main")
        authority_id = job.get("authority_id", "unknown-authority")
        data_source_id = job.get("data_source_id", "unknown-source")
        timestamp = datetime.now(timezone.utc).isoformat()

        records = []
        for entity in entities:
            record_id = str(entity.get("id", ""))
            records.append(
                {
                    "job_id": job_id,
                    "record_id": record_id,
                    "source_type": source_type,
                    "target_graph": target_graph,
                    "authority_id": authority_id,
                    "data_source_id": data_source_id,
                    "payload": entity,
                    "ingested_at": timestamp,
                }
            )
        return records

    @staticmethod
    def _stringify_path(error: ValidationError) -> str:
        if not error.absolute_path:
            return "root"
        return "/".join(str(element) for element in error.absolute_path)
