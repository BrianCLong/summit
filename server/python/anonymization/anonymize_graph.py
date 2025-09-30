"""Graph data anonymization utilities for Neo4j and PostgreSQL."""

from __future__ import annotations

import argparse
import json
import logging
import os
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Dict, Iterable, List, Optional, Sequence

logger = logging.getLogger(__name__)


@dataclass
class GraphNodeConfig:
    """Configuration for anonymizing a Neo4j label."""

    label: str
    properties: Sequence[str]
    tenant_property: str = "tenant_id"


@dataclass
class TableColumnConfig:
    """Configuration for anonymizing a PostgreSQL table."""

    table: str
    columns: Sequence[str]
    primary_key: str = "id"
    tenant_column: str = "tenant_id"


@dataclass
class GraphAnonymizationConfig:
    """Aggregate configuration for anonymization."""

    tenant_id: Optional[str]
    dry_run: bool = False
    node_properties: List[GraphNodeConfig] = field(default_factory=list)
    table_columns: List[TableColumnConfig] = field(default_factory=list)
    salt: Optional[str] = None


class _NoOpSpan:
    """Fallback span used when OpenTelemetry is unavailable."""

    def __enter__(self) -> "_NoOpSpan":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: D401 - standard context manager signature
        return None

    def set_attribute(self, *_: Any, **__: Any) -> None:
        return None

    def set_attributes(self, attributes: Dict[str, Any]) -> None:
        return None

    def add_event(self, *_: Any, **__: Any) -> None:
        return None


class _NoOpTracer:
    def start_as_current_span(self, *_: Any, **__: Any):  # noqa: ANN001 - match signature of real tracer
        return _NoOpSpan()


def _build_tracer(service_name: str):
    """Attempt to construct an OpenTelemetry tracer, falling back to a no-op tracer."""

    try:
        from opentelemetry import trace  # type: ignore
        from opentelemetry.sdk.resources import Resource  # type: ignore
        from opentelemetry.sdk.trace import TracerProvider  # type: ignore
        from opentelemetry.sdk.trace.export import (  # type: ignore
            BatchSpanProcessor,
            ConsoleSpanExporter,
        )
    except ImportError:  # pragma: no cover - exercised only when OTel is absent
        logger.debug("OpenTelemetry not installed; using no-op tracer")
        return _NoOpTracer()

    provider = trace.get_tracer_provider()
    if not isinstance(provider, TracerProvider):
        provider = TracerProvider(resource=Resource.create({"service.name": service_name}))
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
        trace.set_tracer_provider(provider)

    return trace.get_tracer(service_name)


@contextmanager
def _start_span(tracer: Any, name: str, attributes: Optional[Dict[str, Any]] = None):
    """Helper to start a span with optional attributes."""

    ctx = tracer.start_as_current_span(name)
    with ctx as span:  # type: ignore[assignment]
        if hasattr(span, "set_attributes") and attributes:
            span.set_attributes(attributes)
        yield span


