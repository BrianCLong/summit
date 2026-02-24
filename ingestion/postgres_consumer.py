from __future__ import annotations

import hashlib
import json
import os
import re
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
SLOT = os.getenv("PG_REPL_SLOT", "summit_slot")
OUTPUT_PLUGIN = os.getenv("PG_OUTPUT_PLUGIN", "test_decoding")
PG_SCHEMA = os.getenv("PG_SCHEMA", "public")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "500"))
POLL_INTERVAL_SEC = float(os.getenv("POLL_INTERVAL_SEC", "0.2"))
DEFAULT_ACTOR = os.getenv("CDC_ACTOR", "postgres_consumer")

TD_ROW_RE = re.compile(
    r"table\s+(?P<schema>\w+)\.(?P<table>\w+):\s+"
    r"(?P<kind>INSERT|UPDATE|DELETE):\s*(?P<fields>.*)$"
)
TD_FIELD_RE = re.compile(r"(\w+)\[[^\]]+\]:(null|'(?:''|[^'])*'|\S+)")

_COMMIT_TS_SUPPORTED: bool | None = None


def connect_pg(*, autocommit: bool) -> Any:
    conn = psycopg.connect(PG_DSN)
    try:
        conn.autocommit = autocommit
    except Exception:
        pass
    return conn


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def source_system_from_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    return f"pg://{host}:{port}"


def db_name_from_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    path = parsed.path.strip("/")
    return path or "postgres"


def lsn_to_int(lsn: str) -> int:
    if not lsn or "/" not in lsn:
        return -1
    upper, lower = lsn.split("/", maxsplit=1)
    return (int(upper, 16) << 32) + int(lower, 16)


def parse_txid(txid: str | None) -> int:
    if not txid:
        return -1
    try:
        return int(txid)
    except ValueError:
        return -1


