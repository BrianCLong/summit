import hashlib
import itertools
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
REPAIR_LIMIT = int(os.getenv("REPAIR_LIMIT", "1000"))
CHUNK_SIZE = int(os.getenv("RECON_CHUNK_SIZE", "256"))


def phash(rows: list[dict[str, Any]], keys: list[str]) -> str:
    digest = hashlib.sha256()
    for row in rows:
        digest.update("|".join(str(row.get(k)) for k in keys).encode())
    return digest.hexdigest()


def chunked(iterable: list[dict[str, Any]], size: int):
    iterator = iter(iterable)
    while True:
        chunk = list(itertools.islice(iterator, size))
        if not chunk:
            return
        yield chunk


def fetch_pg_people(conn: psycopg.Connection[Any]) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute("select id, name, email from person order by id")
        return [{"id": r[0], "name": r[1], "email": r[2]} for r in cur.fetchall()]


def fetch_pg_knows(conn: psycopg.Connection[Any]) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute("select id, from_id, to_id, since::text from knows order by id")
        return [
            {"id": r[0], "from_id": r[1], "to_id": r[2], "since": r[3]}
            for r in cur.fetchall()
        ]


def fetch_neo_people(session) -> list[dict[str, Any]]:
    query = """
    MATCH (p:Person)
    WHERE coalesce(p.deleted, false) = false
    RETURN p.id AS id, p.name AS name, p.email AS email
    ORDER BY p.id
    """
    return [dict(row) for row in session.run(query)]


def fetch_neo_knows(session) -> list[dict[str, Any]]:
    query = """
    MATCH (a:Person)-[e:KNOWS]->(b:Person)
    WHERE coalesce(e.deleted, false) = false
    RETURN e.id AS id, a.id AS from_id, b.id AS to_id, toString(e.since) AS since
    ORDER BY e.id
    """
    return [dict(row) for row in session.run(query)]


def upsert_person(tx: Any, row: dict[str, Any]) -> None:
    tx.run(
        """
        MERGE (p:Person {id: $id})
        SET p.name = $name,
            p.email = $email,
            p.deleted = false,
            p.summit_source = 'postgres',
            p.summit_repaired_at = timestamp()
        """,
        **row,
    )


def upsert_knows(tx: Any, row: dict[str, Any]) -> None:
    tx.run(
        """
        MERGE (a:Person {id: $from_id})
        MERGE (b:Person {id: $to_id})
        MERGE (a)-[e:KNOWS {id: $id}]->(b)
        SET e.since = CASE WHEN $since IS NULL THEN NULL ELSE date($since) END,
            e.deleted = false,
            e.summit_source = 'postgres',
            e.summit_repaired_at = timestamp()
        """,
        **row,
    )


def scan_entity(
    *,
    pg_rows: list[dict[str, Any]],
    neo_rows: list[dict[str, Any]],
    keys: list[str],
    write_fn,
    neo_session,
    repair_budget: int,
) -> tuple[int, int, int]:
    detected = 0
    repaired = 0
    pg_by_id = {row["id"]: row for row in pg_rows}
    neo_by_id = {row["id"]: row for row in neo_rows}
    extra_ids = sorted(set(neo_by_id) - set(pg_by_id))
    detected += len(extra_ids)

    for pg_chunk in chunked(pg_rows, CHUNK_SIZE):
        ids = [row["id"] for row in pg_chunk]
        neo_chunk = [neo_by_id[i] for i in ids if i in neo_by_id]
        if phash(pg_chunk, keys) == phash(neo_chunk, keys):
            continue
        for row in pg_chunk:
            current = neo_by_id.get(row["id"])
            if current == row:
                continue
            detected += 1
            if repair_budget <= 0:
                continue
            neo_session.execute_write(write_fn, row)
            repaired += 1
            repair_budget -= 1
    return detected, repaired, repair_budget


def run_scan(pg_conn: psycopg.Connection[Any], neo_session, repair_limit: int) -> tuple[int, int, int]:
    pg_people = fetch_pg_people(pg_conn)
    neo_people = fetch_neo_people(neo_session)
    pg_knows = fetch_pg_knows(pg_conn)
    neo_knows = fetch_neo_knows(neo_session)

    detected_people, repaired_people, budget = scan_entity(
        pg_rows=pg_people,
        neo_rows=neo_people,
        keys=["id", "name", "email"],
        write_fn=upsert_person,
        neo_session=neo_session,
        repair_budget=repair_limit,
    )
    detected_knows, repaired_knows, budget = scan_entity(
        pg_rows=pg_knows,
        neo_rows=neo_knows,
        keys=["id", "from_id", "to_id", "since"],
        write_fn=upsert_knows,
        neo_session=neo_session,
        repair_budget=budget,
    )
    total_rows = len(pg_people) + len(pg_knows)
    return detected_people + detected_knows, repaired_people + repaired_knows, total_rows


def main() -> None:
    emit_event("reconcile_start", {})
    start = time.time()
    with (
        psycopg.connect(PG_DSN) as pg_conn,
        GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS)).session(
            database="neo4j"
        ) as neo_session,
    ):
        detected, repairs, total_rows = run_scan(pg_conn, neo_session, REPAIR_LIMIT)
        residual, _, total_rows_after = run_scan(pg_conn, neo_session, 0)
    latency_ms = int((time.time() - start) * 1000)
    total = max(1, total_rows_after or total_rows)
    mismatch_rate = residual / total
    emit_event(
        "reconcile_complete",
        {
            "mismatches": residual,
            "repairs": repairs,
            "detected_mismatches": detected,
            "latency_ms": latency_ms,
        },
    )
    print(
        f"MISMATCH_TOTAL={residual} MISMATCH_RATE={mismatch_rate:.5f} "
        f"REPAIRS={repairs} DETECTED_MISMATCHES={detected} LATENCY_MS={latency_ms}"
    )
    print(f"summit_mismatch_total={residual}")
    print(f"summit_reconcile_latency_ms={latency_ms}")
    if mismatch_rate >= 0.0001:
        raise SystemExit(f"Mismatch rate {mismatch_rate:.5f} >= 0.01%")


if __name__ == "__main__":
    main()
