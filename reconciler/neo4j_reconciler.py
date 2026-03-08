import hashlib
import json
import random
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable

from neo4j import GraphDatabase


class Metrics:
    def __init__(self):
        self.total = 0
        self.noops = 0
        self.applied = 0
        self.window_drift_count = 0
        self.start = time.time()

    def mark_applied(self, changed: bool):
        self.total += 1
        if changed:
            self.applied += 1
        else:
            self.noops += 1

    def mark_drift(self):
        self.window_drift_count += 1

    @property
    def noop_rate(self) -> float:
        return 0.0 if self.total == 0 else self.noops / self.total

    @property
    def convergence_seconds(self) -> float:
        return time.time() - self.start

    def snapshot(self) -> dict[str, Any]:
        return {
            "reconcile.total": self.total,
            "reconcile.applied": self.applied,
            "reconcile.noops": self.noops,
            "reconcile.noop_rate": self.noop_rate,
            "reconcile.window_drift_count": self.window_drift_count,
            "reconcile.convergence_seconds": self.convergence_seconds,
        }


@dataclass
class Event:
    pk: str
    lsn: int
    props: dict[str, Any]


def _sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _pk_digest(pk_fields: dict[str, Any]) -> str:
    blob = json.dumps(pk_fields, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return _sha256_hex(blob)


def parse_jsonl(path: Path) -> Iterable[Event]:
    """
    Minimal Debezium-ish JSONL parser.

    Supported envelopes:
      - {"op":"c|u","lsn":123,"after":{...}}
      - {"payload":{"op":"c|u","source":{"lsn":123},"after":{...}}}
    Deletes/tombstones ("op":"d") are intentionally skipped in this PR-sized slice.
    """
    with path.open() as f:
        for line in f:
            if not line.strip():
                continue
            e = json.loads(line)
            payload = e.get("payload", e)
            op = payload.get("op")
            if op == "d":
                continue
            after = payload.get("after")
            if not after:
                continue

            lsn = payload.get("lsn")
            if lsn is None:
                lsn = (payload.get("source") or {}).get("lsn")
            if lsn is None:
                lsn = after.get("__lsn")
            if lsn is None:
                continue

            pk_fields = after.get("pk") or {"id": after.get("id")}
            pk = _pk_digest(pk_fields)
            props = {k: v for k, v in after.items() if k not in ("pk", "__last_applied_lsn")}
            yield Event(pk=pk, lsn=int(lsn), props=props)


@contextmanager
def neo4j_session(uri: str, user: str, pwd: str):
    driver = GraphDatabase.driver(uri, auth=(user, pwd), max_connection_lifetime=300)
    try:
        with driver.session() as session:
            yield session
    finally:
        driver.close()


def apply_event(session, cypher: str, ev: Event) -> bool:
    res = session.run(cypher, pk=ev.pk, props=ev.props, lsn=ev.lsn).single()
    last_lsn = int(res["last_lsn"])
    # If last_lsn == ev.lsn, we consider it "changed" (create or applied update).
    # If last_lsn > ev.lsn, this event was older/out-of-order and became a noop.
    return last_lsn == ev.lsn


def replay_jsonl(
    uri: str,
    user: str,
    pwd: str,
    jsonl_path: str,
    cypher_path: str,
) -> dict[str, Any]:
    metrics = Metrics()
    cypher = Path(cypher_path).read_text()
    events = list(parse_jsonl(Path(jsonl_path)))

    # Canary: shuffle to simulate out-of-order delivery
    random.Random(1337).shuffle(events)

    last_seen = -1
    with neo4j_session(uri, user, pwd) as s:
        for ev in events:
            if ev.lsn < last_seen:
                metrics.mark_drift()
            changed = apply_event(s, cypher, ev)
            metrics.mark_applied(changed)
            last_seen = max(last_seen, ev.lsn)

    return metrics.snapshot()


def graph_hash(session) -> str:
    """
    Deterministic hash of Entity nodes only.
    Avoids APOC so CI stays plug-in free.
    """
    q = "MATCH (n:Entity) RETURN n.pk_digest AS pk, properties(n) AS props"
    rows = []
    for r in session.run(q):
        pk = r["pk"]
        props = dict(r["props"])
        canonical_props = json.dumps(props, sort_keys=True, separators=(",", ":"))
        rows.append(f"{pk}:{canonical_props}")
    blob = "\n".join(sorted(rows)).encode("utf-8")
    return _sha256_hex(blob)


def compute_final_hash(uri: str, user: str, pwd: str) -> str:
    with neo4j_session(uri, user, pwd) as s:
        return graph_hash(s)