class GraphAnonymizer:
    """Coordinates anonymization across Neo4j and PostgreSQL data stores."""

    def __init__(
        self,
        neo4j_driver: Any,
        pg_connection: Any,
        *,
        tracer: Optional[Any] = None,
        salt: Optional[str] = None,
    ) -> None:
        self._neo4j = neo4j_driver
        self._pg = pg_connection
        self._tracer = tracer or _build_tracer("graph-anonymizer")
        self._salt = salt or os.environ.get("GRAPH_ANONYMIZATION_SALT", "summit-anonymizer")

    @staticmethod
    def pseudonymize_value(value: Any, *, salt: str) -> str:
        """Generate a deterministic pseudonym for the provided value."""

        material = f"{salt}:{value}".encode("utf-8")
        digest = sha256(material).hexdigest()
        return digest[:32]

    def anonymize(
        self,
        config: GraphAnonymizationConfig,
    ) -> Dict[str, Any]:
        """Execute anonymization according to the provided configuration."""

        started_at = datetime.now(timezone.utc)
        node_summary = self._anonymize_nodes(config)
        table_summary = self._anonymize_tables(config)
        completed_at = datetime.now(timezone.utc)

        summary = {
            "dry_run": config.dry_run,
            "tenant_id": config.tenant_id,
            "node_summary": node_summary,
            "table_summary": table_summary,
            "started_at": started_at.isoformat(),
            "completed_at": completed_at.isoformat(),
        }

        logger.info(
            "Graph anonymization finished", extra={"summary": summary}
        )
        return summary

    def _anonymize_nodes(self, config: GraphAnonymizationConfig) -> List[Dict[str, Any]]:
        if not config.node_properties:
            return []

        summaries: List[Dict[str, Any]] = []
        salt = config.salt or self._salt

        for node_cfg in config.node_properties:
            processed = 0
            with _start_span(
                self._tracer,
                "neo4j.anonymize",
                {
                    "graph.label": node_cfg.label,
                    "graph.properties": ",".join(node_cfg.properties),
                    "graph.tenant_id": config.tenant_id or "*",
                    "graph.dry_run": config.dry_run,
                },
            ) as span:
                session = self._neo4j.session()
                try:
                    projection = ", ".join(
                        f"{prop}: n.{prop}" for prop in node_cfg.properties
                    )
                    if not projection:
                        continue

                    tenant_clause = (
                        f"WHERE n.{node_cfg.tenant_property} = $tenantId"
                        if config.tenant_id
                        else ""
                    )
                    query = (
                        f"MATCH (n:{node_cfg.label}) {tenant_clause} "
                        f"RETURN id(n) as id, {{{projection}}} as props"
                    )
                    params: Dict[str, Any] = {}
                    if config.tenant_id:
                        params["tenantId"] = config.tenant_id

                    result = session.run(query, params)
                    for record in result:  # type: ignore[assignment]
                        props = record.get("props", {})
                        updates = {}
                        for prop in node_cfg.properties:
                            if prop in props and props[prop] is not None:
                                updates[prop] = self.pseudonymize_value(
                                    props[prop], salt=salt
                                )
                        if not updates:
                            continue
                        processed += 1
                        if not config.dry_run:
                            session.run(
                                "MATCH (n) WHERE id(n) = $id SET n += $updates",
                                {"id": record["id"], "updates": updates},
                            )
                    if hasattr(span, "add_event"):
                        span.add_event(
                            "neo4j.anonymized",
                            {
                                "graph.label": node_cfg.label,
                                "graph.nodes_processed": processed,
                                "graph.properties": ",".join(node_cfg.properties),
                            },
                        )
                finally:
                    session.close()

            summaries.append(
                {
                    "label": node_cfg.label,
                    "properties": list(node_cfg.properties),
                    "nodes_processed": processed,
                }
            )

        return summaries

    def _anonymize_tables(self, config: GraphAnonymizationConfig) -> List[Dict[str, Any]]:
        if not config.table_columns:
            return []

        summaries: List[Dict[str, Any]] = []
        salt = config.salt or self._salt

        for table_cfg in config.table_columns:
            cursor = self._pg.cursor()
            processed = 0
            with _start_span(
                self._tracer,
                "postgres.anonymize",
                {
                    "db.table": table_cfg.table,
                    "db.columns": ",".join(table_cfg.columns),
                    "graph.tenant_id": config.tenant_id or "*",
                    "graph.dry_run": config.dry_run,
                },
            ) as span:
                try:
                    column_projection = ", ".join([table_cfg.primary_key, *table_cfg.columns])
                    where_clause = (
                        f"WHERE {table_cfg.tenant_column} = %s"
                        if config.tenant_id
                        else ""
                    )
                    select_query = (
                        f"SELECT {column_projection} FROM {table_cfg.table} {where_clause}"
                    )
                    params: Sequence[Any]
                    if config.tenant_id:
                        params = (config.tenant_id,)
                    else:
                        params = tuple()

                    cursor.execute(select_query, params)
                    rows = cursor.fetchall()
                    for row in rows:
                        pk = row[0]
                        values = row[1:]
                        updates: Dict[str, Any] = {}
                        for column, value in zip(table_cfg.columns, values):
                            if value is not None:
                                updates[column] = self.pseudonymize_value(
                                    value, salt=salt
                                )
                        if not updates:
                            continue
                        processed += 1
                        if not config.dry_run:
                            set_clause = ", ".join(
                                f"{col} = %s" for col in updates.keys()
                            )
                            update_query = (
                                f"UPDATE {table_cfg.table} SET {set_clause} "
                                f"WHERE {table_cfg.primary_key} = %s"
                            )
                            cursor.execute(
                                update_query,
                                [*updates.values(), pk],
                            )
                    if not config.dry_run:
                        self._pg.commit()
                    else:
                        self._pg.rollback()
                    if hasattr(span, "add_event"):
                        span.add_event(
                            "postgres.anonymized",
                            {
                                "db.table": table_cfg.table,
                                "db.rows_processed": processed,
                                "db.columns": ",".join(table_cfg.columns),
                            },
                        )
                finally:
                    cursor.close()

            summaries.append(
                {
                    "table": table_cfg.table,
                    "columns": list(table_cfg.columns),
                    "rows_processed": processed,
                }
            )

        return summaries


