import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import psycopg
from neo4j import GraphDatabase

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from provenance.openlineage_emitter import emit_event

PG_DSN = os.getenv("PG_DSN", "postgresql://summit:summit@localhost:5432/summit")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASS", "summit")
SLOT = os.getenv("PG_REPL_SLOT", "summit_slot")
OUTPUT_PLUGIN = os.getenv("PG_OUTPUT_PLUGIN", "wal2json")
PG_SCHEMA = os.getenv("PG_SCHEMA", "public")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))
POLL_INTERVAL_SEC = float(os.getenv("POLL_INTERVAL_SEC", "0.2"))


def ensure_slot(conn: psycopg.Connection[Any]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "select slot_name from pg_replication_slots where slot_name=%s",
            (SLOT,),
        )
        if cur.fetchone():
            return
        cur.execute(
            "select * from pg_create_logical_replication_slot(%s, %s)",
            (SLOT, OUTPUT_PLUGIN),
        )


def normalize_columns(change: dict[str, Any]) -> dict[str, Any]:
    names = change.get("columnnames")
    values = change.get("columnvalues")
    if names and values is not None:
        return dict(zip(names, values))
    oldkeys = change.get("oldkeys") or {}
    old_names = oldkeys.get("keynames") or []
    old_values = oldkeys.get("keyvalues") or []
    return dict(zip(old_names, old_values))


def upsert_person(tx: Any, row: dict[str, Any], lsn: str) -> None:
    tx.run(
        """
        MERGE (p:Person {id: $id})
        SET  p.name = $name,
             p.email = $email,
             p.deleted = false,
             p.summit_source = 'postgres',
             p.summit_source_lsn = $lsn,
             p.summit_ingested_at = timestamp()
        """,
        id=row["id"],
        name=row.get("name"),
        email=row.get("email"),
        lsn=lsn,
    )


def upsert_knows(tx: Any, row: dict[str, Any], lsn: str) -> None:
    tx.run(
        """
        MERGE (a:Person {id: $from_id})
        MERGE (b:Person {id: $to_id})
        MERGE (a)-[e:KNOWS {id: $id}]->(b)
        SET  e.since = CASE WHEN $since IS NULL THEN NULL ELSE date($since) END,
             e.deleted = false,
             e.summit_source = 'postgres',
             e.summit_source_lsn = $lsn,
             e.summit_ingested_at = timestamp()
        """,
        id=row["id"],
        from_id=row["from_id"],
        to_id=row["to_id"],
        since=row.get("since"),
        lsn=lsn,
    )


def soft_delete_person(tx: Any, row: dict[str, Any], lsn: str) -> None:
    tx.run(
        """
        MATCH (p:Person {id: $id})
        SET p.deleted = true,
            p.summit_source = 'postgres',
            p.summit_source_lsn = $lsn,
            p.summit_ingested_at = timestamp()
        """,
        id=row["id"],
        lsn=lsn,
    )


def soft_delete_knows(tx: Any, row: dict[str, Any], lsn: str) -> None:
    tx.run(
        """
        MATCH ()-[e:KNOWS {id: $id}]-()
        SET e.deleted = true,
            e.summit_source = 'postgres',
            e.summit_source_lsn = $lsn,
            e.summit_ingested_at = timestamp()
        """,
        id=row["id"],
        lsn=lsn,
    )


def process_change(neo, change: dict[str, Any], lsn: str) -> bool:
    table = change.get("table")
    schema = change.get("schema", "public")
    kind = change.get("kind")
    if schema != PG_SCHEMA:
        return False
    row = normalize_columns(change)
    if kind in {"insert", "update"}:
        if table == "person":
            neo.execute_write(upsert_person, row, lsn)
            return True
        if table == "knows":
            neo.execute_write(upsert_knows, row, lsn)
            return True
    if kind == "delete":
        if table == "person":
            neo.execute_write(soft_delete_person, row, lsn)
            return True
        if table == "knows":
            neo.execute_write(soft_delete_knows, row, lsn)
            return True
    return False


def poll_slot_changes(conn: psycopg.Connection[Any]) -> list[tuple[str, str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT lsn::text, data
            FROM pg_logical_slot_get_changes(
              %s,
              NULL,
              %s,
              'pretty-print', '0'
            )
            """,
            (SLOT, BATCH_SIZE),
        )
        return cur.fetchall()


def main() -> None:
    emit_event("ingestion_start", {"schema": PG_SCHEMA, "slot": SLOT})
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    with (
        psycopg.connect(PG_DSN, autocommit=True) as conn,
        driver.session(database="neo4j") as neo,
    ):
        ensure_slot(conn)
        while True:
            raw_changes = poll_slot_changes(conn)
            if not raw_changes:
                time.sleep(POLL_INTERVAL_SEC)
                continue
            applied_count = 0
            last_lsn = None
            for lsn, payload in raw_changes:
                last_lsn = str(lsn)
                if not payload:
                    continue
                decoded = json.loads(payload)
                for change in decoded.get("change", []):
                    applied_count += int(process_change(neo, change, last_lsn))
            emit_event(
                "batch_applied",
                {
                    "slot": SLOT,
                    "last_lsn": last_lsn,
                    "changes_polled": len(raw_changes),
                    "changes_applied": applied_count,
                },
            )


if __name__ == "__main__":
    main()
