#!/usr/bin/env python3
"""Utility for anonymizing Summit data across PostgreSQL and Neo4j.

This script masks personally identifiable information (PII) to help satisfy
GDPR erasure and minimization requests. It can be invoked directly or via the
GraphQL anonymization mutation.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from faker import Faker

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError as exc:  # pragma: no cover - runtime dependency validation
    raise SystemExit(
        "psycopg2 is required to run the anonymizer. Install with `pip install psycopg2-binary`."
    ) from exc

try:
    from neo4j import GraphDatabase
except ImportError as exc:  # pragma: no cover - runtime dependency validation
    raise SystemExit(
        "neo4j-driver is required to run the anonymizer. Install with `pip install neo4j`."
    ) from exc


def log(message: str) -> None:
    """Emit operational logging to stderr so stdout can remain structured JSON."""
    timestamp = datetime.utcnow().isoformat(timespec="seconds")
    print(f"[{timestamp}] {message}", file=sys.stderr)


PII_PROPERTY_KEYS = {
    "email",
    "primaryEmail",
    "secondaryEmail",
    "name",
    "firstName",
    "lastName",
    "fullName",
    "phone",
    "phoneNumber",
    "mobile",
    "address",
}


@dataclass
class RunSummary:
    run_id: str
    scope: List[str]
    dry_run: bool
    status: str = "PENDING"
    started_at: datetime = field(default_factory=lambda: datetime.utcnow())
    completed_at: Optional[datetime] = None
    masked_postgres: int = 0
    masked_neo4j: int = 0
    notes: Optional[str] = None

    def as_json(self) -> Dict[str, object]:
        return {
            "run_id": self.run_id,
            "status": self.status,
            "dry_run": self.dry_run,
            "scope": self.scope,
            "started_at": self.started_at.replace(tzinfo=None).isoformat() + "Z",
            "completed_at": self.completed_at.replace(tzinfo=None).isoformat() + "Z"
            if self.completed_at
            else None,
            "masked_postgres": self.masked_postgres,
            "masked_neo4j": self.masked_neo4j,
            "notes": self.notes,
        }


class AnonymizationRunner:
    def __init__(
        self,
        scope: Iterable[str],
        dry_run: bool,
        triggered_by: Optional[str],
        run_id: Optional[str] = None,
    ) -> None:
        unique_scope = list(dict.fromkeys(scope)) or ["POSTGRES", "NEO4J"]
        self.summary = RunSummary(
            run_id=run_id or str(uuid.uuid4()),
            scope=unique_scope,
            dry_run=dry_run,
        )
        self.triggered_by = triggered_by
        self.faker = Faker()
        self._pg_conn = None

    # ---- PostgreSQL helpers -------------------------------------------------
    def _pg_connect(self):
        dsn = os.getenv("DATABASE_URL")
        if dsn:
            return psycopg2.connect(dsn)
        host = os.getenv("DB_HOST", "localhost")
        port = int(os.getenv("DB_PORT", "5432"))
        user = os.getenv("DB_USER")
        password = os.getenv("DB_PASSWORD")
        dbname = os.getenv("DB_NAME", "summit")
        sslmode = os.getenv("DB_SSLMODE", "prefer")
        return psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname,
            sslmode=sslmode,
        )

    @contextmanager
    def pg_cursor(self):
        if not self._pg_conn:
            self._pg_conn = self._pg_connect()
            self._pg_conn.autocommit = False
        cursor = self._pg_conn.cursor()
        try:
            yield cursor
        finally:
            cursor.close()

    def prepare_run(self) -> None:
        log(f"Initializing anonymization run {self.summary.run_id} for scope {self.summary.scope}")
        with self.pg_cursor() as cur:
            cur.execute(
                """
                INSERT INTO anonymization_runs (id, triggered_by, scope, dry_run, status, started_at)
                VALUES (%s, %s, %s, %s, 'RUNNING', now())
                ON CONFLICT (id)
                DO UPDATE SET scope = EXCLUDED.scope, dry_run = EXCLUDED.dry_run, status = 'RUNNING', started_at = now()
                """,
                (
                    self.summary.run_id,
                    self.triggered_by,
                    list(self.summary.scope),
                    self.summary.dry_run,
                ),
            )
        self._pg_conn.commit()

    def anonymize_postgres(self) -> None:
        log("Scanning PostgreSQL for sensitive records")
        total_updated = 0
        entity_updates = 0

        with self.pg_cursor() as cur:
            # Users table
            cur.execute("SELECT id FROM users")
            users = [row[0] for row in cur.fetchall()]
            log(f"Found {len(users)} user records for anonymization")
            self.faker.unique.clear()
            for user_id in users:
                fake_email = self.faker.unique.email()
                fake_name = self.faker.name()
                cur.execute(
                    """
                    UPDATE users
                    SET email = %s,
                        display_name = %s,
                        anonymized_at = now(),
                        anonymization_run_id = %s
                    WHERE id = %s
                    """,
                    (fake_email, fake_name, self.summary.run_id, user_id),
                )
            total_updated += len(users)

            # Entities table
            cur.execute("SELECT id, type, name, properties FROM entities")
            rows = cur.fetchall()
            log(f"Evaluating {len(rows)} entity records for anonymization")
            self.faker.unique.clear()
            for entity_id, entity_type, entity_name, properties in rows:
                props = properties or {}
                if isinstance(props, str):
                    props = json.loads(props)
                updated = False

                if entity_name:
                    entity_name = self.faker.name()
                    updated = True

                if entity_type and entity_type.lower() == "person" and not entity_name:
                    entity_name = self.faker.name()
                    updated = True

                for key in list(props.keys()):
                    if key in PII_PROPERTY_KEYS:
                        props[key] = self._fake_value_for_key(key)
                        updated = True

                if updated:
                    cur.execute(
                        """
                        UPDATE entities
                        SET name = %s,
                            properties = %s,
                            anonymized_at = now(),
                            anonymization_run_id = %s
                        WHERE id = %s
                        """,
                        (
                            entity_name,
                            Json(props),
                            self.summary.run_id,
                            entity_id,
                        ),
                    )
                    entity_updates += 1

        if self.summary.dry_run:
            self._pg_conn.rollback()
        else:
            self._pg_conn.commit()
        self.summary.masked_postgres = total_updated + entity_updates
        log(
            f"PostgreSQL anonymization {'simulated' if self.summary.dry_run else 'completed'} for "
            f"{self.summary.masked_postgres} records"
        )

    def finalize_postgres_status(self, status: str, notes: Optional[str]) -> None:
        if not self._pg_conn:
            return
        with self.pg_cursor() as cur:
            cur.execute(
                """
                UPDATE anonymization_runs
                SET status = %s,
                    completed_at = now(),
                    masked_postgres = %s,
                    masked_neo4j = %s,
                    notes = %s
                WHERE id = %s
                """,
                (
                    status,
                    self.summary.masked_postgres,
                    self.summary.masked_neo4j,
                    notes,
                    self.summary.run_id,
                ),
            )
        self._pg_conn.commit()

    def close(self) -> None:
        if self._pg_conn:
            self._pg_conn.close()
            self._pg_conn = None

    # ---- Neo4j helpers -----------------------------------------------------
    def anonymize_neo4j(self) -> None:
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")
        database = os.getenv("NEO4J_DATABASE")
        auth = None
        if user and password:
            auth = (user, password)

        log("Connecting to Neo4j for anonymization")
        driver = GraphDatabase.driver(uri, auth=auth)
        try:
            def execute_mask(tx):
                self.faker.unique.clear()
                records = list(
                    tx.run(
                        "MATCH (p:Person) RETURN elementId(p) AS element_id, p.name AS name, p.email AS email, p.phone AS phone"
                    )
                )
                updated = 0
                for record in records:
                    element_id = record["element_id"]
                    tx.run(
                        """
                        MATCH (p) WHERE elementId(p) = $element_id
                        SET p.name = $name,
                            p.email = $email,
                            p.phone = $phone,
                            p.anonymized = true,
                            p.anonymizedAt = datetime(),
                            p.anonymizationRunId = $run_id
                        """,
                        {
                            "element_id": element_id,
                            "name": self.faker.name(),
                            "email": self.faker.unique.email(),
                            "phone": self.faker.phone_number(),
                            "run_id": self.summary.run_id,
                        },
                    )
                    updated += 1
                return updated

            def count_candidates(tx):
                result = tx.run("MATCH (p:Person) RETURN count(p) AS count")
                value = result.single()["count"]
                return int(value or 0)

            with driver.session(database=database) as session:
                if self.summary.dry_run:
                    self.summary.masked_neo4j = session.execute_read(count_candidates)
                else:
                    self.summary.masked_neo4j = session.execute_write(execute_mask)
                    session.run(
                        """
                        MERGE (run:AnonymizationRun {id: $run_id})
                        SET run.completedAt = datetime(),
                            run.startedAt = coalesce(run.startedAt, datetime()),
                            run.scope = $scope,
                            run.maskedNodes = $masked_nodes
                        """,
                        {
                            "run_id": self.summary.run_id,
                            "scope": list(self.summary.scope),
                            "masked_nodes": self.summary.masked_neo4j,
                        },
                    )
        finally:
            driver.close()
        log(
            f"Neo4j anonymization {'simulated' if self.summary.dry_run else 'completed'} for "
            f"{self.summary.masked_neo4j} nodes"
        )

    # ---- Utility helpers ---------------------------------------------------
    def _fake_value_for_key(self, key: str):
        lowered = key.lower()
        if "email" in lowered:
            return self.faker.unique.email()
        if "phone" in lowered or "mobile" in lowered:
            return self.faker.phone_number()
        if "first" in lowered:
            return self.faker.first_name()
        if "last" in lowered:
            return self.faker.last_name()
        if "name" in lowered:
            return self.faker.name()
        if "address" in lowered:
            return self.faker.address()
        return self.faker.word()


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Anonymize Summit data for GDPR compliance")
    parser.add_argument("--run-id", help="Existing anonymization run identifier")
    parser.add_argument("--triggered-by", help="User identifier that initiated the run")
    parser.add_argument(
        "--postgres",
        dest="postgres",
        action="store_true",
        help="Anonymize PostgreSQL data",
    )
    parser.add_argument(
        "--neo4j",
        dest="neo4j",
        action="store_true",
        help="Anonymize Neo4j data",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without committing them",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    scope: List[str] = []
    if args.postgres:
        scope.append("POSTGRES")
    if args.neo4j:
        scope.append("NEO4J")

    runner = AnonymizationRunner(scope=scope, dry_run=args.dry_run, triggered_by=args.triggered_by, run_id=args.run_id)

    try:
        runner.prepare_run()
        notes: Optional[str] = None

        if "POSTGRES" in runner.summary.scope:
            runner.anonymize_postgres()
        if "NEO4J" in runner.summary.scope:
            runner.anonymize_neo4j()

        runner.summary.completed_at = datetime.utcnow()
        if runner.summary.dry_run:
            runner.summary.status = "DRY_RUN"
            notes = "Dry run completed. No changes were committed."
        else:
            runner.summary.status = "COMPLETED"
            notes = (
                f"Anonymized {runner.summary.masked_postgres} PostgreSQL records and "
                f"{runner.summary.masked_neo4j} Neo4j nodes."
            )
        runner.summary.notes = notes
        runner.finalize_postgres_status(runner.summary.status, notes)
        print(json.dumps(runner.summary.as_json()))
        return 0
    except Exception as exc:  # pragma: no cover - defensive logging
        log(f"Anonymization failed: {exc}")
        runner.summary.status = "FAILED"
        runner.summary.notes = str(exc)
        runner.summary.completed_at = datetime.utcnow()
        runner.finalize_postgres_status("FAILED", runner.summary.notes)
        return 1
    finally:
        runner.close()


if __name__ == "__main__":
    sys.exit(main())