def _parse_node_configs(raw_nodes: Iterable[Dict[str, Any]]) -> List[GraphNodeConfig]:
    return [
        GraphNodeConfig(
            label=node["label"],
            properties=node.get("properties", []),
            tenant_property=node.get("tenant_property", "tenant_id"),
        )
        for node in raw_nodes
    ]


def _parse_table_configs(raw_tables: Iterable[Dict[str, Any]]) -> List[TableColumnConfig]:
    return [
        TableColumnConfig(
            table=table["table"],
            columns=table.get("columns", []),
            primary_key=table.get("primary_key", "id"),
            tenant_column=table.get("tenant_column", "tenant_id"),
        )
        for table in raw_tables
    ]


def load_config_from_path(path: str) -> GraphAnonymizationConfig:
    """Load anonymization configuration from a JSON file."""

    with open(path, "r", encoding="utf-8") as handle:
        raw = json.load(handle)

    return GraphAnonymizationConfig(
        tenant_id=raw.get("tenant_id"),
        dry_run=bool(raw.get("dry_run", False)),
        node_properties=_parse_node_configs(raw.get("node_properties", [])),
        table_columns=_parse_table_configs(raw.get("table_columns", [])),
        salt=raw.get("salt"),
    )


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Anonymize graph data for testing or sharing")
    parser.add_argument(
        "--config",
        required=True,
        help="Path to a JSON file describing anonymization instructions",
    )

    args = parser.parse_args(argv)

    config = load_config_from_path(args.config)

    # Lazily import heavy drivers when script is executed.
    try:
        from neo4j import GraphDatabase  # type: ignore
    except ImportError as exc:  # pragma: no cover - executed only when driver missing
        raise RuntimeError("neo4j driver is required to run the anonymizer") from exc

    try:
        import psycopg2  # type: ignore
    except ImportError as exc:  # pragma: no cover - executed only when driver missing
        raise RuntimeError("psycopg2 is required to run the anonymizer") from exc

    neo4j_uri = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.environ.get("NEO4J_USER", "neo4j")
    neo4j_password = os.environ.get("NEO4J_PASSWORD", "password")
    pg_dsn = os.environ.get("POSTGRES_DSN") or os.environ.get("DATABASE_URL")

    if not pg_dsn:
        raise RuntimeError("POSTGRES_DSN or DATABASE_URL must be set")

    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
    pg_connection = psycopg2.connect(pg_dsn)

    anonymizer = GraphAnonymizer(driver, pg_connection, salt=config.salt)

    summary = anonymizer.anonymize(config)
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI path tested via main()
    logging.basicConfig(level=logging.INFO)
    raise SystemExit(main())
