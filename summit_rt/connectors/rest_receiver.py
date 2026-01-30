from __future__ import annotations
from typing import Any, Dict, List
from summit_rt.events.envelope import EventEnvelope
from summit_rt.outbox.store import OutboxStore

def ingest_rest_payload(payload: Dict[str, Any], *, source_uri: str, outbox: OutboxStore) -> List[str]:
    # payload can be single object or {"items":[...]}
    items = payload.get("items", [payload])
    ids = []
    for it in items:
        ev = EventEnvelope.from_parts(
            source={"type": "rest", "uri": source_uri},
            payload={"raw": None, "parsed": it},
            entity_hint={"type": it.get("type", "Object"), "key": str(it.get("id", "no-id"))},
        )
        outbox.append(ev)
        ids.append(ev.event_id)
    return ids