def canonical_checksum(payload: dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def resolve_commit_ts(conn: Any, xid: str | None) -> str:
    global _COMMIT_TS_SUPPORTED

    if not xid:
        return utc_now_iso()

    if _COMMIT_TS_SUPPORTED is False:
        return utc_now_iso()

    try:
        with conn.cursor() as cur:
            cur.execute("select pg_xact_commit_timestamp(%s::xid)::text", (xid,))
            row = cur.fetchone()
        _COMMIT_TS_SUPPORTED = True
        if row and row[0]:
            return str(row[0])
    except psycopg.Error:
        _COMMIT_TS_SUPPORTED = False

    return utc_now_iso()


def ensure_slot(conn: Any) -> None:
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


def parse_test_decoding_value(raw: str) -> Any:
    if raw == "null":
        return None
    if raw.startswith("'") and raw.endswith("'"):
        return raw[1:-1].replace("''", "'")
    if raw.lstrip("-").isdigit():
        try:
            return int(raw)
        except ValueError:
            return raw
    return raw


def parse_test_decoding_payload(payload: str) -> list[dict[str, Any]]:
    match = TD_ROW_RE.match(payload.strip())
    if not match:
        return []
    parsed = match.groupdict()
    names: list[str] = []
    values: list[Any] = []
    for field_match in TD_FIELD_RE.finditer(parsed["fields"]):
        names.append(field_match.group(1))
        values.append(parse_test_decoding_value(field_match.group(2)))
    return [
        {
            "schema": parsed["schema"],
            "table": parsed["table"],
            "kind": parsed["kind"].lower(),
            "columnnames": names,
            "columnvalues": values,
        }
    ]


def parse_payload(payload: str) -> list[dict[str, Any]]:
    trimmed = payload.strip()
    if not trimmed:
        return []
    if trimmed.startswith("{"):
        decoded = json.loads(trimmed)
        return decoded.get("change", [])
    return parse_test_decoding_payload(trimmed)


def build_provenance(
    change: dict[str, Any],
    row: dict[str, Any],
    *,
    lsn: str,
    xid: str | None,
    commit_ts: str,
    source_system: str,
    db_name: str,
) -> dict[str, Any]:
    table_name = f"{change.get('schema', PG_SCHEMA)}.{change.get('table')}"
    op_type = change.get("kind", "unknown")
    actor = change.get("username") or DEFAULT_ACTOR
    checksum = canonical_checksum(
        {
            "table": table_name,
            "op_type": op_type,
            "row": row,
        }
    )
    txid = xid or str(change.get("xid") or "")
    txid_value = txid if txid else "0"
    run_id = f"txid:{txid_value}/lsn:{lsn}"
    return {
        "source_system": source_system,
        "db_name": db_name,
        "table": table_name,
        "lsn": lsn,
        "lsn_ord": lsn_to_int(lsn),
        "txid": txid_value,
        "txid_int": parse_txid(txid_value),
        "commit_ts": commit_ts,
        "op_type": op_type,
        "actor": actor,
        "checksum": checksum,
        "run_id": run_id,
    }


def upsert_person(tx: Any, row: dict[str, Any], provenance: dict[str, Any]) -> bool:
    record = tx.run(
        """
        MERGE (p:Person {id: $id})
        WITH p,
             coalesce(p.summit_last_txid, -1) AS last_txid,
             coalesce(p.summit_last_lsn_ord, -1) AS last_lsn_ord
        WITH p,
             (last_txid < $txid OR (last_txid = $txid AND last_lsn_ord < $lsn_ord)) AS apply_change
        FOREACH (_ IN CASE WHEN apply_change THEN [1] ELSE [] END |
          SET p.name = $name,
              p.email = $email,
              p.deleted = false,
              p.summit_source_system = $source_system,
              p.summit_db_name = $db_name,
              p.summit_table = $table,
              p.summit_last_lsn = $lsn,
              p.summit_last_lsn_ord = $lsn_ord,
              p.summit_last_txid = $txid,
              p.summit_last_commit_ts = $commit_ts,
              p.summit_last_op_type = $op_type,
              p.summit_last_actor = $actor,
              p.summit_last_checksum = $checksum,
              p.summit_last_run_id = $run_id,
              p.summit_ingested_at = timestamp()
        )
        RETURN apply_change AS applied
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
        WITH e,
             coalesce(e.summit_last_txid, -1) AS last_txid,
             coalesce(e.summit_last_lsn_ord, -1) AS last_lsn_ord
        WITH e,
             (last_txid < $txid OR (last_txid = $txid AND last_lsn_ord < $lsn_ord)) AS apply_change
        FOREACH (_ IN CASE WHEN apply_change THEN [1] ELSE [] END |
          SET e.since = CASE WHEN $since IS NULL THEN NULL ELSE date($since) END,
              e.deleted = false,
              e.summit_source_system = $source_system,
              e.summit_db_name = $db_name,
              e.summit_table = $table,
              e.summit_last_lsn = $lsn,
              e.summit_last_lsn_ord = $lsn_ord,
              e.summit_last_txid = $txid,
              e.summit_last_commit_ts = $commit_ts,
              e.summit_last_op_type = $op_type,
              e.summit_last_actor = $actor,
              e.summit_last_checksum = $checksum,
              e.summit_last_run_id = $run_id,
              e.summit_ingested_at = timestamp()
        )
        RETURN apply_change AS applied
        """,
        id=row["id"],
        from_id=row["from_id"],
        to_id=row["to_id"],
        since=row.get("since"),
        **provenance,
    ).single()
    return bool(record and record.get("applied"))


def soft_delete_person(tx: Any, row: dict[str, Any], provenance: dict[str, Any]) -> bool:
    record = tx.run(
        """
        MATCH (p:Person {id: $id})
        WITH p,
             coalesce(p.summit_last_txid, -1) AS last_txid,
             coalesce(p.summit_last_lsn_ord, -1) AS last_lsn_ord
        WITH p,
             (last_txid < $txid OR (last_txid = $txid AND last_lsn_ord < $lsn_ord)) AS apply_change
        FOREACH (_ IN CASE WHEN apply_change THEN [1] ELSE [] END |
          SET p.deleted = true,
              p.summit_source_system = $source_system,
              p.summit_db_name = $db_name,
              p.summit_table = $table,
              p.summit_last_lsn = $lsn,
              p.summit_last_lsn_ord = $lsn_ord,
              p.summit_last_txid = $txid,
              p.summit_last_commit_ts = $commit_ts,
              p.summit_last_op_type = $op_type,
              p.summit_last_actor = $actor,
              p.summit_last_checksum = $checksum,
              p.summit_last_run_id = $run_id,
              p.summit_ingested_at = timestamp()
        )
        RETURN apply_change AS applied
        """,
        id=row["id"],
        **provenance,
    ).single()
    return bool(record and record.get("applied"))


def soft_delete_knows(tx: Any, row: dict[str, Any], provenance: dict[str, Any]) -> bool:
    record = tx.run(
        """
        MATCH ()-[e:KNOWS {id: $id}]-()
        WITH e,
             coalesce(e.summit_last_txid, -1) AS last_txid,
             coalesce(e.summit_last_lsn_ord, -1) AS last_lsn_ord
        WITH e,
             (last_txid < $txid OR (last_txid = $txid AND last_lsn_ord < $lsn_ord)) AS apply_change
        FOREACH (_ IN CASE WHEN apply_change THEN [1] ELSE [] END |
          SET e.deleted = true,
              e.summit_source_system = $source_system,
              e.summit_db_name = $db_name,
              e.summit_table = $table,
              e.summit_last_lsn = $lsn,
              e.summit_last_lsn_ord = $lsn_ord,
              e.summit_last_txid = $txid,
              e.summit_last_commit_ts = $commit_ts,
              e.summit_last_op_type = $op_type,
              e.summit_last_actor = $actor,
              e.summit_last_checksum = $checksum,
              e.summit_last_run_id = $run_id,
              e.summit_ingested_at = timestamp()
        )
        RETURN apply_change AS applied
        """,
        id=row["id"],
        **provenance,
    ).single()
    return bool(record and record.get("applied"))


def process_change(
    neo: Any,
    change: dict[str, Any],
    provenance: dict[str, Any],
) -> tuple[bool, str | None]:
    table = change.get("table")
    schema = change.get("schema", "public")
    kind = change.get("kind")
    if schema != PG_SCHEMA:
        return False, None

    row = normalize_columns(change)

    if kind in {"insert", "update"}:
        if table == "person":
            applied = neo.execute_write(upsert_person, row, provenance)
            return applied, f"Person({row.get('id')})"
        if table == "knows":
            applied = neo.execute_write(upsert_knows, row, provenance)
            return applied, f"KNOWS({row.get('id')})"

    if kind == "delete":
        if table == "person":
            applied = neo.execute_write(soft_delete_person, row, provenance)
            return applied, f"Person({row.get('id')})"
        if table == "knows":
            applied = neo.execute_write(soft_delete_knows, row, provenance)
            return applied, f"KNOWS({row.get('id')})"

    return False, None


def poll_slot_changes(conn: Any) -> list[tuple[str, str | None, str]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT lsn::text, xid::text, data
            FROM pg_logical_slot_get_changes(%s, NULL, %s)
            """,
            (SLOT, BATCH_SIZE),
        )
        return cur.fetchall()


def main() -> None:
    source_system = source_system_from_dsn(PG_DSN)
    db_name = db_name_from_dsn(PG_DSN)

    emit_event(
        "START",
        {"schema": PG_SCHEMA, "slot": SLOT},
        inputs=[{"namespace": source_system, "name": db_name}],
    )

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
    with (
        connect_pg(autocommit=True) as conn,
        driver.session(database="neo4j") as neo,
    ):
        ensure_slot(conn)

        while True:
            raw_changes = poll_slot_changes(conn)
            if not raw_changes:
                time.sleep(POLL_INTERVAL_SEC)
                continue

            applied_count = 0
            lineage_emitted = 0
            last_lsn = None
            last_txid = None
            commit_ts_cache: dict[str, str] = {}

            for lsn, xid, payload in raw_changes:
                last_lsn = str(lsn)
                last_txid = xid
                if not payload:
                    continue

                xid_key = xid or ""
                commit_ts = commit_ts_cache.get(xid_key)
                if commit_ts is None:
                    commit_ts = resolve_commit_ts(conn, xid)
                    commit_ts_cache[xid_key] = commit_ts

                for change in parse_payload(payload):
                    row = normalize_columns(change)
                    provenance = build_provenance(
                        change,
                        row,
                        lsn=last_lsn,
                        xid=xid,
                        commit_ts=commit_ts,
                        source_system=source_system,
                        db_name=db_name,
                    )

                    applied, output_name = process_change(neo, change, provenance)
                    if not applied or not output_name:
                        continue

                    applied_count += 1
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
                        output_name=output_name,
                    ):
                        lineage_emitted += 1

            emit_event(
                "COMPLETE",
                {
                    "slot": SLOT,
                    "last_lsn": last_lsn,
                    "last_txid": last_txid,
                    "changes_polled": len(raw_changes),
                    "changes_applied": applied_count,
                    "lineage_emitted": lineage_emitted,
                },
                run_id=(f"txid:{last_txid}/lsn:{last_lsn}" if last_lsn else None),
            )


if __name__ == "__main__":
    main()
