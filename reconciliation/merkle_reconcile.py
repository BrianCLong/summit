from __future__ import annotations

import hashlib
import itertools
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import psycopg  # type: ignore[import-not-found]
except ModuleNotFoundError:  # pragma: no cover - fallback for older environments
    import psycopg2 as psycopg  # type: ignore[import-not-found]
from neo4j import GraphDatabase

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from provenance.openlineage_emitter import emit_event, emit_mutation_event

PG_DSN = os.getenv("PG_DSN", "postgresql://summit:summit@localhost:5432/summit")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASS", "summit")
REPAIR_LIMIT = int(os.getenv("REPAIR_LIMIT", "1000"))
CHUNK_SIZE = int(os.getenv("RECON_CHUNK_SIZE", "256"))
MISMATCH_RATE_SLO = float(os.getenv("MISMATCH_RATE_SLO", "0.0001"))
PARITY_DRIFT_THRESHOLD = float(os.getenv("PARITY_DRIFT_THRESHOLD", "0.0"))
TX_ALIGNMENT_SLO_SEC = int(os.getenv("TX_ALIGNMENT_SLO_SEC", "30"))
FRESHNESS_SLO_SEC = int(os.getenv("FRESHNESS_SLO_SEC", "60"))
OPENLINEAGE_AUDIT_FILE = os.getenv("OPENLINEAGE_AUDIT_FILE", "artifacts/lineage/openlineage.jsonl")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect_pg() -> Any:
    return psycopg.connect(PG_DSN)


def parse_iso(ts: str | None) -> float | None:
    if not ts:
        return None
    value = ts.strip()
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(value).timestamp()
    except ValueError:
        return None


def source_system_from_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    return f"pg://{host}:{port}"


def db_name_from_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    path = parsed.path.strip("/")
    return path or "postgres"


