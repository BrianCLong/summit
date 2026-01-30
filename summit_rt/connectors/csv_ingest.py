from __future__ import annotations
import csv
from typing import IO, Dict, Any
from summit_rt.events.envelope import EventEnvelope
from summit_rt.outbox.store import OutboxStore

def ingest_csv(fp: IO[str], *, source_uri: str, outbox: OutboxStore) -> int:
    rdr = csv.DictReader(fp)
    n = 0
    for row in rdr:
        ev = EventEnvelope.from_parts(
            source={"type": "csv", "uri": source_uri},
            payload={"raw": None, "parsed": row},
            entity_hint={"type": "Row", "key": row.get("id") or "no-id"},
        )
        outbox.append(ev)
        n += 1
    return n