def canonical_checksum(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


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


def fetch_neo_people(session: Any) -> list[dict[str, Any]]:
    query = """
    MATCH (p:Person)
    WHERE coalesce(p.deleted, false) = false
    RETURN
      p.id AS id,
      p.name AS name,
      p.email AS email,
      p.summit_last_txid AS txid,
      p.summit_last_lsn AS lsn,
      p.summit_last_commit_ts AS commit_ts,
      p.summit_last_checksum AS checksum,
      p.summit_last_run_id AS run_id
    ORDER BY p.id
    """
    return [dict(row) for row in session.run(query)]


def fetch_neo_knows(session: Any) -> list[dict[str, Any]]:
    query = """
    MATCH (a:Person)-[e:KNOWS]->(b:Person)
    WHERE coalesce(e.deleted, false) = false
    RETURN
      e.id AS id,
      a.id AS from_id,
      b.id AS to_id,
      toString(e.since) AS since,
      e.summit_last_txid AS txid,
      e.summit_last_lsn AS lsn,
      e.summit_last_commit_ts AS commit_ts,
      e.summit_last_checksum AS checksum,
      e.summit_last_run_id AS run_id
    ORDER BY e.id
    """
    return [dict(row) for row in session.run(query)]


def build_repair_provenance(table: str, row: dict[str, Any]) -> dict[str, Any]:
    source_system = source_system_from_dsn(PG_DSN)
    db_name = db_name_from_dsn(PG_DSN)
    commit_ts = utc_now_iso()
    txid = "0"
    lsn = f"reconcile/{table}/{row.get('id')}"
    checksum = canonical_checksum({"table": table, "row": row, "op_type": "reconcile_repair"})
    return {
        "source_system": source_system,
        "db_name": db_name,
        "table": table,
        "txid": txid,
        "lsn": lsn,
        "commit_ts": commit_ts,
        "op_type": "reconcile_repair",
        "actor": "reconciler",
        "checksum": checksum,
        "run_id": f"txid:{txid}/lsn:{lsn}",
    }


def upsert_person(tx: Any, row: dict[str, Any], provenance: dict[str, Any]) -> bool:
    record = tx.run(
        """
        MERGE (p:Person {id: $id})
        SET p.name = $name,
            p.email = $email,
            p.deleted = false,
            p.summit_source_system = $source_system,
            p.summit_db_name = $db_name,
            p.summit_table = $table,
            p.summit_last_lsn = $lsn,
            p.summit_last_txid = $txid,
            p.summit_last_commit_ts = $commit_ts,
            p.summit_last_op_type = $op_type,
            p.summit_last_actor = $actor,
            p.summit_last_checksum = $checksum,
            p.summit_last_run_id = $run_id,
            p.summit_repaired_at = timestamp()
        RETURN true AS applied
        """,
        id=row["id"],
        name=row.get("name"),
        email=row.get("email"),
        **provenance,
    ).single()
    return bool(record and record.get("applied"))


def upsert_knows(tx: Any, row: dict[str, Any], provenance: dict[str, Any]) -> bool:
    record = tx.run(
        """
        MERGE (a:Person {id: $from_id})
        ON CREATE SET a.deleted = false
        MERGE (b:Person {id: $to_id})
        ON CREATE SET b.deleted = false
        MERGE (a)-[e:KNOWS {id: $id}]->(b)
        SET e.since = CASE WHEN $since IS NULL THEN NULL ELSE date($since) END,
            e.deleted = false,
            e.summit_source_system = $source_system,
            e.summit_db_name = $db_name,
            e.summit_table = $table,
            e.summit_last_lsn = $lsn,
            e.summit_last_txid = $txid,
            e.summit_last_commit_ts = $commit_ts,
            e.summit_last_op_type = $op_type,
            e.summit_last_actor = $actor,
            e.summit_last_checksum = $checksum,
            e.summit_last_run_id = $run_id,
            e.summit_repaired_at = timestamp()
        RETURN true AS applied
        """,
        id=row["id"],
        from_id=row["from_id"],
        to_id=row["to_id"],
        since=row.get("since"),
        **provenance,
    ).single()
    return bool(record and record.get("applied"))


def scan_entity(
    *,
    pg_rows: list[dict[str, Any]],
    neo_rows: list[dict[str, Any]],
    keys: list[str],
    write_fn,
    neo_session: Any,
    repair_budget: int,
    table_name: str,
    output_name_prefix: str,
) -> tuple[int, int, int, int]:
    detected = 0
    repaired = 0
    lineage_emitted = 0
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
            current_cmp = {k: current.get(k) for k in keys} if current else None
            row_cmp = {k: row.get(k) for k in keys}
            if current_cmp == row_cmp:
                continue
            detected += 1
            if repair_budget <= 0:
                continue

            provenance = build_repair_provenance(table_name, row)
            if neo_session.execute_write(write_fn, row, provenance):
                repaired += 1
                repair_budget -= 1
                if emit_mutation_event(
                    source_system=provenance["source_system"],
                    db_name=provenance["db_name"],
                    table=provenance["table"],
                    op_type=provenance["op_type"],
                    txid=provenance["txid"],
                    lsn=provenance["lsn"],
                    commit_ts=provenance["commit_ts"],
                    actor=provenance["actor"],
                    checksum=provenance["checksum"],
                    output_name=f"{output_name_prefix}({row.get('id')})",
                ):
                    lineage_emitted += 1

    return detected, repaired, repair_budget, lineage_emitted


def run_scan(
    pg_conn: psycopg.Connection[Any],
    neo_session: Any,
    repair_limit: int,
) -> tuple[int, int, int, int, list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    pg_people = fetch_pg_people(pg_conn)
    neo_people = fetch_neo_people(neo_session)
    pg_knows = fetch_pg_knows(pg_conn)
    neo_knows = fetch_neo_knows(neo_session)

    detected_people, repaired_people, budget, lineage_people = scan_entity(
        pg_rows=pg_people,
        neo_rows=neo_people,
        keys=["id", "name", "email"],
        write_fn=upsert_person,
        neo_session=neo_session,
        repair_budget=repair_limit,
        table_name="public.person",
        output_name_prefix="Person",
    )
    detected_knows, repaired_knows, budget, lineage_knows = scan_entity(
        pg_rows=pg_knows,
        neo_rows=neo_knows,
        keys=["id", "from_id", "to_id", "since"],
        write_fn=upsert_knows,
        neo_session=neo_session,
        repair_budget=budget,
        table_name="public.knows",
        output_name_prefix="KNOWS",
    )

    total_rows = len(pg_people) + len(pg_knows)
    return (
        detected_people + detected_knows,
        repaired_people + repaired_knows,
        total_rows,
        lineage_people + lineage_knows,
        pg_people,
        neo_people,
        pg_knows,
        neo_knows,
    )


def evaluate_parity(
    pg_rows: list[dict[str, Any]],
    neo_rows: list[dict[str, Any]],
    fields: list[str],
) -> dict[str, Any]:
    pg_by_id = {row["id"]: row for row in pg_rows}
    neo_by_id = {row["id"]: row for row in neo_rows}

    pg_ids = set(pg_by_id)
    neo_ids = set(neo_by_id)
    missing = sorted(pg_ids - neo_ids)
    extra = sorted(neo_ids - pg_ids)

    mismatched = []
    for row_id in sorted(pg_ids & neo_ids):
        pg_cmp = {field: pg_by_id[row_id].get(field) for field in fields}
        neo_cmp = {field: neo_by_id[row_id].get(field) for field in fields}
        if pg_cmp != neo_cmp:
            mismatched.append(row_id)

    pg_count = len(pg_rows)
    neo_count = len(neo_rows)
    count_drift = abs(pg_count - neo_count) / max(1, pg_count)

    return {
        "pg_count": pg_count,
        "graph_count": neo_count,
        "count_drift": count_drift,
        "missing": missing,
        "extra": extra,
        "value_mismatches": mismatched,
        "pass": count_drift <= PARITY_DRIFT_THRESHOLD
        and not missing
        and not extra
        and not mismatched,
    }


def evaluate_fk_fidelity(
    pg_knows: list[dict[str, Any]],
    neo_knows: list[dict[str, Any]],
) -> dict[str, Any]:
    pg_keys = [(row["id"], row["from_id"], row["to_id"]) for row in pg_knows]
    neo_keys = [(row["id"], row["from_id"], row["to_id"]) for row in neo_knows]

    neo_count: dict[tuple[Any, Any, Any], int] = {}
    for key in neo_keys:
        neo_count[key] = neo_count.get(key, 0) + 1

    missing = [key for key in pg_keys if key not in neo_count]
    duplicate = [(*key, count) for key, count in neo_count.items() if count > 1]
    orphan = [key for key in neo_count if key not in set(pg_keys)]

    return {
        "fk_rows": len(pg_keys),
        "missing_edges": missing,
        "duplicate_edges": duplicate,
        "orphan_edges": orphan,
        "pass": not missing and not duplicate and not orphan,
    }


def load_lineage_events(path: str) -> list[dict[str, Any]]:
    file_path = Path(path)
    if not file_path.exists():
        return []
    events: list[dict[str, Any]] = []
    with file_path.open("r", encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return events


def evaluate_tx_alignment(
    neo_people: list[dict[str, Any]],
    neo_knows: list[dict[str, Any]],
    lineage_events: list[dict[str, Any]],
) -> dict[str, Any]:
    by_run: dict[str, list[float]] = {}
    source_commit_times: list[float] = []
    for event in lineage_events:
        run_id = (event.get("run") or {}).get("runId")
        event_time = parse_iso(event.get("eventTime"))
        if run_id and event_time is not None:
            by_run.setdefault(run_id, []).append(event_time)

        for input_entry in event.get("inputs") or []:
            tx = (input_entry.get("facets") or {}).get("tx") or {}
            source_ts = parse_iso(tx.get("commit_ts"))
            if source_ts is not None:
                source_commit_times.append(source_ts)

    entities: list[tuple[str, dict[str, Any]]] = []
    entities.extend(("Person", row) for row in neo_people)
    entities.extend(("KNOWS", row) for row in neo_knows)

    missing_provenance: list[str] = []
    missing_lineage: list[str] = []
    max_lag = 0.0

    for label, row in entities:
        entity_id = row.get("id")
        run_id = row.get("run_id")
        lsn = row.get("lsn")
        txid = row.get("txid")
        commit_ts = row.get("commit_ts")
        checksum = row.get("checksum")

        if not all([run_id, lsn, txid, commit_ts, checksum]):
            missing_provenance.append(f"{label}:{entity_id}")
            continue

        lineage_times = by_run.get(str(run_id))
        if not lineage_times:
            missing_lineage.append(f"{label}:{entity_id}")
            continue

        commit_epoch = parse_iso(str(commit_ts))
        if commit_epoch is None:
            continue
        min_lag = min(max(0.0, lineage_time - commit_epoch) for lineage_time in lineage_times)
        max_lag = max(max_lag, min_lag)

    graph_commit_times = [
        t
        for t in [parse_iso(str(row.get("commit_ts"))) for row in [*neo_people, *neo_knows]]
        if t is not None
    ]

    source_max = max(source_commit_times) if source_commit_times else None
    graph_max = max(graph_commit_times) if graph_commit_times else None
    freshness_lag = None
    if source_max is not None and graph_max is not None:
        freshness_lag = max(0.0, source_max - graph_max)

    return {
        "missing_provenance": missing_provenance,
        "missing_lineage": missing_lineage,
        "max_lineage_lag_sec": round(max_lag, 6),
        "source_max_commit_ts": datetime.fromtimestamp(source_max, tz=timezone.utc).isoformat()
        if source_max is not None
        else None,
        "graph_max_commit_ts": datetime.fromtimestamp(graph_max, tz=timezone.utc).isoformat()
        if graph_max is not None
        else None,
        "freshness_lag_sec": round(freshness_lag, 6) if freshness_lag is not None else None,
        "gate_c_pass": not missing_provenance
        and not missing_lineage
        and max_lag <= TX_ALIGNMENT_SLO_SEC,
        "gate_d_pass": freshness_lag is not None and freshness_lag <= FRESHNESS_SLO_SEC,
    }


def main() -> None:
    emit_event("START", {"phase": "reconcile"})
    start = time.time()

    with (
        connect_pg() as pg_conn,
        GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS)).session(
            database="neo4j"
        ) as neo_session,
    ):
        (
            detected,
            repairs,
            total_rows,
            repair_lineage_emitted,
            _,
            _,
            _,
            _,
        ) = run_scan(pg_conn, neo_session, REPAIR_LIMIT)

        (
            residual,
            _,
            total_rows_after,
            _,
            pg_people,
            neo_people,
            pg_knows,
            neo_knows,
        ) = run_scan(pg_conn, neo_session, 0)

    latency_ms = int((time.time() - start) * 1000)
    total = max(1, total_rows_after or total_rows)
    mismatch_rate = residual / total

    gate_a_people = evaluate_parity(pg_people, neo_people, ["id", "name", "email"])
    gate_a_knows = evaluate_parity(pg_knows, neo_knows, ["id", "from_id", "to_id", "since"])
    gate_a_pass = gate_a_people["pass"] and gate_a_knows["pass"]

    gate_b = evaluate_fk_fidelity(pg_knows, neo_knows)
    gate_b_pass = gate_b["pass"]

    lineage_events = load_lineage_events(OPENLINEAGE_AUDIT_FILE)
    alignment = evaluate_tx_alignment(neo_people, neo_knows, lineage_events)
    gate_c_pass = alignment["gate_c_pass"]
    gate_d_pass = alignment["gate_d_pass"]

    emit_event(
        "COMPLETE",
        {
            "phase": "reconcile",
            "mismatches": residual,
            "repairs": repairs,
            "detected_mismatches": detected,
            "latency_ms": latency_ms,
            "gate_a_pass": gate_a_pass,
            "gate_b_pass": gate_b_pass,
            "gate_c_pass": gate_c_pass,
            "gate_d_pass": gate_d_pass,
            "repair_lineage_emitted": repair_lineage_emitted,
        },
    )

    print(
        f"MISMATCH_TOTAL={residual} MISMATCH_RATE={mismatch_rate:.5f} "
        f"REPAIRS={repairs} DETECTED_MISMATCHES={detected} LATENCY_MS={latency_ms}"
    )
    print(
        " ".join(
            [
                f"GATE_A={'PASS' if gate_a_pass else 'FAIL'}",
                f"GATE_B={'PASS' if gate_b_pass else 'FAIL'}",
                f"GATE_C={'PASS' if gate_c_pass else 'FAIL'}",
                f"GATE_D={'PASS' if gate_d_pass else 'FAIL'}",
            ]
        )
    )

    print(f"summit_mismatch_total={residual}")
    print(f"summit_reconcile_latency_ms={latency_ms}")
    print(f"summit_gate_a_pass={int(gate_a_pass)}")
    print(f"summit_gate_b_pass={int(gate_b_pass)}")
    print(f"summit_gate_c_pass={int(gate_c_pass)}")
    print(f"summit_gate_d_pass={int(gate_d_pass)}")

    if mismatch_rate >= MISMATCH_RATE_SLO:
        raise SystemExit(
            f"Mismatch rate {mismatch_rate:.5f} >= {MISMATCH_RATE_SLO:.5f}"
        )

    if not gate_a_pass:
        raise SystemExit("Gate A failed: parity mismatch")
    if not gate_b_pass:
        raise SystemExit("Gate B failed: FK->edge fidelity mismatch")
    if not gate_c_pass:
        raise SystemExit("Gate C failed: tx alignment mismatch")
    if not gate_d_pass:
        raise SystemExit("Gate D failed: freshness lag exceeded")


if __name__ == "__main__":
    main()
